'use client'

import { useState } from 'react'

export function ContactForm() {
  const [status, setStatus] = useState('')
  const [form, setForm] = useState({ name: '', email: '', message: '' })

  return (
    <form
      className="mt-8 grid gap-4"
      onSubmit={async (e) => {
        e.preventDefault()
        const res = await fetch('/api/advertise', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, interest: 'contact', business: form.name }),
        })
        setStatus(res.ok ? 'Sent.' : 'Could not send.')
      }}
    >
      <input className="border-[3px] border-cream/30 bg-ink px-3 py-2" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <input required type="email" className="border-[3px] border-cream/30 bg-ink px-3 py-2" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <textarea required className="border-[3px] border-cream/30 bg-ink px-3 py-2" rows={5} placeholder="Message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
      <button className="btn-primary">Send</button>
      {status && <p className="text-mint">{status}</p>}
    </form>
  )
}
