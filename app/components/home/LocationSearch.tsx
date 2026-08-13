'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { POPULAR_CITIES, cityName, matchCityQuery } from '@/lib/cities'

export function LocationSearch({ autoFocus = false }: { autoFocus?: boolean }) {
  const [q, setQ] = useState('')
  const router = useRouter()

  const go = (e?: React.FormEvent) => {
    e?.preventDefault()
    const value = q.trim()
    if (!value) {
      router.push('/deals')
      return
    }
    const city = matchCityQuery(value)
    if (city) {
      router.push(`/michigan/${city.slug}`)
      return
    }
    router.push(`/deals?q=${encodeURIComponent(value)}`)
  }

  return (
    <div>
      <form onSubmit={go} className="flex flex-col gap-3 sm:flex-row">
        <input
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Enter City or ZIP Code"
          className="w-full border-[3px] border-cream bg-ink px-4 py-3 text-cream placeholder:text-cream/40 focus:border-mint focus:outline-none"
        />
        <button type="submit" className="btn-primary whitespace-nowrap">
          Find Deals →
        </button>
      </form>
      <p className="mt-4 font-display text-xs uppercase tracking-widest text-cream/50">Popular Cities</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {POPULAR_CITIES.map((slug) => (
          <Link
            key={slug}
            href={`/michigan/${slug}`}
            className="border-[2px] border-cream/30 px-3 py-1 font-display text-xs uppercase tracking-wide text-cream hover:border-mint hover:text-mint"
          >
            {cityName(slug)}
          </Link>
        ))}
      </div>
      <Link href="/michigan" className="mt-3 inline-block text-sm text-mint hover:text-cream">
        Browse All Michigan Deals →
      </Link>
    </div>
  )
}
