'use client'

import { useState, useEffect } from 'react'

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

  useEffect(() => {
    fetchDispensaries()
  }, [])

  const fetchDispensaries = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/dispensaries')
      if (!res.ok) {
        throw new Error('Failed to fetch dispensaries')
      }
      const data = await res.json()
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
      const res = await fetch(`/api/admin/dispensaries?id=${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to deactivate dispensary')
      }

      fetchDispensaries()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to deactivate dispensary')
    }
  }

  if (loading) {
    return <div className="text-gray-600">Loading dispensaries...</div>
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
      const res = await fetch('/api/admin/dispensaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch('/api/admin/dispensaries', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
