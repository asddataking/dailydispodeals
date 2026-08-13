'use client'

import { useEffect, useState } from 'react'
import { useAdminAuth, getAuthHeaders } from '@/lib/hooks/useAdminAuth'

type Product = {
  id: string
  name: string
  blurb: string
  category_slug: string
  url: string
  discount: string | null
}

export function AffiliateManager() {
  const { token } = useAdminAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [form, setForm] = useState({ name: '', blurb: '', category_slug: 'storage', url: '', discount: '' })

  const load = async () => {
    const res = await fetch('/api/admin/affiliates', { headers: getAuthHeaders(token) })
    const json = await res.json()
    setProducts(json.data?.products || [])
  }

  useEffect(() => {
    if (token) load()
  }, [token])

  return (
    <div className="space-y-6">
      <form
        className="grid gap-2 rounded border bg-white p-4 md:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault()
          await fetch('/api/admin/affiliates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
            body: JSON.stringify(form),
          })
          setForm({ name: '', blurb: '', category_slug: 'storage', url: '', discount: '' })
          load()
        }}
      >
        <input className="border p-2" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input className="border p-2" placeholder="URL" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} required />
        <input className="border p-2 md:col-span-2" placeholder="Blurb" value={form.blurb} onChange={(e) => setForm({ ...form, blurb: e.target.value })} />
        <select className="border p-2" value={form.category_slug} onChange={(e) => setForm({ ...form, category_slug: e.target.value })}>
          {['storage', 'grinders', 'humidity-control', 'smell-proof-storage', 'cleaning', 'grow'].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input className="border p-2" placeholder="Discount" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
        <button className="rounded bg-gray-900 px-4 py-2 text-white md:col-span-2">Add product</button>
      </form>
      <ul className="divide-y rounded border bg-white">
        {products.map((p) => (
          <li key={p.id} className="flex items-center justify-between p-3">
            <div>
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-gray-500">{p.category_slug} · {p.url}</div>
            </div>
            <button
              className="text-red-600 text-sm"
              onClick={() =>
                fetch('/api/admin/affiliates', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
                  body: JSON.stringify({ ...p, delete: true }),
                }).then(load)
              }
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
