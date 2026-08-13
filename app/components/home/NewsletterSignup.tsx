'use client'

import { useState } from 'react'
import { NEWSLETTER_CATEGORIES } from '@/lib/categories'

export function NewsletterSignup() {
  const [email, setEmail] = useState('')
  const [zip, setZip] = useState('')
  const [cats, setCats] = useState<string[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const toggle = (slug: string) => {
    setCats((prev) => (prev.includes(slug) ? prev.filter((c) => c !== slug) : [...prev, slug]))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setMessage('')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, zip, categories: cats }),
      })
      const data = await res.json()
      if (!res.ok || data.success === false) throw new Error(data.error || 'Could not subscribe')
      setStatus('done')
      setMessage('You are on the list. Watch your inbox.')
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <div className="border-[3px] border-mint bg-ink-2 p-8 sm:p-12">
        <h2 className="font-display text-4xl uppercase leading-none text-cream sm:text-6xl">
          Never miss a good deal.
        </h2>
        <p className="mt-3 max-w-xl text-cream/75">
          Get worthwhile cannabis deals in your area sent straight to your inbox. Free. No payment.
        </p>
        <form onSubmit={submit} className="mt-8 grid gap-4 md:grid-cols-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="border-[3px] border-cream/30 bg-ink px-4 py-3 text-cream"
          />
          <input
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            placeholder="ZIP Code"
            required
            className="border-[3px] border-cream/30 bg-ink px-4 py-3 text-cream"
          />
          <div className="md:col-span-2">
            <p className="mb-2 font-display text-xs uppercase tracking-widest text-cream/50">Optional preferences</p>
            <div className="flex flex-wrap gap-2">
              {NEWSLETTER_CATEGORIES.map((cat) => (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => toggle(cat.slug)}
                  className={`border-[2px] px-3 py-1 font-display text-xs uppercase ${
                    cats.includes(cat.slug) ? 'border-mint bg-mint text-ink' : 'border-cream/30 text-cream'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={status === 'loading'} className="btn-primary md:col-span-2">
            {status === 'loading' ? 'Sending…' : 'Send Me the Deals'}
          </button>
        </form>
        {message && <p className={`mt-4 ${status === 'error' ? 'text-coral' : 'text-mint'}`}>{message}</p>}
      </div>
    </section>
  )
}
