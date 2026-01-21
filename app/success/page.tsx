'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { PreferencesModal } from '@/app/components/PreferencesModal'

function SuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [email, setEmail] = useState<string>('')
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // In a real implementation, you'd fetch the session from Stripe to get the email
    // For MVP, we'll extract from URL params or use a placeholder
    const emailParam = searchParams.get('email')
    if (emailParam) {
      setEmail(emailParam)
    }
    
    // Show preferences modal after a short delay
    setTimeout(() => {
      setShowModal(true)
      setLoading(false)
    }, 500)
  }, [searchParams])

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
          <div className="text-gray-500 text-sm sm:text-base">Loading...</div>
        )}
      </div>

      {email && (
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
          <div className="text-sm sm:text-base text-gray-500">Loading...</div>
        </div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
