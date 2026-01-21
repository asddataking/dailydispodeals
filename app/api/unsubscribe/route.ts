import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Unsubscribe endpoint
 * GET /api/unsubscribe?email=user@example.com&token=<token>
 * 
 * Token is a simple hash of email + secret for basic security
 */
export async function GET(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, 'moderate')
  if (!rateLimitResult.success) {
    return rateLimitResult.response
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const email = searchParams.get('email')
    const token = searchParams.get('token')

    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      )
    }

    // Verify token (simple hash-based verification)
    const crypto = await import('crypto')
    const expectedToken = crypto
      .createHash('sha256')
      .update(`${email}:${process.env.UNSUBSCRIBE_SECRET || 'change-me-in-production'}`)
      .digest('hex')
      .substring(0, 16)

    if (!token || token !== expectedToken) {
      return NextResponse.json(
        { error: 'Invalid unsubscribe token' },
        { status: 400 }
      )
    }

    // Find user by email
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Disable email for this user
    const { error: updateError } = await supabaseAdmin
      .from('preferences')
      .update({ email_enabled: false })
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Failed to unsubscribe user:', updateError)
      return NextResponse.json(
        { error: 'Failed to unsubscribe' },
        { status: 500 }
      )
    }

    // Mark any pending notifications as failed
    await supabaseAdmin
      .from('notifications_outbox')
      .update({
        status: 'FAILED',
        error_message: 'User unsubscribed',
      })
      .eq('email', email)
      .eq('status', 'PENDING')

    return NextResponse.json({ 
      success: true,
      message: 'You have been unsubscribed from daily deal emails.'
    })
  } catch (error) {
    console.error('Unsubscribe error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
