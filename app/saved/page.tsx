'use client'

import { useEffect, useState } from 'react'
import { DealCard } from '@/app/components/deals/DealCard'
import { getSavedIds } from '@/lib/saved-deals'
import { SAMPLE_DEALS } from '@/lib/types'
import type { DealCardData } from '@/lib/types'

export default function SavedPage() {
  const [deals, setDeals] = useState<DealCardData[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const ids = getSavedIds()
    const samples = SAMPLE_DEALS.filter((d) => ids.includes(d.id))
    if (!ids.length) {
      setDeals([])
      setReady(true)
      return
    }
    fetch('/api/deals/by-ids', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
      .then((r) => r.json())
      .then((j) => {
        const live = (j.data?.deals || []) as DealCardData[]
        setDeals([...live, ...samples.filter((s) => !live.some((l) => l.id === s.id))])
      })
      .finally(() => setReady(true))
  }, [])

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-5xl uppercase text-cream">Saved</h1>
      <p className="mt-3 text-cream/70">Stored on this device. No account required.</p>
      {!ready && <p className="mt-8 text-cream/50">Loading…</p>}
      {ready && !deals.length && <p className="mt-8 text-cream/60">Nothing saved yet. Tap SAVE on a deal card.</p>}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} />
        ))}
      </div>
    </div>
  )
}
