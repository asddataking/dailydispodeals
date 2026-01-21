import { createClient } from '@supabase/supabase-js'

// Client-side Supabase client for edge function calls
// Uses anon key for public access (edge functions handle auth internally)

let supabaseClientInstance: ReturnType<typeof createClient> | null = null

function getSupabaseClient() {
  if (supabaseClientInstance) {
    return supabaseClientInstance
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  supabaseClientInstance = createClient(supabaseUrl, supabaseAnonKey)
  return supabaseClientInstance
}

// Export a proxy that lazy-loads the client on first access
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    const client = getSupabaseClient()
    const value = client[prop as keyof typeof client]
    return typeof value === 'function' ? value.bind(client) : value
  }
})

/**
 * Call a Supabase Edge Function
 */
export async function callEdgeFunction<T = any>(
  functionName: string,
  body?: any
): Promise<T> {
  const client = getSupabaseClient()
  const { data, error } = await client.functions.invoke(functionName, {
    body,
  })

  if (error) {
    throw error
  }

  return data as T
}
