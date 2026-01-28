import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getOrCreateAuthUser } from '@/lib/auth-helpers'
import { rateLimit } from '@/lib/rate-limit'
import * as Sentry from "@sentry/nextjs"
import {
  success,
  validationError,
  serverError,
  rateLimitError,
} from '@/lib/api-response'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const baseSchema = z.object({ email: z.string().email() })
const paidSchema = baseSchema.extend({
  categories: z.array(z.string()).min(1),
  brands: z.array(z.string()).optional(),
  zip: z.string().min(1, 'Zip code is required'),
  radius: z.union([z.literal(5), z.literal(10), z.literal(25)]),
  preferHighThc: z.boolean().optional(),
  preferValueDeals: z.boolean().optional(),
})
const freeSchema = baseSchema.extend({
  zip: z.string().min(1, 'Zip code is required'),
  radius: z.union([z.literal(5), z.literal(10), z.literal(25)]).optional(),
})

/** GET /api/preferences — requires Authorization: Bearer <access_token>. Returns { plan, zip, radius, categories, brands }. */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user?.id) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('current_period_end', { ascending: false })
      .limit(1)
      .maybeSingle()

    const hasAccess =
      (subscription?.plan && ['monthly', 'yearly'].includes(subscription.plan)) || subscription?.plan === 'free'
    if (!hasAccess) {
      return Response.json({ success: false, error: 'No active subscription' }, { status: 403 })
    }

    const { data: prefs } = await supabaseAdmin
      .from('preferences')
      .select('zip, radius, categories, brands, prefer_high_thc, prefer_value_deals')
      .eq('user_id', user.id)
      .maybeSingle()

    return Response.json({
      success: true,
      data: {
        plan: subscription?.plan ?? null,
        zip: prefs?.zip ?? '',
        radius: (prefs?.radius as 5 | 10 | 25) ?? 10,
        categories: prefs?.categories ?? [],
        brands: (prefs?.brands as string[]) ?? [],
        preferHighThc: !!prefs?.prefer_high_thc,
        preferValueDeals: !!prefs?.prefer_value_deals,
      },
    })
  } catch (e) {
    const { logger } = Sentry
    logger.error('GET /api/preferences error', { error: e instanceof Error ? e.message : String(e) })
    Sentry.captureException(e instanceof Error ? e : new Error(String(e)), { tags: { operation: 'get_preferences' } })
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, 'moderate')
  if (!rateLimitResult.success) {
    return rateLimitError('Too many requests. Please try again later.')
  }

  try {
    const body = await request.json()
    const base = baseSchema.safeParse(body)
    if (!base.success) {
      return validationError('Invalid input', base.error.errors)
    }
    const email = base.data.email

    let { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (userError || !user) {
      try {
        const authUserId = await getOrCreateAuthUser(email)
        await supabaseAdmin.from('users').upsert({ id: authUserId, email }, { onConflict: 'id' })
        const res = await supabaseAdmin.from('users').select('id').eq('email', email).single()
        user = res.data
        userError = res.error
      } catch {
        // ignore
      }
    }

    if (userError || !user) {
      return validationError('Your account is still being set up. Please wait a few seconds and try again.')
    }

    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('id, plan, current_period_end')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('current_period_end', { ascending: false })
      .limit(1)
      .maybeSingle()

    const hasPaidAccess =
      subscription?.plan &&
      ['monthly', 'yearly'].includes(subscription.plan) &&
      subscription.current_period_end &&
      new Date(subscription.current_period_end) > new Date()
    const hasFreeAccess = subscription?.plan === 'free' && subscription?.id

    if (!hasPaidAccess && !hasFreeAccess) {
      return validationError('No active subscription found. If you just completed checkout, please wait a few seconds and try again.')
    }

    if (hasFreeAccess) {
      const parsed = freeSchema.safeParse(body)
      if (!parsed.success) {
        return validationError('Invalid input', parsed.error.errors)
      }
      const zip = parsed.data.zip.trim().slice(0, 5)
      const radius = parsed.data.radius ?? 25

      const { error: prefError } = await supabaseAdmin
        .from('preferences')
        .upsert(
          {
            user_id: user.id,
            categories: [],
            brands: [],
            zip,
            radius,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )

      if (prefError) {
        const { logger } = Sentry
        logger.error('Preferences upsert error (free)', { error: prefError.message, user_id: user.id })
        Sentry.captureException(prefError, { tags: { operation: 'save_preferences' }, extra: { user_id: user.id, email } })
        return serverError('Failed to save preferences', prefError)
      }
      return success({ ok: true })
    }

    const validated = paidSchema.parse(body)

    const { error: prefError } = await supabaseAdmin
      .from('preferences')
      .upsert({
        user_id: user.id,
        categories: validated.categories,
        brands: validated.brands || [],
        zip: validated.zip || null,
        radius: validated.radius || null,
        prefer_high_thc: validated.preferHighThc ?? false,
        prefer_value_deals: validated.preferValueDeals ?? false,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })

    if (prefError) {
      const { logger } = Sentry
      logger.error('Preferences upsert error', { error: prefError.message, user_id: user.id })
      Sentry.captureException(prefError, { tags: { operation: 'save_preferences' }, extra: { user_id: user.id, email: validated.email } })
      return serverError('Failed to save preferences', prefError)
    }

    if (validated.zip && validated.radius) {
      const normalizedZip = validated.zip.padStart(5, '0')
      
      // Upsert zone by ZIP (idempotent)
      let zoneId: string | undefined
      const { data: existingZone } = await supabaseAdmin
        .from('zones')
        .select('id')
        .eq('zip', normalizedZip)
        .single()

      if (existingZone) {
        zoneId = existingZone.id
      } else {
        // Insert new zone
        const { data: newZone, error: zoneError } = await supabaseAdmin
          .from('zones')
          .insert({
            zip: normalizedZip,
            status: 'ACTIVE',
            next_process_at: new Date().toISOString(), // Queue for processing
            ttl_minutes: 360, // 6 hours default
          })
          .select('id')
          .single()

        if (zoneError) {
          // Handle race condition: another request may have created the zone
          if (zoneError.code === '23505') {
            const { data: retryZone } = await supabaseAdmin
              .from('zones')
              .select('id')
              .eq('zip', normalizedZip)
              .single()
            if (retryZone) {
              zoneId = retryZone.id
            }
          }
          // If still no zoneId, log but don't fail the request
          if (!zoneId) {
            const { logger } = Sentry;
            logger.error("Failed to create or find zone", {
              error: zoneError.message,
              zip: normalizedZip,
            });

            Sentry.captureException(zoneError, {
              tags: {
                operation: "create_zone",
              },
              extra: {
                zip: normalizedZip,
              },
            });
          }
        } else if (newZone) {
          zoneId = newZone.id
        }
      }

      // Link user to zone if zone was created/found
      if (zoneId) {
        await supabaseAdmin
          .from('user_subscriptions')
          .upsert({
            email: validated.email,
            zone_id: zoneId,
          }, {
            onConflict: 'email,zone_id',
          })
          .then(({ error }) => {
            if (error && error.code !== '23505') {
              const { logger } = Sentry;
              logger.error("Failed to link user to zone", {
                error: error.message,
                email: validated.email,
                zone_id: zoneId,
              });

              Sentry.captureException(error, {
                tags: {
                  operation: "link_user_zone",
                },
                extra: {
                  email: validated.email,
                  zone_id: zoneId,
                },
              });
            }
          })

        // Queue welcome email (idempotent; send-daily processes WELCOME)
        await supabaseAdmin
          .from('notifications_outbox')
          .insert({
            email: validated.email,
            zone_id: zoneId,
            type: 'WELCOME',
            status: 'PENDING',
          })
          .then(({ error }) => {
            if (error && error.code !== '23505') {
              const { logger } = Sentry;
              logger.error("Failed to queue WELCOME notification", {
                error: error.message,
                email: validated.email,
                zone_id: zoneId,
              });
              Sentry.captureException(error, {
                tags: { operation: "queue_welcome" },
                extra: { email: validated.email, zone_id: zoneId },
              });
            }
          })

        // Ensure zone is queued for processing
        await supabaseAdmin
          .from('zones')
          .update({
            next_process_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', zoneId)
          .lt('next_process_at', new Date().toISOString())
          .or('next_process_at.is.null')
      }
    }

    return success({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError('Invalid input', error.errors)
    }
    
    const { logger } = Sentry;
    logger.error("Preferences API error", {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
      tags: {
        operation: "preferences_api",
      },
    });

    return serverError('Internal server error')
  }
}
