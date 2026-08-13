'use client'

import { useEffect, useState } from 'react'
import { useAdminAuth, getAuthHeaders } from '@/lib/hooks/useAdminAuth'

type Row = { deal_id: string; title: string; views: number; clicks: number; ctr: number }

export function ClickStats() {
  const { token } = useAdminAuth()
  const [rows, setRows] = useState<Row[]>([])

  useEffect(() => {
    if (!token) return
    fetch('/api/admin/clicks', { headers: getAuthHeaders(token) })
      .then((r) => r.json())
      .then((j) => setRows(j.data?.stats || []))
  }, [token])

  return (
    <table className="min-w-full text-sm">
      <thead>
        <tr className="text-left text-gray-500">
          <th className="p-2">Deal</th>
          <th className="p-2">Views</th>
          <th className="p-2">Clicks</th>
          <th className="p-2">CTR %</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.deal_id} className="border-t">
            <td className="p-2">{row.title}</td>
            <td className="p-2">{row.views}</td>
            <td className="p-2">{row.clicks}</td>
            <td className="p-2">{row.ctr}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
