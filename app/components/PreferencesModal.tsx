'use client'

import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'

interface PreferencesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  email: string
  plan?: string | null
  initialZip?: string
  initialRadius?: 5 | 10 | 25
  initialCategories?: string[]
  initialBrands?: string[]
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

export function PreferencesModal({
  open,
  onOpenChange,
  email,
  plan: planProp = null,
  initialZip = '',
  initialRadius = 10,
  initialCategories = [],
  initialBrands = [],
}: PreferencesModalProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialCategories)
  const [selectedBrands, setSelectedBrands] = useState<string[]>(initialBrands)
  const [availableBrands, setAvailableBrands] = useState<Array<{ id: string; name: string }>>([])
  const [zip, setZip] = useState(initialZip)
  const [radius, setRadius] = useState<5 | 10 | 25>(initialRadius)
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
  }, [initialZip, initialRadius, initialCategories, initialBrands])

  // Fetch available brands on mount (only for paid; free does not show brands)
  useEffect(() => {
    if (isFree) return
    const fetchBrands = async () => {
      try {
        const { callEdgeFunction } = await import('@/lib/supabase/client')
        const data = await callEdgeFunction('get-brands', {})
        if (data.brands) setAvailableBrands(data.brands)
      } catch (err) {
        console.warn('Edge function failed, using API route:', err)
        fetch('/api/brands')
          .then((res) => res.json())
          .then((data) => {
            if (data.brands) setAvailableBrands(data.brands)
          })
          .catch(() => {})
      }
    }
    fetchBrands()
  }, [isFree])

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  const toggleBrand = (brandName: string) => {
    setSelectedBrands(prev =>
      prev.includes(brandName)
        ? prev.filter(b => b !== brandName)
        : [...prev, brandName]
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
      try {
        const { callEdgeFunction } = await import('@/lib/supabase/client')
        data = await callEdgeFunction('save-preferences', {
          email,
          categories: selectedCategories,
          brands: selectedBrands.length > 0 ? selectedBrands : undefined,
          zip: zip.trim(),
          radius,
        })
      } catch (edgeError) {
        console.warn('Edge function failed, using API route:', edgeError)
        const { apiFetch, getErrorMessage, isErrorResponse } = await import('@/lib/api-client')
        const response = await apiFetch('/api/preferences', {
          method: 'POST',
          body: JSON.stringify({
            email,
            categories: selectedCategories,
            brands: selectedBrands.length > 0 ? selectedBrands : undefined,
            zip: zip.trim(),
            radius,
          }),
        })
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
          <Dialog.Content className="modal-content bg-white rounded-lg shadow-xl p-6 sm:p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="text-green-600 text-3xl sm:text-4xl mb-4">✓</div>
              <h2 className="text-xl sm:text-2xl font-bold text-lake-blue-900 mb-2">
                {isFree ? 'Zip updated' : 'Preferences Saved!'}
              </h2>
              <p className="text-sm sm:text-base text-gray-600">
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
            <Dialog.Content className="modal-content bg-white rounded-lg shadow-xl p-4 sm:p-6 md:p-8 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
              <Dialog.Title className="text-xl sm:text-2xl font-bold text-lake-blue-900 mb-4">
                {isFree ? 'Update Your Zip' : 'Set Your Preferences'}
              </Dialog.Title>

              <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                {!isFree && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Product Categories (select all that apply)
                      </label>
                      <div className="grid grid-cols-2 gap-2 sm:gap-2">
                        {CATEGORIES.map((category) => (
                          <label
                            key={category}
                            className="flex items-center p-2.5 sm:p-3 border rounded-lg cursor-pointer hover:bg-gray-50 min-h-[44px]"
                          >
                            <input
                              type="checkbox"
                              checked={selectedCategories.includes(category)}
                              onChange={() => toggleCategory(category)}
                              className="mr-2 w-4 h-4 sm:w-5 sm:h-5"
                            />
                            <span className="text-xs sm:text-sm capitalize">{category.replace('/', ' / ')}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Preferred Brands (optional - select brands you like)
                      </label>
                      {availableBrands.length > 0 ? (
                        <div className="max-h-48 overflow-y-auto border rounded-lg p-2">
                          <div className="grid grid-cols-2 gap-2">
                            {availableBrands.map((brand) => (
                              <label
                                key={brand.id}
                                className="flex items-center p-2 border rounded cursor-pointer hover:bg-gray-50"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedBrands.includes(brand.name)}
                                  onChange={() => toggleBrand(brand.name)}
                                  className="mr-2"
                                />
                                <span className="text-sm">{brand.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 mt-2 p-2 border rounded-lg bg-gray-50">
                          No brands available yet. Brands will appear as deals are processed.
                        </p>
                      )}
                    </div>
                  </>
                )}

                <div>
                  <label htmlFor="zip" className="block text-sm font-medium text-gray-700 mb-2">
                    Zip Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="zip"
                    type="text"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    required
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-lake-blue-600 focus:border-transparent"
                    placeholder="48000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Radius <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={radius}
                    onChange={(e) => setRadius(Number(e.target.value) as 5 | 10 | 25)}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-lake-blue-600 focus:border-transparent"
                  >
                    <option value="5">5 miles</option>
                    <option value="10">10 miles</option>
                    <option value="25">25 miles</option>
                  </select>
                </div>

                {error && (
                  <div className="text-red-600 text-sm">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={loading || (!isFree && selectedCategories.length === 0) || !zip.trim() || !radius}
                  className="w-full bg-lake-blue-700 text-white py-3 rounded-md font-semibold hover:bg-lake-blue-800 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] text-base"
                >
                  {loading ? 'Saving...' : isFree ? 'Update Zip' : 'Save Preferences'}
                </button>
          </form>

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
