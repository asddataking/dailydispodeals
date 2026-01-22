'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { SkeletonLoader } from '@/app/components/SkeletonLoader'

interface Dispensary {
  id: string
  name: string
  city: string | null
  zip: string | null
  state: string
  flyer_url: string | null
  weedmaps_url: string | null
  active: boolean
  ingestion_success_rate: number | null
  last_ingested_at: string | null
  recent_deals_count?: number
}

export function DispensaryManager() {
  const [dispensaries, setDispensaries] = useState<Dispensary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editing, setEditing] = useState<Dispensary | null>(null)
  const [discoverZip, setDiscoverZip] = useState('')
  const [discoverRadius, setDiscoverRadius] = useState<5 | 10 | 25>(25)
  const [discovering, setDiscovering] = useState(false)
  const [discoverResult, setDiscoverResult] = useState<{ success: boolean; discovered: number; message?: string } | null>(null)

  useEffect(() => {
    fetchDispensaries()
  }, [])

  const fetchDispensaries = async () => {
    setLoading(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const { apiFetch, getErrorMessage, isErrorResponse, unwrapApiResponse } = await import('@/lib/api-client')
      const response = await apiFetch<{ dispensaries: Dispensary[] }>('/api/admin/dispensaries', {
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {},
      })
      
      if (isErrorResponse(response)) {
        throw new Error(getErrorMessage(response))
      }
      
      const data = unwrapApiResponse(response)
      setDispensaries(data.dispensaries || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dispensaries')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this dispensary?')) {
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const { apiFetch, getErrorMessage, isErrorResponse } = await import('@/lib/api-client')
      const response = await apiFetch(`/api/admin/dispensaries?id=${id}`, {
        method: 'DELETE',
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {},
      })

      if (isErrorResponse(response)) {
        throw new Error(getErrorMessage(response))
      }

      fetchDispensaries()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to deactivate dispensary')
    }
  }

  const handleDiscover = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!discoverZip || discoverZip.length !== 5) {
      setDiscoverResult({ success: false, discovered: 0, message: 'Please enter a valid 5-digit ZIP code' })
      return
    }

    setDiscovering(true)
    setDiscoverResult(null)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const { apiFetch, getErrorMessage, isErrorResponse, unwrapApiResponse } = await import('@/lib/api-client')
      const response = await apiFetch<{ discovered: number }>('/api/admin/discover', {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          zip: discoverZip,
          radius: discoverRadius,
        }),
      })

      if (isErrorResponse(response)) {
        throw new Error(getErrorMessage(response))
      }

      const data = unwrapApiResponse(response)

      setDiscoverResult({
        success: true,
        discovered: data.discovered || 0,
        message: `Discovered ${data.discovered} dispensaries near ${discoverZip}`,
      })

      // Refresh dispensaries list
      fetchDispensaries()

      // Clear form after a delay
      setTimeout(() => {
        setDiscoverZip('')
        setDiscoverResult(null)
      }, 3000)
    } catch (err) {
      setDiscoverResult({
        success: false,
        discovered: 0,
        message: err instanceof Error ? err.message : 'Failed to discover dispensaries',
      })
    } finally {
      setDiscovering(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <SkeletonLoader variant="text" width="200px" height="32px" />
          <SkeletonLoader variant="text" width="150px" height="40px" />
        </div>
        <SkeletonLoader variant="table" count={5} />
      </div>
    )
  }

  if (error) {
    return <div className="text-red-600">{error}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Dispensaries</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-lake-blue-700 text-white rounded-lg hover:bg-lake-blue-800 transition font-medium"
        >
          Add Dispensary
        </button>
      </div>

      {/* Discovery Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Discover Dispensaries</h3>
        <form onSubmit={handleDiscover} className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label htmlFor="discoverZip" className="block text-sm font-medium text-gray-700 mb-2">
                ZIP Code
              </label>
              <input
                id="discoverZip"
                type="text"
                value={discoverZip}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 5)
                  setDiscoverZip(value)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="48201"
                maxLength={5}
                required
                disabled={discovering}
              />
            </div>
            <div className="w-32">
              <label htmlFor="discoverRadius" className="block text-sm font-medium text-gray-700 mb-2">
                Radius (miles)
              </label>
              <select
                id="discoverRadius"
                value={discoverRadius}
                onChange={(e) => setDiscoverRadius(Number(e.target.value) as 5 | 10 | 25)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                disabled={discovering}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={discovering || !discoverZip || discoverZip.length !== 5}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {discovering ? 'Discovering...' : 'Discover'}
            </button>
          </div>
          {discoverResult && (
            <div
              className={`p-3 rounded-lg ${
                discoverResult.success
                  ? 'bg-green-50 text-green-800'
                  : 'bg-red-50 text-red-800'
              }`}
            >
              {discoverResult.message}
            </div>
          )}
        </form>
      </div>

      {showAddModal && (
        <AddDispensaryModal
          onClose={() => {
            setShowAddModal(false)
            fetchDispensaries()
          }}
        />
      )}

      {editing && (
        <EditDispensaryModal
          dispensary={editing}
          onClose={() => {
            setEditing(null)
            fetchDispensaries()
          }}
        />
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Success Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Recent Deals
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {dispensaries.map((disp) => (
              <tr key={disp.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{disp.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-600">
                    {disp.city || 'N/A'}
                    {disp.zip && `, ${disp.zip}`}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-600">
                    {disp.ingestion_success_rate !== null
                      ? `${(disp.ingestion_success_rate * 100).toFixed(0)}%`
                      : 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-600">{disp.recent_deals_count || 0}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      disp.active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {disp.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => setEditing(disp)}
                    className="text-lake-blue-600 hover:text-lake-blue-900 mr-4"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(disp.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Deactivate
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AddDispensaryModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    zip: '',
    flyer_url: '',
    weedmaps_url: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const res = await fetch('/api/admin/dispensaries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: formData.name,
          city: formData.city || undefined,
          zip: formData.zip || undefined,
          flyer_url: formData.flyer_url || undefined,
          weedmaps_url: formData.weedmaps_url || undefined,
          active: true,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add dispensary')
      }

      onClose()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add dispensary')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-4">Add Dispensary</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
            <input
              type="text"
              value={formData.zip}
              onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Flyer URL</label>
            <input
              type="url"
              value={formData.flyer_url}
              onChange={(e) => setFormData({ ...formData, flyer_url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Weedmaps URL</label>
            <input
              type="url"
              value={formData.weedmaps_url}
              onChange={(e) => setFormData({ ...formData, weedmaps_url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-lake-blue-700 text-white rounded-lg hover:bg-lake-blue-800 disabled:opacity-50"
            >
              {submitting ? 'Adding...' : 'Add'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EditDispensaryModal({ dispensary, onClose }: { dispensary: Dispensary; onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: dispensary.name,
    city: dispensary.city || '',
    zip: dispensary.zip || '',
    flyer_url: dispensary.flyer_url || '',
    weedmaps_url: dispensary.weedmaps_url || '',
    active: dispensary.active,
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const res = await fetch('/api/admin/dispensaries', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          id: dispensary.id,
          ...formData,
          city: formData.city || undefined,
          zip: formData.zip || undefined,
          flyer_url: formData.flyer_url || undefined,
          weedmaps_url: formData.weedmaps_url || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update dispensary')
      }

      onClose()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update dispensary')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-4">Edit Dispensary</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
            <input
              type="text"
              value={formData.zip}
              onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Flyer URL</label>
            <input
              type="url"
              value={formData.flyer_url}
              onChange={(e) => setFormData({ ...formData, flyer_url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Weedmaps URL</label>
            <input
              type="url"
              value={formData.weedmaps_url}
              onChange={(e) => setFormData({ ...formData, weedmaps_url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Active</span>
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-lake-blue-700 text-white rounded-lg hover:bg-lake-blue-800 disabled:opacity-50"
            >
              {submitting ? 'Updating...' : 'Update'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
