import { supabaseAdmin } from './server'
import { headers } from 'next/headers'

/**
 * Get authenticated user from server-side request
 * Reads token from Authorization header
 * Returns user if authenticated, null otherwise
 */
export async function getServerUser() {
  try {
    const headersList = await headers()
    const authHeader = headersList.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7)
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

    if (error || !user) {
      return null
    }

    return user
  } catch (error) {
    console.error('Error getting server user:', error)
    return null
  }
}
