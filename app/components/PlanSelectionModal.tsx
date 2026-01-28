'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Dialog from '@radix-ui/react-dialog'

type PlanType = 'monthly' | 'yearly' | 'free'

interface PlanSelectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialEmail?: string
}

export function PlanSelectionModal({ open, onOpenChange, initialEmail = '' }: PlanSelectionModalProps) {
  const [email, setEmail] = useState(initialEmail)
  const [plan, setPlan] = useState<PlanType>('yearly')
  const [zip, setZip] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [freeSuccess, setFreeSuccess] = useState(false)

  const hasPreFilledEmail = !!(initialEmail && String(initialEmail).trim())
  const emailToSubmit = hasPreFilledEmail ? String(initialEmail).trim() : email
  const isFree = plan === 'free'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { apiFetch, getErrorMessage, isErrorResponse, unwrapApiResponse } = await import('@/lib/api-client')

      if (isFree) {
        const response = await apiFetch<{ ok?: boolean; message?: string }>('/api/subscribe-free', {
          method: 'POST',
          body: JSON.stringify({ email: emailToSubmit, zip: zip.trim() }),
        })
        if (isErrorResponse(response)) {
          throw new Error(getErrorMessage(response))
        }
        unwrapApiResponse(response)
        setFreeSuccess(true)
        setLoading(false)
        return
      }

      const response = await apiFetch<{ url: string }>('/api/stripe/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({ email: emailToSubmit, plan }),
      })

      if (isErrorResponse(response)) {
        const msg = getErrorMessage(response) + (response.details ? ` — ${String(response.details)}` : '')
        throw new Error(msg)
      }

      const data = unwrapApiResponse(response)
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  if (freeSuccess) {
    return (
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="modal-overlay" />
          <Dialog.Content
            className="modal-content modal-draggable bg-white rounded-lg shadow-xl p-4 sm:p-6 md:p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="-m-6 mb-4 mt-4 px-6 pt-4 pb-2">
              <h2 className="text-xl sm:text-2xl font-bold text-lake-blue-900">You&apos;re all set</h2>
            </div>
            <div className="text-center">
              <div className="text-green-600 text-3xl sm:text-4xl mb-4">✓</div>
              <p className="text-sm sm:text-base text-gray-600">
                We&apos;ll send a weekly summary of the best deals near you to <span className="font-medium text-lake-blue-900">{emailToSubmit}</span>.
              </p>
            </div>
            <Dialog.Close asChild>
              <button className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-gray-600 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center">✕</button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    )
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
                  className="modal-content modal-draggable bg-white rounded-lg shadow-xl p-4 sm:p-6 md:p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto flex flex-col"
                >
                  <div className="-mx-4 -mt-4 px-4 pt-4 pb-2 mb-2 pr-14">
                    <Dialog.Title className="text-xl sm:text-2xl font-bold text-lake-blue-900">
                      Choose Your Plan
                    </Dialog.Title>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6 flex-1 min-h-0 overflow-y-auto">
                    {hasPreFilledEmail ? (
                      <p className="text-sm text-gray-600">
                        We&apos;ll send your deals to <span className="font-medium text-lake-blue-900">{emailToSubmit}</span>
                      </p>
                    ) : (
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email</label>
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
                    )}

                    {isFree && (
                      <div>
                        <label htmlFor="zip" className="block text-sm font-medium text-gray-700 mb-2">Zip code</label>
                        <input
                          id="zip"
                          type="text"
                          value={zip}
                          onChange={(e) => setZip(e.target.value)}
                          required
                          placeholder="12345"
                          className="w-full px-4 py-3 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-lake-blue-600 focus:border-transparent"
                        />
                        <p className="mt-1.5 text-xs text-gray-500">Weekly summary of the best deals in your area. No preferences, no card.</p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Select Plan</label>
                      <div className="space-y-3">
                        {[
                          { value: 'free' as const, label: 'Free', price: 'Weekly digest', desc: 'Best deals near you, once a week' },
                          { value: 'monthly' as const, label: 'Monthly', price: '$4.20/month', desc: 'Daily emails • Preferences' },
                          {
                            value: 'yearly' as const,
                            label: 'Yearly',
                            price: '$42/year',
                            desc: '2 months free • Daily emails • Preferences',
                            badge: 'Best value',
                          },
                        ].map((option, index) => (
                          <motion.label
                            key={option.value}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.08 }}
                            whileHover={{ scale: 1.01, x: 2 }}
                            whileTap={{ scale: 0.99 }}
                            className={`flex items-start p-3 sm:p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 min-h-[56px] ${
                              plan === option.value ? 'border-lake-blue-600 bg-lake-blue-50/50' : 'border-gray-200'
                            } ${option.value === 'yearly' ? 'ring-1 ring-amber-200/80' : ''}`}
                          >
                            <input
                              type="radio"
                              name="plan"
                              value={option.value}
                              checked={plan === option.value}
                              onChange={() => setPlan(option.value)}
                              className="mt-1 mr-3 w-5 h-5 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm sm:text-base">{option.label}</span>
                                {'badge' in option && option.badge && (
                                  <span className="shrink-0 px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold text-amber-700 bg-amber-100 rounded">
                                    {option.badge}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs sm:text-sm text-gray-600">{option.price}</div>
                              {option.desc && <div className="text-xs text-gray-500 mt-0.5">{option.desc}</div>}
                            </div>
                          </motion.label>
                        ))}
                      </div>
                    </div>

                    {error && <div className="text-red-600 text-sm">{error}</div>}

                    <motion.button
                      type="submit"
                      disabled={loading || (isFree && !zip.trim())}
                      whileHover={loading ? {} : { scale: 1.02 }}
                      whileTap={loading ? {} : { scale: 0.98 }}
                      className="w-full bg-lake-blue-700 text-white py-3 rounded-md font-semibold hover:bg-lake-blue-800 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] text-base"
                    >
                      {loading ? 'Processing...' : isFree ? 'Sign up free' : 'Continue to Checkout'}
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
