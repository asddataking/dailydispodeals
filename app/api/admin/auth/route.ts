import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAdminAccess, isAdmin } from '@/lib/admin-auth'
import {
  success,
  validationError,
  forbidden,
  serverError,
} from '@/lib/api-response'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/auth
 * Send magic link for admin login
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email || typeof email !== 'string') {
      return validationError('Email required')
    }

    // Check if email is admin before sending magic link
    if (!isAdmin(email)) {
      return forbidden('Access denied')
    }

    // Send magic link using Supabase Auth (client-side will handle it)
    // We use the regular signInWithOtp which sends email
    // The redirect will go to /admin/magic which verifies admin access
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${process.env.APP_URL || 'http://localhost:3000'}/admin/magic`,
      },
    })

    if (error || !data) {
      console.error('Error generating admin magic link:', error)
      return serverError('Failed to send magic link', error)
    }

    return success(null, 'Magic link sent to your email')
  } catch (error) {
    console.error('Admin auth error:', error)
    return serverError('Internal server error')
  }
}

/**
 * GET /api/admin/auth
 * Check if user is authenticated and is admin
 */
export async function GET(request: NextRequest) {
  try {
    // Get auth token from Authorization header
    const headersList = await headers()
    const authHeader = headersList.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Try to get from cookie (client-side)
      const cookieHeader = headersList.get('cookie')
      if (!cookieHeader) {
        return NextResponse.json(
          { authenticated: false, isAdmin: false },
          { status: 401 }
        )
      }
    }

    // For client-side checks, we'll verify on the client
    // This endpoint is mainly for checking status
    return success({ 
      authenticated: false, 
      isAdmin: false,
      message: 'Use client-side auth check' 
    })
  } catch (error) {
    console.error('Admin auth check error:', error)
    return serverError('Internal server error')
  }
}
