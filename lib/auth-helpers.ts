import { supabaseAdmin } from './supabase/server'

/**
 * Get or create a Supabase Auth user silently (no email sent)
 * Returns the auth user ID
 */
export async function getOrCreateAuthUser(email: string): Promise<string> {
  try {
    // Check if auth user already exists
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (!listError && existingUsers) {
      const existingUser = existingUsers.users.find(u => u.email === email)
      if (existingUser) {
        return existingUser.id
      }
    }

    // Create new auth user silently (no email confirmation)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true, // Auto-confirm email so no confirmation email is sent
      user_metadata: {
        created_via: 'stripe_checkout',
      },
    })

    if (createError || !newUser) {
      throw new Error(createError?.message || 'Failed to create auth user')
    }

    return newUser.user.id
  } catch (error) {
    console.error('Error in getOrCreateAuthUser:', error)
    throw error
  }
}
