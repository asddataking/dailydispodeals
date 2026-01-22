import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/auth/create-session
 * Generate a magic link for a user by email (no email sent)
 * Used after Stripe checkout to authenticate the user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email required' },
        { status: 400 }
      )
    }

    // Generate a magic link (no email sent, just get the token)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${process.env.APP_URL}/success`,
      },
    })

    if (linkError || !linkData) {
      console.error('Error generating link:', linkError)
      return NextResponse.json(
        { error: 'Failed to create session link' },
        { status: 500 }
      )
    }

    // Extract the token from the action link
    const actionLink = linkData.properties.action_link
    const url = new URL(actionLink)
    const token = url.searchParams.get('token') || url.hash.split('=')[1]

    return NextResponse.json({
      token,
      email,
    })
  } catch (error) {
    console.error('Create session error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
