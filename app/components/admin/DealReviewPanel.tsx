'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAdminAuth, getAuthHeaders } from '@/lib/hooks/useAdminAuth'
import { SkeletonLoader } from '@/app/components/SkeletonLoader'

interface Review {
  id: string
  deal_id: string
  reason: string
  status: string
  notes: string | null
  created_at: string
  deals: {
    id: string
    dispensary_name: string
    city: string | null
    date: string
    category: string
    title: string
    price_text: string
    confidence: number | null
    source_url: string | null
  }
}

interface Dispensary {
  id: string
  name: string
  city: string | null
}

export function DealReviewPanel() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [dispensaries, setDispensaries] = useState<Dispensary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [addUrlSource, setAddUrlSource] = useState('')
  const [addUrlDispensaryId, setAddUrlDispensaryId] = useState('')
  const [addUrlLoading, setAddUrlLoading] = useState(false)
  const [addUrlResult, setAddUrlResult] = useState<{ deals_inserted: number; skipped?: boolean } | null>(null)
  const [addUrlError, setAddUrlError] = useState('')
  const { token } = useAdminAuth()

  const fetchDispensaries = useCallback(async () => {
    try {
      const { apiFetch, getErrorMessage, isErrorResponse, unwrapApiResponse } = await import('@/lib/api-client')
      const response = await apiFetch<{ dispensaries: Dispensary[] }>('/api/admin/dispensaries', {
        headers: getAuthHeaders(token),
      })
      if (isErrorResponse(response)) throw new Error(getErrorMessage(response))
      const data = unwrapApiResponse(response)
      setDispensaries(data.dispensaries || [])
    } catch {
      setDispensaries([])
    }
  }, [token])

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { apiFetch, getErrorMessage, isErrorResponse, unwrapApiResponse } = await import('@/lib/api-client')
      const response = await apiFetch<{ reviews: Review[] }>('/api/admin/deals/review', {
        headers: getAuthHeaders(token),
      })
      
      if (isErrorResponse(response)) {
        throw new Error(getErrorMessage(response))
      }
      
      const data = unwrapApiResponse(response)
      setReviews(data.reviews || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reviews')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (token !== null) {
      fetchReviews()
      fetchDispensaries()
    }
  }, [token, fetchReviews, fetchDispensaries])

  const handleAddUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addUrlSource.trim() || !addUrlDispensaryId) {
      setAddUrlError('Please enter a URL and select a dispensary')
      return
    }
    setAddUrlError('')
    setAddUrlResult(null)
    setAddUrlLoading(true)
    try {
      const { apiFetch, getErrorMessage, isErrorResponse, unwrapApiResponse } = await import('@/lib/api-client')
      const response = await apiFetch<{ deals_inserted: number; skipped?: boolean }>('/api/admin/ingest-url', {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({ source_url: addUrlSource.trim(), dispensary_id: addUrlDispensaryId }),
      })
      if (isErrorResponse(response)) throw new Error(getErrorMessage(response))
      const data = unwrapApiResponse(response)
      setAddUrlResult({ deals_inserted: data.deals_inserted, skipped: data.skipped })
      if (data.deals_inserted > 0) fetchReviews()
    } catch (err) {
      setAddUrlError(err instanceof Error ? err.message : 'Failed to run OCR & Parse')
    } finally {
      setAddUrlLoading(false)
    }
  }

  const handleReview = async (reviewId: string, action: 'approve' | 'reject' | 'fix', notes?: string) => {
    try {
      const { apiFetch, getErrorMessage, isErrorResponse } = await import('@/lib/api-client')
      const response = await apiFetch('/api/admin/deals/review', {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({
          review_id: reviewId,
          action,
          notes,
        }),
      })

      if (isErrorResponse(response)) {
        throw new Error(getErrorMessage(response))
      }

      // Remove from list
      setReviews(reviews.filter((r) => r.id !== reviewId))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to process review')
    }
  }

  if (loading && reviews.length === 0) {
    return <SkeletonLoader variant="review" count={3} />
  }

  return (
    <div className="space-y-6">
      {/* Add URL for OCR */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add URL for OCR</h3>
        <p className="text-sm text-gray-600 mb-4">
          Paste a flyer or deals URL (e.g. Weedmaps image/PDF) and run OCR + parse to extract deals for a dispensary.
        </p>
        <form onSubmit={handleAddUrlSubmit} className="space-y-4">
          <div>
            <label htmlFor="add-url-source" className="block text-sm font-medium text-gray-700 mb-1">URL <span className="text-red-500">*</span></label>
            <input
              id="add-url-source"
              type="url"
              value={addUrlSource}
              onChange={(e) => { setAddUrlSource(e.target.value); setAddUrlError(''); setAddUrlResult(null) }}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              disabled={addUrlLoading}
            />
          </div>
          <div>
            <label htmlFor="add-url-dispensary" className="block text-sm font-medium text-gray-700 mb-1">Dispensary <span className="text-red-500">*</span></label>
            <select
              id="add-url-dispensary"
              value={addUrlDispensaryId}
              onChange={(e) => { setAddUrlDispensaryId(e.target.value); setAddUrlError(''); setAddUrlResult(null) }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              disabled={addUrlLoading || dispensaries.length === 0}
            >
              <option value="">Select a dispensary</option>
              {dispensaries.map((d) => (
                <option key={d.id} value={d.id}>{d.name}{d.city ? ` (${d.city})` : ''}</option>
              ))}
            </select>
          </div>
          {addUrlError && <div className="text-red-600 text-sm">{addUrlError}</div>}
          {addUrlResult && (
            <div className={`text-sm ${addUrlResult.skipped ? 'text-amber-700' : 'text-green-700'}`}>
              {addUrlResult.skipped ? 'Skipped (duplicate flyer).' : `${addUrlResult.deals_inserted} deal(s) inserted.`}
            </div>
          )}
          <button
            type="submit"
            disabled={addUrlLoading || !addUrlSource.trim() || !addUrlDispensaryId}
            className="px-4 py-2 bg-lake-blue-700 text-white rounded-lg hover:bg-lake-blue-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {addUrlLoading ? 'Running OCR & Parse...' : 'Run OCR & Parse'}
          </button>
        </form>
      </div>

      {/* Pending Deal Reviews */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Pending Deal Reviews</h2>
        {error && <div className="text-red-600 mb-4">{error}</div>}
        {reviews.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-600">No pending reviews</div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
          <div key={review.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{review.deals.title}</h3>
                <p className="text-sm text-gray-600">
                  {review.deals.dispensary_name} • {review.deals.city || 'N/A'} • {review.deals.date}
                </p>
              </div>
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                {review.deals.category}
              </span>
            </div>

            <div className="mb-4 space-y-2">
              <div>
                <span className="text-sm font-medium text-gray-700">Price: </span>
                <span className="text-sm text-gray-900">{review.deals.price_text}</span>
              </div>
              {review.deals.confidence !== null && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Confidence: </span>
                  <span className="text-sm text-gray-900">{(review.deals.confidence * 100).toFixed(1)}%</span>
                </div>
              )}
              <div>
                <span className="text-sm font-medium text-gray-700">Review Reason: </span>
                <span className="text-sm text-gray-900">{review.reason}</span>
              </div>
              {review.deals.source_url && (
                <div>
                  <a
                    href={review.deals.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-lake-blue-600 hover:underline"
                  >
                    View Source →
                  </a>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleReview(review.id, 'approve')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
              >
                Approve
              </button>
              <button
                onClick={() => handleReview(review.id, 'reject')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
              >
                Reject
              </button>
              <button
                onClick={() => handleReview(review.id, 'fix')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
              >
                Mark as Fixed
              </button>
            </div>
          </div>
        ))}
          </div>
        )}
      </div>
    </div>
  )
}
