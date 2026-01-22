import { getServerUser } from './supabase/server-auth'
import { headers } from 'next/headers'
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
