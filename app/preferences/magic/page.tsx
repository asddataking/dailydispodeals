'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { PreferencesModal } from '@/app/components/PreferencesModal'

export default function MagicPreferencesPage() {
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const loadUser = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error || !data.user?.email) {
        setError('Could not verify your magic link. Please request a new one.')
        setLoading(false)
        return
      }
      setEmail(data.user.email)
      setOpen(true)
      setLoading(false)
    }
    loadUser()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-lake-blue-900 to-lake-blue-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8 max-w-md w-full text-center">
          <div className="text-sm sm:text-base text-gray-500">Verifying your link...</div>
        </div>
      </div>
    )
  }

  if (error || !email) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-lake-blue-900 to-lake-blue-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8 max-w-md w-full text-center">
          <div className="text-red-600 text-sm sm:text-base mb-2">{error || 'Invalid link'}</div>
          <p className="text-xs sm:text-sm text-gray-600">
            Your magic link may have expired. Please request a new one from the site.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-lake-blue-900 to-lake-blue-700 flex items-center justify-center p-4">
      <PreferencesModal open={open} onOpenChange={setOpen} email={email} />
    </div>
  )
}

