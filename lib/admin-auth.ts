import { cookies } from 'next/headers'

const ADMIN_SESSION_COOKIE = 'admin_session'
const SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Verify admin API key against ADMIN_SECRET
 */
export function verifyAdminToken(token: string): boolean {
  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret) {
    console.error('ADMIN_SECRET is not configured')
    return false
  }
  return token === adminSecret
}

/**
 * Create admin session cookie
 */
export async function createAdminSession(): Promise<void> {
  const cookieStore = await cookies()
  const expires = new Date(Date.now() + SESSION_DURATION)
  
  cookieStore.set(ADMIN_SESSION_COOKIE, 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires,
    path: '/',
  })
}

/**
 * Get and verify admin session
 */
export async function getAdminSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)
  
  if (!session || session.value !== 'authenticated') {
    return false
  }
  
  return true
}

/**
 * Clear admin session (logout)
 */
export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_SESSION_COOKIE)
}
