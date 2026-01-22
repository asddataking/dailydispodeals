'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { PreferencesModal } from '@/app/components/PreferencesModal'
import { supabase } from '@/lib/supabase/client'
import { SkeletonLoader } from '@/app/components/SkeletonLoader'

function SuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [email, setEmail] = useState<string>('')
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // First, check if user is already authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (!authError && user && user.email) {
          // User is authenticated, use their email
          setEmail(user.email)
          setTimeout(() => {
            setShowModal(true)
            setLoading(false)
          }, 500)
          return
        }

        // Not authenticated - get email from Stripe session and sign in
        if (!sessionId) {
          setError('Missing session ID')
          setLoading(false)
          return
        }

        // Get email from Stripe session
        const { apiFetch, getErrorMessage, isErrorResponse, unwrapApiResponse } = await import('@/lib/api-client')
        const sessionResponse = await apiFetch<{ email: string }>(`/api/stripe/get-session?session_id=${sessionId}`)
        
        if (isErrorResponse(sessionResponse)) {
          setError('Could not verify your session. Please contact support.')
          setLoading(false)
          return
        }
        
        const sessionData = unwrapApiResponse(sessionResponse)
        if (!sessionData.email) {
          setError('Could not verify your session. Please contact support.')
          setLoading(false)
          return
        }

        // Create Supabase Auth session for this user
        try {
          const authResponse = await fetch('/api/auth/create-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: sessionData.email }),
          })

          if (authResponse.ok) {
            const { token } = await authResponse.json()
            
            if (token) {
              // Sign in using the token
              const { error: signInError } = await supabase.auth.verifyOtp({
                token_hash: token,
                type: 'magiclink',
              })

              if (!signInError) {
                // Now authenticated, get user email
                const { data: { user: authUser } } = await supabase.auth.getUser()
                if (authUser?.email) {
                  setEmail(authUser.email)
                  setTimeout(() => {
                    setShowModal(true)
                    setLoading(false)
                  }, 500)
                  return
                }
              }
            }
          }
        } catch (authErr) {
          console.warn('Failed to create auth session, using email directly:', authErr)
        }

        // Fallback: use email from Stripe session directly (preferences will still save)
        setEmail(sessionData.email)
        setTimeout(() => {
          setShowModal(true)
          setLoading(false)
        }, 500)
      } catch (err) {
        console.error('Error checking auth:', err)
        setError(err instanceof Error ? err.message : 'Failed to load session')
        setLoading(false)
      }
    }

    checkAuth()
  }, [sessionId])

  return (
    <div className="min-h-screen bg-gradient-to-b from-lake-blue-900 to-lake-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8 max-w-md w-full text-center">
        <div className="text-green-600 text-4xl sm:text-5xl mb-4">✓</div>
        <h1 className="text-2xl sm:text-3xl font-bold text-lake-blue-900 mb-4">
          Payment Successful!
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mb-6">
          Welcome to Daily Dispo Deals. Let&apos;s set up your preferences to get you the best deals.
        </p>
        {loading && (
          <div className="space-y-3">
            <SkeletonLoader variant="text" width="200px" height="20px" className="mx-auto" />
            <SkeletonLoader variant="text" width="150px" height="16px" className="mx-auto" />
          </div>
        )}
        {error && (
          <div className="text-red-600 text-sm sm:text-base mt-4">
            {error}
            <p className="text-gray-600 text-xs mt-2">
              Please contact support if this issue persists.
            </p>
          </div>
        )}
      </div>

      {email && !error && (
        <PreferencesModal
          open={showModal}
          onOpenChange={setShowModal}
          email={email}
        />
      )}
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-lake-blue-900 to-lake-blue-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8 max-w-md w-full text-center">
          <SkeletonLoader variant="text" width="100px" height="20px" className="mx-auto" />
        </div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
