import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/server'
import * as Sentry from "@sentry/nextjs"
import {
  success,
  validationError,
  serverError,
} from '@/lib/api-response'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const schema = z.object({
  email: z.string().email(),
  zip: z.string().regex(/^\d{5}$/, 'ZIP must be 5 digits'),
})

/**
 * POST /api/subscribe
 * User subscribes with email + ZIP code
 * Creates/uses zone, links user to zone, queues zone for processing
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = schema.parse(body)

    // Normalize ZIP (ensure 5 digits, zero-padded if needed)
    const normalizedZip = validated.zip.padStart(5, '0')

    // Step 1: Upsert zone by ZIP (idempotent)
    let zoneId: string

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
          // Unique constraint violation - zone was created by another request
          const { data: retryZone } = await supabaseAdmin
            .from('zones')
            .select('id')
            .eq('zip', normalizedZip)
            .single()
          if (retryZone) {
            zoneId = retryZone.id
          } else {
            throw new Error('Failed to create or find zone')
          }
        } else {
          throw zoneError
        }
      } else if (newZone) {
        zoneId = newZone.id
      } else {
        throw new Error('Failed to create zone')
      }
    }

    // Step 2: Upsert user subscription (idempotent)
    const { data: existingSub, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('id')
      .eq('email', validated.email)
      .eq('zone_id', zoneId)
      .single()

    const alreadySubscribed = !!existingSub

    if (!existingSub) {
      const { error: insertSubError } = await supabaseAdmin
        .from('user_subscriptions')
        .insert({
          email: validated.email,
          zone_id: zoneId,
        })

      if (insertSubError) {
        // Handle race condition
        if (insertSubError.code !== '23505') {
          throw insertSubError
        }
        // Already exists, that's fine
      }
    }

    // Step 3: Create WELCOME notification (idempotent)
    await supabaseAdmin
      .from('notifications_outbox')
      .insert({
        email: validated.email,
        zone_id: zoneId,
        type: 'WELCOME',
        status: 'PENDING',
      })
      .select()
      .single()
      .then(({ error }) => {
        // Ignore unique constraint errors (already queued)
        if (error && error.code !== '23505') {
          const { logger } = Sentry;
          logger.error("Failed to create WELCOME notification", {
            error: error.message,
            email: validated.email,
            zone_id: zoneId,
          });

          Sentry.captureException(error, {
            tags: {
              operation: "subscribe",
              step: "create_notification",
            },
            extra: {
              email: validated.email,
              zone_id: zoneId,
            },
          });
        }
      })

    // Step 4: Ensure zone is queued for processing
    // Update next_process_at to now() if it's null or in the future
    await supabaseAdmin
      .from('zones')
      .update({
        next_process_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', zoneId)
      .lt('next_process_at', new Date().toISOString())
      .or('next_process_at.is.null')

    return success({
      ok: true,
      zoneZip: normalizedZip,
      alreadySubscribed,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError('Invalid input', error.errors)
    }
    
    const { logger } = Sentry;
    logger.error("Subscribe API error", {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
      tags: {
        operation: "subscribe",
      },
    });

    return serverError('Internal server error')
  }
}
