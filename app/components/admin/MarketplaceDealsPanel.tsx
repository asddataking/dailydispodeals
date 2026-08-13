'use client'

import { useEffect, useState } from 'react'
import { useAdminAuth, getAuthHeaders } from '@/lib/hooks/useAdminAuth'

type DealRow = {
  id: string
  title: string
  dispensary_name: string
  city: string | null
  category: string
  status: string
  featured: boolean
  sponsored: boolean
  end_date: string | null
  slug: string
  submission_source: string | null
}

export function MarketplaceDealsPanel() {
  const { token } = useAdminAuth()
  const [deals, setDeals] = useState<DealRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/deals/manage', { headers: getAuthHeaders(token) })
    const json = await res.json()
    setDeals(json.data?.deals || [])
    setLoading(false)
  }

  useEffect(() => {
    if (token) load()
  }, [token])

  const act = async (deal_id: string, action: string) => {
    await fetch('/api/admin/deals/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
      body: JSON.stringify({ deal_id, action }),
    })
    load()
  }

  if (loading) return <p>Loading listings…</p>

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500">
            <th className="p-2">Deal</th>
            <th className="p-2">Shop</th>
            <th className="p-2">Status</th>
            <th className="p-2">Ends</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {deals.map((deal) => (
            <tr key={deal.id} className="border-t">
              <td className="p-2">
                <div className="font-medium">{deal.title}</div>
                <div className="text-xs text-gray-500">
                  {deal.category} {deal.featured ? '· FEATURED' : ''} {deal.sponsored ? '· SPONSORED' : ''}
                </div>
              </td>
              <td className="p-2">
                {deal.dispensary_name}
                <div className="text-xs text-gray-500">{deal.city}</div>
              </td>
              <td className="p-2">{deal.status}</td>
              <td className="p-2">{deal.end_date}</td>
              <td className="p-2 space-x-1">
                {deal.status === 'pending' && (
                  <>
                    <button className="rounded bg-green-600 px-2 py-1 text-white" onClick={() => act(deal.id, 'approve')}>
                      Approve
                    </button>
                    <button className="rounded bg-red-600 px-2 py-1 text-white" onClick={() => act(deal.id, 'reject')}>
                      Reject
                    </button>
                  </>
                )}
                {deal.status === 'approved' && (
                  <>
                    <button className="rounded bg-gray-800 px-2 py-1 text-white" onClick={() => act(deal.id, deal.featured ? 'unfeature' : 'feature')}>
                      {deal.featured ? 'Unfeature' : 'Feature'}
                    </button>
                    <button className="rounded bg-amber-600 px-2 py-1 text-white" onClick={() => act(deal.id, deal.sponsored ? 'unsponsor' : 'sponsor')}>
                      {deal.sponsored ? 'Unsponsor' : 'Sponsor'}
                    </button>
                    <button className="rounded bg-gray-500 px-2 py-1 text-white" onClick={() => act(deal.id, 'expire')}>
                      Expire
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!deals.length && <p className="p-4 text-gray-500">No marketplace listings yet.</p>}
    </div>
  )
}
