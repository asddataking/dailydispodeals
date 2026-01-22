'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Dialog from '@radix-ui/react-dialog'

interface PlanSelectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialEmail?: string
}

export function PlanSelectionModal({ open, onOpenChange, initialEmail = '' }: PlanSelectionModalProps) {
  const [email, setEmail] = useState(initialEmail)
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { apiFetch, getErrorMessage, isErrorResponse, unwrapApiResponse } = await import('@/lib/api-client')
      const response = await apiFetch<{ url: string }>('/api/stripe/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({ email, plan }),
      })

      if (isErrorResponse(response)) {
        throw new Error(getErrorMessage(response))
      }

      const data = unwrapApiResponse(response)

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <AnimatePresence mode="wait">
          {open && (
            <>
              <Dialog.Overlay asChild>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="modal-overlay"
                />
              </Dialog.Overlay>
              <Dialog.Content asChild>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="modal-content bg-white rounded-lg shadow-xl p-4 sm:p-6 md:p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
                >
          <Dialog.Title className="text-xl sm:text-2xl font-bold text-lake-blue-900 mb-4">
            Choose Your Plan
          </Dialog.Title>
          
          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-lake-blue-600 focus:border-transparent"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Plan
              </label>
              <div className="space-y-3">
                {[
                  { value: 'monthly', label: 'Monthly', price: '$4.20/month' },
                  { value: 'yearly', label: 'Yearly', price: '$42/year (Save $8.40)' },
                ].map((option, index) => (
                  <motion.label
                    key={option.value}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center p-3 sm:p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 min-h-[60px]"
                  >
                    <input
                      type="radio"
                      name="plan"
                      value={option.value}
                      checked={plan === option.value}
                      onChange={() => setPlan(option.value as 'monthly' | 'yearly')}
                      className="mr-3 w-5 h-5"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-sm sm:text-base">{option.label}</div>
                      <div className="text-xs sm:text-sm text-gray-600">{option.price}</div>
                    </div>
                  </motion.label>
                ))}
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className="w-full bg-lake-blue-700 text-white py-3 rounded-md font-semibold hover:bg-lake-blue-800 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] text-base"
            >
              {loading ? 'Processing...' : 'Continue to Checkout'}
            </motion.button>
          </form>

          <Dialog.Close asChild>
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-gray-600 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              ✕
            </motion.button>
          </Dialog.Close>
                </motion.div>
              </Dialog.Content>
            </>
          )}
        </AnimatePresence>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
