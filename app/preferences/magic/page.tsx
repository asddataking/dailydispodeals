'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { PreferencesModal } from '@/app/components/PreferencesModal'

export default function MagicPreferencesPage() {
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [prefs, setPrefs] = useState<{
    plan: string | null
    zip: string
    radius: 5 | 10 | 25
    categories: string[]
    brands: string[]
  } | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: authData, error: authErr } = await supabase.auth.getSession()
      if (authErr || !authData.session?.user?.email) {
        setError('Could not verify your magic link. Please request a new one.')
        setLoading(false)
        return
      }
      setEmail(authData.session.user.email)
      setOpen(true)

      try {
        const res = await fetch('/api/preferences', {
          headers: { Authorization: `Bearer ${authData.session.access_token}` },
        })
        const json = await res.json()
        if (res.status === 403) {
          setError(json.error || 'No active subscription. Subscribe first to manage preferences.')
          setLoading(false)
          return
        }
        if (json.success && json.data) {
          setPrefs({
            plan: json.data.plan ?? null,
            zip: json.data.zip ?? '',
            radius: json.data.radius ?? 10,
            categories: json.data.categories ?? [],
            brands: json.data.brands ?? [],
          })
        }
      } catch {
        // leave prefs null; modal will use empty defaults
      }
      setLoading(false)
    }
    load()
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
      <PreferencesModal
        open={open}
        onOpenChange={setOpen}
        email={email}
        plan={prefs?.plan ?? null}
        initialZip={prefs?.zip ?? ''}
        initialRadius={prefs?.radius ?? 10}
        initialCategories={prefs?.categories ?? []}
        initialBrands={prefs?.brands ?? []}
      />
    </div>
  )
}

