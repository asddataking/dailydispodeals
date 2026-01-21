import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getDispensariesNearZip } from '@/lib/dispensary-discovery'
import { rateLimit } from '@/lib/rate-limit'

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
    return rateLimitResult.response
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
      return NextResponse.json(
        { error: 'User not found' },
        { status: 400 }
      )
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
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      )
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
      return NextResponse.json(
        { error: 'Failed to save preferences' },
        { status: 500 }
      )
    }

    // If zip and radius provided, discover dispensaries in that area
    // This runs asynchronously to not block the response
    if (validated.zip && validated.radius) {
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

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Preferences API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
