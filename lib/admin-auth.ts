import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from './supabase/server'

/**
 * Check if an email is in the admin list
 */
export function isAdmin(email: string): boolean {
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || []
  return adminEmails.includes(email)
}

/**
 * Get admin session from request - checks Supabase auth and admin role
 * Use this in API routes to verify admin access
 * Gets session from Supabase auth cookies or Authorization header
 */
async function getServerUser(): Promise<{ email?: string } | null> {
  try {
    const headersList = await headers()
    const cookieHeader = headersList.get('cookie')
    
    if (!cookieHeader) {
      return null
    }

    // Try to extract access token from cookies
    // Supabase stores tokens in various cookie formats
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=')
      if (key && value) {
        acc[key] = decodeURIComponent(value)
      }
      return acc
    }, {} as Record<string, string>)

    // Look for Supabase auth token in cookies
    // Format can vary: sb-<project-ref>-auth-token or similar
    let accessToken: string | undefined
    
    for (const [key, value] of Object.entries(cookies)) {
      if (key.includes('auth-token') || key.includes('access-token')) {
        // Try to parse as JSON (Supabase stores tokens as JSON)
        try {
          const parsed = JSON.parse(value)
          accessToken = parsed?.access_token || parsed?.token || value
        } catch {
          accessToken = value
        }
        break
      }
    }
    
    if (!accessToken) {
      return null
    }

    // Create a client to verify the token
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return null
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    
    if (error || !user) {
      return null
    }

    return { email: user.email || undefined }
  } catch (error) {
    return null
  }
}

export async function getAdminSession(): Promise<{ authenticated: boolean; email?: string }> {
  try {
    // First try: Get user from cookies (client-side requests)
    const user = await getServerUser()
    
    if (user && user.email && isAdmin(user.email)) {
      return { authenticated: true, email: user.email }
    }

    // Fallback: Check Authorization header (for API calls with explicit token)
    const headersList = await headers()
    const authHeader = headersList.get('authorization')
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data: { user: authUser }, error } = await supabaseAdmin.auth.getUser(token)

      if (!error && authUser && authUser.email && isAdmin(authUser.email)) {
        return { authenticated: true, email: authUser.email }
      }
    }

    return { authenticated: false }
  } catch (error) {
    console.error('Admin session check error:', error)
    return { authenticated: false }
  }
}

/**
 * Verify admin access from email
 */
export async function verifyAdminAccess(email: string | null | undefined): Promise<boolean> {
  if (!email) {
    return false
  }
  return isAdmin(email)
}

/**
 * Get admin user from client-side Supabase session
 * Use this when you have a client-side Supabase instance
 */
export async function getAdminUserFromClient(client: any): Promise<{ authenticated: boolean; email?: string }> {
  try {
    const { data: { user }, error } = await client.auth.getUser()
    
    if (error || !user || !user.email) {
      return { authenticated: false }
    }

    if (!isAdmin(user.email)) {
      return { authenticated: false }
    }

    return { authenticated: true, email: user.email }
  } catch (error) {
    return { authenticated: false }
  }
}
