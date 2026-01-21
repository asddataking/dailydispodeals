'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { supabase } from '@/lib/supabase/client'

interface ManagePreferencesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ManagePreferencesModal({ open, onOpenChange }: ManagePreferencesModalProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/preferences/magic`,
        },
      })

      if (error) {
        throw error
      }

      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send magic link')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="modal-content bg-white rounded-lg shadow-xl p-4 sm:p-6 md:p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
          <Dialog.Title className="text-xl sm:text-2xl font-bold text-lake-blue-900 mb-4">
            Manage Your Preferences
          </Dialog.Title>

          {sent ? (
            <div className="space-y-3 text-sm sm:text-base text-gray-700">
              <p>We&apos;ve sent a magic link to:</p>
              <p className="font-semibold break-all">{email}</p>
              <p>Click the link in your email to securely update your deal preferences.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
              <div>
                <label htmlFor="manage-email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  id="manage-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-lake-blue-600 focus:border-transparent"
                  placeholder="you@example.com"
                />
              </div>

              {error && <div className="text-red-600 text-sm">{error}</div>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-lake-blue-700 text-white py-3 rounded-md font-semibold hover:bg-lake-blue-800 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] text-base"
              >
                {loading ? 'Sending...' : 'Email Me a Magic Link'}
              </button>
            </form>
          )}

          <Dialog.Close asChild>
            <button className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-gray-600 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center">
              ✕
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

