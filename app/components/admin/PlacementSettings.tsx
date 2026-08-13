'use client'

import { useEffect, useState } from 'react'
import { useAdminAuth, getAuthHeaders } from '@/lib/hooks/useAdminAuth'
import { DEFAULT_SITE_SETTINGS, type SiteSettings } from '@/lib/types'

export function PlacementSettings() {
  const { token } = useAdminAuth()
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS)
  const [saved, setSaved] = useState('')

  useEffect(() => {
    if (!token) return
    fetch('/api/admin/settings', { headers: getAuthHeaders(token) })
      .then((r) => r.json())
      .then((j) => setSettings(j.data?.settings || DEFAULT_SITE_SETTINGS))
  }, [token])

  return (
    <form
      className="max-w-md space-y-3 rounded border bg-white p-4"
      onSubmit={async (e) => {
        e.preventDefault()
        await fetch('/api/admin/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
          body: JSON.stringify(settings),
        })
        setSaved('Saved')
      }}
    >
      <label className="block text-sm">
        Featured deal / day
        <input
          type="number"
          className="mt-1 w-full border p-2"
          value={settings.featured_deal_per_day}
          onChange={(e) => setSettings({ ...settings, featured_deal_per_day: Number(e.target.value) })}
        />
      </label>
      <label className="block text-sm">
        Featured dispensary / month
        <input
          type="number"
          className="mt-1 w-full border p-2"
          value={settings.featured_dispensary_per_month}
          onChange={(e) => setSettings({ ...settings, featured_dispensary_per_month: Number(e.target.value) })}
        />
      </label>
      <label className="block text-sm">
        City sponsor / month
        <input
          type="number"
          className="mt-1 w-full border p-2"
          value={settings.city_sponsor_per_month}
          onChange={(e) => setSettings({ ...settings, city_sponsor_per_month: Number(e.target.value) })}
        />
      </label>
      <button className="rounded bg-gray-900 px-4 py-2 text-white">Save prices</button>
      {saved && <p className="text-sm text-green-700">{saved}</p>}
    </form>
  )
}
