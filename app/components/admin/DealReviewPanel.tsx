'use client'

import { useState, useEffect } from 'react'

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

export function DealReviewPanel() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchReviews()
  }, [])

  const fetchReviews = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/deals/review')
      if (!res.ok) {
        throw new Error('Failed to fetch reviews')
      }
      const data = await res.json()
      setReviews(data.reviews || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reviews')
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async (reviewId: string, action: 'approve' | 'reject' | 'fix', notes?: string) => {
    try {
      const res = await fetch('/api/admin/deals/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review_id: reviewId,
          action,
          notes,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to process review')
      }

      // Remove from list
      setReviews(reviews.filter((r) => r.id !== reviewId))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to process review')
    }
  }

  if (loading) {
    return <div className="text-gray-600">Loading reviews...</div>
  }

  if (error) {
    return <div className="text-red-600">{error}</div>
  }

  if (reviews.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center text-gray-600">
        No pending reviews
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Pending Deal Reviews</h2>
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
    </div>
  )
}
