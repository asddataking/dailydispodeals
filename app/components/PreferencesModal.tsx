'use client'

import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'

interface PreferencesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  email: string
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

export function PreferencesModal({ open, onOpenChange, email }: PreferencesModalProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [availableBrands, setAvailableBrands] = useState<Array<{ id: string; name: string }>>([])
  const [zip, setZip] = useState('')
  const [radius, setRadius] = useState<5 | 10 | 25 | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Fetch available brands on mount (using edge function for speed)
  useEffect(() => {
    // Try edge function first, fallback to API route
    const fetchBrands = async () => {
      try {
        // Use edge function if available
        const { callEdgeFunction } = await import('@/lib/supabase/client')
        const data = await callEdgeFunction('get-brands', {})
        if (data.brands) {
          setAvailableBrands(data.brands)
        }
      } catch (err) {
        // Fallback to API route
        console.warn('Edge function failed, using API route:', err)
        fetch('/api/brands')
          .then(res => res.json())
          .then(data => {
            if (data.brands) {
              setAvailableBrands(data.brands)
            }
          })
          .catch(error => {
            console.error('Failed to fetch brands:', error)
          })
      }
    }
    fetchBrands()
  }, [])

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
    
    if (selectedCategories.length === 0) {
      setError('Please select at least one category')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Try edge function first for speed, fallback to API route
      let data: any
      try {
        const { callEdgeFunction } = await import('@/lib/supabase/client')
        data = await callEdgeFunction('save-preferences', {
          email,
          categories: selectedCategories,
          brands: selectedBrands.length > 0 ? selectedBrands : undefined,
          zip: zip || undefined,
          radius: radius || undefined,
        })
      } catch (edgeError) {
        // Fallback to API route
        console.warn('Edge function failed, using API route:', edgeError)
        const response = await fetch('/api/preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            categories: selectedCategories,
            brands: selectedBrands.length > 0 ? selectedBrands : undefined,
            zip: zip || undefined,
            radius: radius || undefined,
          }),
        })
        data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to save preferences')
        }
      }

      if (!data.ok) {
        throw new Error(data.error || 'Failed to save preferences')
      }

      setSuccess(true)
      setTimeout(() => {
        onOpenChange(false)
      }, 1500)
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
          <Dialog.Content className="modal-content bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="text-green-600 text-4xl mb-4">✓</div>
              <h2 className="text-2xl font-bold text-lake-blue-900 mb-2">
                Preferences Saved!
              </h2>
              <p className="text-gray-600">
                You&apos;ll start receiving personalized deals daily.
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
        <Dialog.Content className="modal-content bg-white rounded-lg shadow-xl p-8 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
          <Dialog.Title className="text-2xl font-bold text-lake-blue-900 mb-4">
            Set Your Preferences
          </Dialog.Title>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Product Categories (select all that apply)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map(category => (
                  <label
                    key={category}
                    className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category)}
                      onChange={() => toggleCategory(category)}
                      className="mr-2"
                    />
                    <span className="text-sm capitalize">{category.replace('/', ' / ')}</span>
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
                    {availableBrands.map(brand => (
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

            <div>
              <label htmlFor="zip" className="block text-sm font-medium text-gray-700 mb-2">
                Zip Code (optional)
              </label>
              <input
                id="zip"
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-lake-blue-600 focus:border-transparent"
                placeholder="48000"
              />
            </div>

            {zip && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Radius (optional)
                </label>
                <select
                  value={radius || ''}
                  onChange={(e) => setRadius(e.target.value ? Number(e.target.value) as 5 | 10 | 25 : undefined)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-lake-blue-600 focus:border-transparent"
                >
                  <option value="">No radius limit</option>
                  <option value="5">5 miles</option>
                  <option value="10">10 miles</option>
                  <option value="25">25 miles</option>
                </select>
              </div>
            )}

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading || selectedCategories.length === 0}
              className="w-full bg-lake-blue-700 text-white py-3 rounded-md font-semibold hover:bg-lake-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Preferences'}
            </button>
          </form>

          <Dialog.Close asChild>
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
