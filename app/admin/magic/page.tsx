'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function AdminMagicPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const verifyAndRedirect = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user || !user.email) {
          setError('Could not verify your magic link. Please request a new one.')
          setLoading(false)
          return
        }

        // Check if user is admin
        const checkResponse = await fetch('/api/admin/check-access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email }),
        })

        const checkData = await checkResponse.json()

        if (!checkData.isAdmin) {
          setError('Access denied. This email is not authorized for admin access.')
          setLoading(false)
          return
        }

        // User is admin, redirect to admin dashboard
        router.push('/admin')
      } catch (err) {
        setError('Failed to verify access')
        setLoading(false)
      }
    }

    verifyAndRedirect()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-gray-600">Verifying your admin access...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <a
            href="/admin"
            className="text-lake-blue-600 hover:text-lake-blue-800 underline"
          >
            Return to admin login
          </a>
        </div>
      </div>
    )
  }

  return null
}
