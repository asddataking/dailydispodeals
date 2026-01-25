import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getOrCreateAuthUser } from '@/lib/auth-helpers'
import { rateLimit } from '@/lib/rate-limit'
import * as Sentry from '@sentry/nextjs'
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
  zip: z.string().min(1).refine((s) => /^\d{5}(-\d{4})?$/.test(s.trim()), 'Invalid US zip code'),
})

export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, 'moderate')
  if (!rateLimitResult.success) {
    return rateLimitError('Too many requests. Please try again later.')
  }

  try {
    const body = await request.json()
    const validated = schema.parse(body)
    const zip = validated.zip.trim().slice(0, 5)
    const email = validated.email.trim().toLowerCase()

    const authUserId = await getOrCreateAuthUser(email, 'free_signup')

    await supabaseAdmin.from('users').upsert(
      { id: authUserId, email },
      { onConflict: 'id' }
    )

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', authUserId)
      .single()

    if (!user) {
      return serverError('Failed to create or find user')
    }

    // Reject if user already has an active paid subscription
    const { data: paidSub } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .in('plan', ['monthly', 'yearly'])
      .eq('status', 'active')
      .gt('current_period_end', new Date().toISOString())
      .maybeSingle()

    if (paidSub) {
      return validationError(
        'You already have an active subscription. Manage your plan from your account or email.'
      )
    }

    // If already on active free, only update preferences
    const { data: existingFree } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('plan', 'free')
      .eq('status', 'active')
      .maybeSingle()

    if (existingFree) {
      const { error: prefErr } = await supabaseAdmin
        .from('preferences')
        .upsert(
          {
            user_id: user.id,
            categories: [],
            brands: [],
            zip,
            radius: 25,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
      if (prefErr) {
        const { logger } = Sentry
        logger.error('Preferences upsert (free, existing) failed', { error: prefErr.message, user_id: user.id })
        Sentry.captureException(prefErr, { tags: { operation: 'subscribe_free' }, extra: { user_id: user.id } })
        return serverError('Failed to update preferences')
      }
      return success({ ok: true, message: 'Preferences updated.' })
    }

    // Create new free subscription (no Stripe)
    const { error: subErr } = await supabaseAdmin.from('subscriptions').insert({
      user_id: user.id,
      plan: 'free',
      status: 'active',
      stripe_customer_id: null,
      stripe_subscription_id: null,
      current_period_end: null,
    })

    if (subErr) {
      const { logger } = Sentry
      logger.error('Free subscription insert failed', { error: subErr.message, user_id: user.id })
      Sentry.captureException(subErr, { tags: { operation: 'subscribe_free' }, extra: { user_id: user.id } })
      return serverError('Failed to create free subscription')
    }

    const { error: prefError } = await supabaseAdmin
      .from('preferences')
      .upsert(
        {
          user_id: user.id,
          categories: [],
          brands: [],
          zip,
          radius: 25,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    if (prefError) {
      const { logger } = Sentry
      logger.error('Preferences upsert (free, new) failed', { error: prefError.message, user_id: user.id })
      Sentry.captureException(prefError, { tags: { operation: 'subscribe_free' }, extra: { user_id: user.id } })
      return serverError('Failed to save preferences')
    }

    return success({ ok: true, message: 'You’re signed up for weekly deal summaries.' })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return validationError('Invalid input', e.errors)
    }
    const { logger } = Sentry
    logger.error('Subscribe-free error', { error: e instanceof Error ? e.message : String(e) })
    Sentry.captureException(e instanceof Error ? e : new Error(String(e)), { tags: { operation: 'subscribe_free' } })
    return serverError('Something went wrong. Please try again.')
  }
}
