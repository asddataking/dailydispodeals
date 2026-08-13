'use client'

import { useState } from 'react'

export function ClaimForm({ slug }: { slug: string }) {
  const [email, setEmail] = useState('')
  const [proof, setProof] = useState('')
  const [status, setStatus] = useState('')

  return (
    <section className="mt-12 border-t border-cream/10 pt-8">
      <p className="font-display text-sm uppercase text-cream/70">Are you this dispensary? Claim this profile.</p>
      <form
        className="mt-4 grid gap-3 md:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault()
          const res = await fetch('/api/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slug, email, proof }),
          })
          setStatus(res.ok ? 'Claim received. We will follow up.' : 'Could not send claim.')
        }}
      >
        <input
          type="email"
          required
          placeholder="Work email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border-[3px] border-cream/30 bg-ink px-3 py-2 text-cream"
        />
        <input
          placeholder="Website or menu URL as proof"
          value={proof}
          onChange={(e) => setProof(e.target.value)}
          className="border-[3px] border-cream/30 bg-ink px-3 py-2 text-cream"
        />
        <button type="submit" className="btn-ghost !py-2 !text-sm md:col-span-2">
          Claim this profile
        </button>
      </form>
      {status && <p className="mt-2 text-sm text-mint">{status}</p>}
    </section>
  )
}
