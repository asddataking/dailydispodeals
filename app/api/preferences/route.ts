import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getOrCreateAuthUser } from '@/lib/auth-helpers'
import { getDispensariesNearZip } from '@/lib/dispensary-discovery'
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

const schema = z.object({
  email: z.string().email(),
  categories: z.array(z.string()).min(1),
  brands: z.array(z.string()).optional(),
  zip: z.string().min(1, 'Zip code is required'),
  radius: z.union([z.literal(5), z.literal(10), z.literal(25)]),
})

export async function POST(request: NextRequest) {
  // Rate limiting - moderate for preferences endpoint
  const rateLimitResult = await rateLimit(request, 'moderate')
  if (!rateLimitResult.success) {
    return rateLimitError('Too many requests. Please try again later.')
  }

  try {
    const body = await request.json()
    const validated = schema.parse(body)

    // Find user by email
    let { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', validated.email)
      .single()

    // If user not found, try to create from Supabase Auth (handles webhook delay/edge cases)
    if ((userError || !user)) {
      try {
        const authUserId = await getOrCreateAuthUser(validated.email)
        await supabaseAdmin.from('users').upsert(
          { id: authUserId, email: validated.email },
          { onConflict: 'id' }
        )
        const res = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('email', validated.email)
          .single()
        user = res.data
        userError = res.error
      } catch {
        // ignore
      }
    }

    if (userError || !user) {
      return validationError('Your account is still being set up. Please wait a few seconds and try again.')
    }

    // Check user has active subscription
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gt('current_period_end', new Date().toISOString())
      .single()

    if (!subscription) {
      return validationError('No active subscription found. If you just completed checkout, please wait a few seconds and try again.')
    }

    // Upsert preferences
    const { error: prefError } = await supabaseAdmin
      .from('preferences')
      .upsert({
        user_id: user.id,
        categories: validated.categories,
        brands: validated.brands || [],
        zip: validated.zip || null,
        radius: validated.radius || null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })

    if (prefError) {
      const { logger } = Sentry;
      logger.error("Preferences upsert error", {
        error: prefError.message,
        user_id: user.id,
      });

      Sentry.captureException(prefError, {
        tags: {
          operation: "save_preferences",
        },
        extra: {
          user_id: user.id,
          email: validated.email,
        },
      });

      return serverError('Failed to save preferences', prefError)
    }

    // If zip and radius provided, ensure zone exists and user is subscribed to it
    // This ensures send-daily cron can find the user's zones
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

      // Also discover dispensaries in that area (runs asynchronously)
      getDispensariesNearZip(validated.zip, validated.radius)
        .then(dispensaries => {
          const { logger } = Sentry;
          logger.info("Found dispensaries near zip", {
            zip: validated.zip,
            count: dispensaries.length,
          });
          // Dispensaries are already in database, just ensuring they're tracked
        })
        .catch(error => {
          const { logger } = Sentry;
          logger.error("Error discovering dispensaries", {
            error: error instanceof Error ? error.message : 'Unknown error',
            zip: validated.zip,
          });

          Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
            tags: {
              operation: "discover_dispensaries",
            },
            extra: {
              zip: validated.zip,
              radius: validated.radius,
            },
          });
          // Don't fail the request if discovery fails
        })
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
