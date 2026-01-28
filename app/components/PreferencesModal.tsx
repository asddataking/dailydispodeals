'use client'

import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Plus_Jakarta_Sans } from 'next/font/google'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
})

interface PreferencesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  email: string
  plan?: string | null
  initialZip?: string
  initialRadius?: 5 | 10 | 25
  initialCategories?: string[]
  initialBrands?: string[]
  initialPreferHighThc?: boolean
  initialPreferValueDeals?: boolean
}

const CATEGORIES = [
  'flower',
  'pre-rolls',
  'vapes',
  'concentrates',
  'edibles',
  'drinks',
  'topicals',
  'cbd/thca',
  'accessories',
] as const

// Module-level cache for brands (similar to YouTube videos pattern)
let cachedBrands: Array<{ id: string; name: string }> | null = null
let cachedAt: number | null = null
const BRANDS_CACHE_TTL_MS = 1000 * 60 * 60 // 1 hour

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
}) {
  return (
    <label className="flex items-start gap-4 cursor-pointer group">
      <div
        className={`relative flex-shrink-0 mt-0.5 w-12 h-7 rounded-full transition-colors duration-200 ${
          checked ? 'bg-lake-blue-600' : 'bg-gray-300'
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <span
          className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
          aria-hidden
        />
      </div>
      <div>
        <span className="font-semibold text-gray-900 group-hover:text-lake-blue-800 transition-colors">
          {label}
        </span>
        {description && (
          <p className="text-gray-600 text-[15px] leading-snug mt-0.5">{description}</p>
        )}
      </div>
    </label>
  )
}

export function PreferencesModal({
  open,
  onOpenChange,
  email,
  plan: planProp = null,
  initialZip = '',
  initialRadius = 10,
  initialCategories = [],
  initialBrands = [],
  initialPreferHighThc = false,
  initialPreferValueDeals = false,
}: PreferencesModalProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialCategories)
  const [selectedBrands, setSelectedBrands] = useState<string[]>(initialBrands)
  const [availableBrands, setAvailableBrands] = useState<Array<{ id: string; name: string }>>([])
  const [zip, setZip] = useState(initialZip)
  const [radius, setRadius] = useState<5 | 10 | 25>(initialRadius)
  const [preferHighThc, setPreferHighThc] = useState(initialPreferHighThc)
  const [preferValueDeals, setPreferValueDeals] = useState(initialPreferValueDeals)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const isFree = planProp === 'free'

  // Sync initial values when they load (e.g. after GET /api/preferences)
  useEffect(() => {
    if (initialZip) setZip(initialZip)
    if (initialRadius) setRadius(initialRadius)
    if (initialCategories.length) setSelectedCategories(initialCategories)
    if (initialBrands.length) setSelectedBrands(initialBrands)
    setPreferHighThc(initialPreferHighThc)
    setPreferValueDeals(initialPreferValueDeals)
  }, [initialZip, initialRadius, initialCategories, initialBrands, initialPreferHighThc, initialPreferValueDeals])

  // Fetch available brands on mount (only for paid; free does not show brands)
  useEffect(() => {
    if (isFree) return

    const now = Date.now()
    if (cachedBrands && cachedAt && now - cachedAt < BRANDS_CACHE_TTL_MS) {
      setAvailableBrands(cachedBrands)
      return
    }

    const fetchBrands = async () => {
      try {
        const { callEdgeFunction } = await import('@/lib/supabase/client')
        const data = await callEdgeFunction('get-brands', {})
        if (data.brands) {
          cachedBrands = data.brands
          cachedAt = Date.now()
          setAvailableBrands(data.brands)
        }
      } catch (err) {
        console.warn('Edge function failed, using API route:', err)
        fetch('/api/brands')
          .then((res) => res.json())
          .then((data) => {
            if (data.brands) {
              cachedBrands = data.brands
              cachedAt = Date.now()
              setAvailableBrands(data.brands)
            }
          })
          .catch(() => {})
      }
    }
    fetchBrands()
  }, [isFree])

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    )
  }

  const toggleBrand = (brandName: string) => {
    setSelectedBrands(prev =>
      prev.includes(brandName) ? prev.filter((b) => b !== brandName) : [...prev, brandName]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!zip.trim()) {
      setError('Please enter your zip code')
      return
    }
    if (!isFree && selectedCategories.length === 0) {
      setError('Please select at least one category')
      return
    }
    if (!radius) {
      setError('Please select a search radius')
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (isFree) {
        const { apiFetch, getErrorMessage, isErrorResponse } = await import('@/lib/api-client')
        const response = await apiFetch('/api/preferences', {
          method: 'POST',
          body: JSON.stringify({ email, zip: zip.trim(), radius }),
        })
        if (isErrorResponse(response)) throw new Error(getErrorMessage(response))
        setSuccess(true)
        setTimeout(() => onOpenChange(false), 1500)
        return
      }

      let data: unknown
      const payload = {
        email,
        categories: selectedCategories,
        brands: selectedBrands.length > 0 ? selectedBrands : undefined,
        zip: zip.trim(),
        radius,
        preferHighThc,
        preferValueDeals,
      }
      try {
        const { callEdgeFunction } = await import('@/lib/supabase/client')
        data = await callEdgeFunction('save-preferences', payload)
      } catch (edgeError) {
        console.warn('Edge function failed, using API route:', edgeError)
        const { apiFetch, getErrorMessage, isErrorResponse } = await import('@/lib/api-client')
        const response = await apiFetch('/api/preferences', { method: 'POST', body: JSON.stringify(payload) })
        if (isErrorResponse(response)) throw new Error(getErrorMessage(response))
        data = response.data
      }

      if (data && typeof data === 'object' && 'ok' in data && !(data as { ok?: boolean }).ok) {
        throw new Error((data as { error?: string }).error || 'Failed to save preferences')
      }

      setSuccess(true)
      setTimeout(() => onOpenChange(false), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="modal-overlay" />
          <Dialog.Content
            className={`modal-content bg-white rounded-2xl shadow-2xl p-8 sm:p-10 max-w-md w-full mx-4 ${plusJakarta.className}`}
          >
            <div className="text-center">
              <div className="text-emerald-500 text-4xl sm:text-5xl mb-5">✓</div>
              <h2 className="text-2xl sm:text-3xl font-bold text-lake-blue-900 mb-3">
                {isFree ? 'Zip updated' : 'Preferences Saved!'}
              </h2>
              <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
                {isFree
                  ? "You'll receive your weekly deal summary at this zip."
                  : "You'll start receiving personalized deals daily."}
              </p>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    )
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content
          className={`modal-content bg-white rounded-2xl shadow-2xl max-w-xl w-full mx-4 max-h-[90vh] overflow-y-auto ${plusJakarta.className}`}
        >
          <div className="p-6 sm:p-8">
            <Dialog.Title className="text-2xl sm:text-3xl font-bold text-lake-blue-900 mb-6">
              {isFree ? 'Update your zip' : 'Set your preferences'}
            </Dialog.Title>

            <form onSubmit={handleSubmit} className="space-y-6">
              {!isFree && (
                <>
                  {/* Product categories */}
                  <section className="rounded-xl bg-slate-50/80 border border-slate-200/60 p-5 sm:p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Product categories
                    </h3>
                    <p className="text-[15px] text-gray-600 mb-4">Select all that apply.</p>
                    <div className="grid grid-cols-2 gap-3">
                      {CATEGORIES.map((category) => (
                        <label
                          key={category}
                          className="flex items-center gap-3 p-3 sm:p-3.5 rounded-lg border border-slate-200/80 bg-white cursor-pointer hover:border-lake-blue-400 hover:bg-lake-blue-50/30 transition-colors min-h-[48px]"
                        >
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(category)}
                            onChange={() => toggleCategory(category)}
                            className="w-5 h-5 rounded border-gray-300 text-lake-blue-600 focus:ring-lake-blue-500"
                          />
                          <span className="text-[15px] font-medium text-gray-800 capitalize">
                            {category.replace('/', ' / ')}
                          </span>
                        </label>
                      ))}
                    </div>
                  </section>

                  {/* Preferred brands */}
                  <section className="rounded-xl bg-slate-50/80 border border-slate-200/60 p-5 sm:p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      Preferred brands
                    </h3>
                    <p className="text-[15px] text-gray-600 mb-4">Optional — we&apos;ll prioritize these when we have them.</p>
                    {availableBrands.length > 0 ? (
                      <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-200/80 bg-white p-3">
                        <div className="grid grid-cols-2 gap-2">
                          {availableBrands.map((brand) => (
                            <label
                              key={brand.id}
                              className="flex items-center gap-2.5 p-2.5 rounded-md cursor-pointer hover:bg-slate-50 transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={selectedBrands.includes(brand.name)}
                                onChange={() => toggleBrand(brand.name)}
                                className="w-4 h-4 rounded border-gray-300 text-lake-blue-600"
                              />
                              <span className="text-[15px] text-gray-800">{brand.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[15px] text-gray-500 p-4 rounded-lg bg-white border border-slate-200/60">
                        No brands available yet. Brands will appear as deals are processed.
                      </p>
                    )}
                  </section>

                  {/* Deal & potency preferences */}
                  <section className="rounded-xl bg-slate-50/80 border border-slate-200/60 p-5 sm:p-6 space-y-5">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Deal preferences
                    </h3>
                    <div className="space-y-4">
                      <Toggle
                        checked={preferHighThc}
                        onChange={setPreferHighThc}
                        label="Prefer high-THC products"
                        description="Prioritize products with higher THC when we have that data."
                      />
                      <Toggle
                        checked={preferValueDeals}
                        onChange={setPreferValueDeals}
                        label="Prefer value / budget deals"
                        description="Surface lower-price deals first when ranking."
                      />
                    </div>
                  </section>
                </>
              )}

              {/* Location */}
              <section className="rounded-xl bg-slate-50/80 border border-slate-200/60 p-5 sm:p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Location & radius</h3>
                <div>
                  <label htmlFor="prefs-zip" className="block text-[15px] font-medium text-gray-800 mb-2">
                    Zip code <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="prefs-zip"
                    type="text"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    required
                    className="w-full px-4 py-3.5 text-[16px] border border-slate-300 rounded-xl focus:ring-2 focus:ring-lake-blue-500 focus:border-lake-blue-500 bg-white"
                    placeholder="e.g. 48000"
                  />
                </div>
                <div>
                  <label htmlFor="prefs-radius" className="block text-[15px] font-medium text-gray-800 mb-2">
                    Search radius <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="prefs-radius"
                    value={radius}
                    onChange={(e) => setRadius(Number(e.target.value) as 5 | 10 | 25)}
                    className="w-full px-4 py-3.5 text-[16px] border border-slate-300 rounded-xl focus:ring-2 focus:ring-lake-blue-500 focus:border-lake-blue-500 bg-white"
                  >
                    <option value="5">5 miles</option>
                    <option value="10">10 miles</option>
                    <option value="25">25 miles</option>
                  </select>
                </div>
              </section>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200/80 px-4 py-3 text-[15px] text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={
                  loading ||
                  (!isFree && selectedCategories.length === 0) ||
                  !zip.trim() ||
                  !radius
                }
                className="w-full bg-lake-blue-600 hover:bg-lake-blue-700 text-white py-4 rounded-xl font-semibold text-[17px] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-lake-blue-900/20"
              >
                {loading ? 'Saving…' : isFree ? 'Update zip' : 'Save preferences'}
              </button>
            </form>
          </div>

          <Dialog.Close asChild>
            <button
              type="button"
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
