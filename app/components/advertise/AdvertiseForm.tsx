'use client'

import { useState } from 'react'
import type { SiteSettings } from '@/lib/types'

export function AdvertiseForm() {
  const [status, setStatus] = useState('')
  const [form, setForm] = useState({ name: '', email: '', business: '', interest: 'featured_deal', message: '' })

  return (
    <form
      className="mt-8 grid gap-4"
      onSubmit={async (e) => {
        e.preventDefault()
        const res = await fetch('/api/advertise', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        setStatus(res.ok ? 'Got it. We will follow up.' : 'Could not send. Email us instead.')
      }}
    >
      <input className="border-[3px] border-cream/30 bg-ink px-3 py-2" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <input required type="email" className="border-[3px] border-cream/30 bg-ink px-3 py-2" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <input className="border-[3px] border-cream/30 bg-ink px-3 py-2" placeholder="Dispensary or brand" value={form.business} onChange={(e) => setForm({ ...form, business: e.target.value })} />
      <select className="border-[3px] border-cream/30 bg-ink px-3 py-2" value={form.interest} onChange={(e) => setForm({ ...form, interest: e.target.value })}>
        <option value="featured_deal">Featured Deal</option>
        <option value="featured_dispensary">Featured Dispensary</option>
        <option value="city_sponsor">City Sponsor</option>
        <option value="brand">Brand partnership</option>
      </select>
      <textarea className="border-[3px] border-cream/30 bg-ink px-3 py-2" rows={4} placeholder="What do you want to promote?" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
      <button className="btn-primary">Get Featured →</button>
      {status && <p className="text-mint">{status}</p>}
    </form>
  )
}

export function AdvertiseTiers({ settings }: { settings: SiteSettings }) {
  return (
    <div className="mt-8 grid gap-4 md:grid-cols-3">
      <div className="panel p-6">
        <h2 className="font-display text-2xl uppercase">Featured Deal</h2>
        <p className="mt-2 text-sm text-cream/70">Pin a promotion above standard listings.</p>
        <p className="mt-4 font-display text-3xl text-mint">${settings.featured_deal_per_day}/day</p>
      </div>
      <div className="panel p-6">
        <h2 className="font-display text-2xl uppercase">Featured Dispensary</h2>
        <p className="mt-2 text-sm text-cream/70">Highlighted profile + featured deals.</p>
        <p className="mt-4 font-display text-3xl text-mint">${settings.featured_dispensary_per_month}/month</p>
      </div>
      <div className="panel p-6">
        <h2 className="font-display text-2xl uppercase">City Sponsor</h2>
        <p className="mt-2 text-sm text-cream/70">Primary sponsor of a local city page. Example: Port Huron Deals — Presented by [Dispensary].</p>
        <p className="mt-4 font-display text-3xl text-mint">${settings.city_sponsor_per_month}/mo</p>
      </div>
    </div>
  )
}
