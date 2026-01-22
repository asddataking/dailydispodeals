'use client'

import { useState, useEffect } from 'react'

interface Stats {
  users: { total: number }
  subscriptions: { total: number; active: number }
  deals: { total: number; by_category: Record<string, number> }
  dispensaries: { active: number; stats: any[] }
  emails: { sent: number; failed: number; success_rate: string }
  reviews: { pending: number }
  ingestion: {
    flyers_processed: number
    deals_extracted: number
    avg_deals_per_flyer: string
  }
}

export function StatsDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [days, setDays] = useState(30)

  useEffect(() => {
    fetchStats()
  }, [days])

  const fetchStats = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/stats?days=${days}`)
      if (!res.ok) {
        throw new Error('Failed to fetch stats')
      }
      const data = await res.json()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load statistics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-gray-600">Loading statistics...</div>
  }

  if (error) {
    return <div className="text-red-600">{error}</div>
  }

  if (!stats) {
    return <div className="text-gray-600">No statistics available</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Statistics</h2>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={stats.users.total} />
        <StatCard title="Active Subscriptions" value={stats.subscriptions.active} />
        <StatCard title="Total Deals" value={stats.deals.total} />
        <StatCard title="Active Dispensaries" value={stats.dispensaries.active} />
        <StatCard title="Emails Sent" value={stats.emails.sent} />
        <StatCard title="Email Success Rate" value={`${stats.emails.success_rate}%`} />
        <StatCard title="Pending Reviews" value={stats.reviews.pending} />
        <StatCard title="Flyers Processed" value={stats.ingestion.flyers_processed} />
      </div>

      {/* Deals by Category */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Deals by Category</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(stats.deals.by_category).map(([category, count]) => (
            <div key={category} className="flex justify-between items-center">
              <span className="text-gray-600 capitalize">{category}</span>
              <span className="font-semibold text-gray-900">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Ingestion Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ingestion Statistics</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Total Deals Extracted</span>
            <span className="font-semibold">{stats.ingestion.deals_extracted}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Average Deals per Flyer</span>
            <span className="font-semibold">{stats.ingestion.avg_deals_per_flyer}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="text-sm text-gray-600 mb-1">{title}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  )
}
