import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getDispensariesNearZip } from '@/lib/dispensary-discovery'
import { rateLimit } from '@/lib/rate-limit'
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
  brands: z.array(z.string()).optional(), // Optional brand preferences
  zip: z.string().optional(),
  radius: z.union([z.literal(5), z.literal(10), z.literal(25)]).optional(),
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
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', validated.email)
      .single()

    if (userError || !user) {
      return validationError('User not found')
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
      return validationError('No active subscription found')
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
      console.error('Preferences upsert error:', prefError)
      return serverError('Failed to save preferences', prefError)
    }

    // If zip and radius provided, ensure zone exists and user is subscribed to it
    // This ensures send-daily cron can find the user's zones
    if (validated.zip && validated.radius) {
      const normalizedZip = validated.zip.padStart(5, '0')
      
      // Upsert zone by ZIP (idempotent)
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
            console.error('Failed to create or find zone:', zoneError)
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
              console.error('Failed to link user to zone:', error)
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
          console.log(`Found ${dispensaries.length} dispensaries near zip ${validated.zip}`)
          // Dispensaries are already in database, just ensuring they're tracked
        })
        .catch(error => {
          console.error('Error discovering dispensaries:', error)
          // Don't fail the request if discovery fails
        })
    }

    return success({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError('Invalid input', error.errors)
    }
    console.error('Preferences API error:', error)
    return serverError('Internal server error')
  }
}
