'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

/**
 * Custom hook to get admin auth token
 * Returns the access token for making authenticated API requests
 */
export function useAdminAuth() {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getToken = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setToken(session?.access_token || null)
      } catch (error) {
        console.error('Error getting auth token:', error)
        setToken(null)
      } finally {
        setLoading(false)
      }
    }

    getToken()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setToken(session?.access_token || null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return { token, loading }
}

/**
 * Get auth headers for API requests
 * Returns headers object with Authorization if token is available
 */
export function getAuthHeaders(token: string | null): Record<string, string> {
  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {}
}
