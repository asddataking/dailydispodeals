'use client'

import { useState } from 'react'
import { DEAL_CATEGORIES } from '@/lib/categories'

type Mode = 'manual' | 'flyer'

export function SubmitDealForm() {
  const [mode, setMode] = useState<Mode>('manual')
  const [status, setStatus] = useState<'idle' | 'parsing' | 'saving' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    dispensary_name: '',
    city: '',
    title: '',
    category: 'flower',
    brand: '',
    description: '',
    regular_price: '',
    deal_price: '',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: '',
    menu_url: '',
    contact_email: '',
    image: '',
  })

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const parseFlyer = async (file: File) => {
    setStatus('parsing')
    setMessage('Reading flyer… you can still edit everything before submit.')
    const body = new FormData()
    body.append('file', file)
    body.append('dispensary_name', form.dispensary_name)
    body.append('city', form.city)
    try {
      const res = await fetch('/api/submit/parse-flyer', { method: 'POST', body })
      const json = await res.json()
      const deal = json.data?.deal || json.deal
      if (deal) {
        setForm((f) => ({
          ...f,
          title: deal.title || f.title,
          category: deal.category || f.category,
          brand: deal.brand || f.brand,
          description: deal.product_name || deal.description || f.description,
          deal_price: deal.price_text || f.deal_price,
          image: json.data?.image_url || json.image_url || f.image,
        }))
        setMessage('Suggested fields from the flyer. Review before publishing.')
      } else {
        setMessage('Could not extract text. Fill the form manually — the flyer is still attached.')
      }
      setStatus('idle')
    } catch {
      setStatus('error')
      setMessage('Flyer upload failed. Enter the deal manually.')
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.end_date) {
      setStatus('error')
      setMessage('Every deal needs an expiration date.')
      return
    }
    setStatus('saving')
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok || json.success === false) throw new Error(json.error || 'Submit failed')
      setStatus('done')
      setMessage('We’ll review it and go live shortly.')
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Submit failed')
    }
  }

  if (status === 'done') {
    return (
      <div className="panel p-8">
        <p className="font-display text-4xl uppercase text-mint">Submitted.</p>
        <p className="mt-3 text-cream/80">{message}</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="panel p-6 sm:p-8">
      <div className="mb-6 flex gap-2">
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={mode === 'manual' ? 'btn-primary !py-2 !text-sm' : 'btn-ghost !py-2 !text-sm'}
        >
          Enter Deal Manually
        </button>
        <button
          type="button"
          onClick={() => setMode('flyer')}
          className={mode === 'flyer' ? 'btn-primary !py-2 !text-sm' : 'btn-ghost !py-2 !text-sm'}
        >
          Upload Deal Flyer
        </button>
      </div>

      {mode === 'flyer' && (
        <label className="mb-6 block border-[3px] border-dashed border-mint/50 p-6 text-sm text-cream/70">
          Upload the graphic you already use on social.
          <input
            type="file"
            accept="image/*,application/pdf"
            className="mt-3 block w-full text-cream"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) parseFlyer(file)
            }}
          />
        </label>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Dispensary Name" required value={form.dispensary_name} onChange={(v) => set('dispensary_name', v)} />
        <Field label="Location" required value={form.city} onChange={(v) => set('city', v)} placeholder="Port Huron, MI" />
        <Field label="Deal Title" required value={form.title} onChange={(v) => set('title', v)} placeholder="30% OFF All Flower" />
        <label className="block">
          <span className="mb-1 block font-display text-xs uppercase tracking-widest text-cream/50">Category</span>
          <select
            value={form.category}
            onChange={(e) => set('category', e.target.value)}
            className="w-full border-[3px] border-cream/30 bg-ink px-3 py-2 text-cream"
          >
            {DEAL_CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <Field label="Brand — optional" value={form.brand} onChange={(v) => set('brand', v)} />
        <Field label="Description" value={form.description} onChange={(v) => set('description', v)} placeholder="All Flower" />
        <Field label="Regular Price — optional" value={form.regular_price} onChange={(v) => set('regular_price', v)} />
        <Field label="Deal Price — optional" value={form.deal_price} onChange={(v) => set('deal_price', v)} placeholder="$99 / 30% OFF" />
        <Field label="Start Date" type="date" value={form.start_date} onChange={(v) => set('start_date', v)} />
        <Field label="End Date" type="date" required value={form.end_date} onChange={(v) => set('end_date', v)} />
        <Field label="Menu URL" required value={form.menu_url} onChange={(v) => set('menu_url', v)} placeholder="https://" />
        <Field label="Contact email — optional" type="email" value={form.contact_email} onChange={(v) => set('contact_email', v)} />
      </div>
      <button type="submit" disabled={status === 'saving' || status === 'parsing'} className="btn-coral mt-6 w-full">
        {status === 'saving' ? 'Submitting…' : "Submit Today's Deal →"}
      </button>
      {message && <p className={`mt-3 text-sm ${status === 'error' ? 'text-coral' : 'text-mint'}`}>{message}</p>}
      <p className="mt-4 text-xs text-cream/50">No contracts. No commission. No account required.</p>
    </form>
  )
}

function Field({
  label,
  value,
  onChange,
  required,
  type = 'text',
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  type?: string
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-display text-xs uppercase tracking-widest text-cream/50">{label}</span>
      <input
        required={required}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border-[3px] border-cream/30 bg-ink px-3 py-2 text-cream"
      />
    </label>
  )
}
