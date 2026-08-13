import Link from 'next/link'
import type { Metadata } from 'next'
import { CURATED_CITIES, POPULAR_CITIES } from '@/lib/cities'
import { getActiveDeals } from '@/lib/deals'

export const metadata: Metadata = {
  title: 'Michigan Cannabis Deals | Daily Dispo Deals',
  description: 'Browse today’s dispensary deals across Michigan. Free for shoppers. Submitted by dispensaries.',
}

export const dynamic = 'force-dynamic'

export default async function MichiganPage() {
  const deals = await getActiveDeals({ limit: 200 })
  const countByCity = new Map<string, number>()
  for (const deal of deals) {
    const key = (deal.city || '').toLowerCase()
    if (!key) continue
    countByCity.set(key, (countByCity.get(key) || 0) + 1)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <p className="section-kicker">Statewide</p>
      <h1 className="font-display text-5xl uppercase leading-none text-cream sm:text-7xl">Michigan Deals</h1>
      <p className="mt-4 max-w-2xl text-cream/75">
        Curated city pages with live submitted specials — not hundreds of thin duplicate landers.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CURATED_CITIES.map((city) => (
          <Link key={city.slug} href={`/michigan/${city.slug}`} className="panel p-6 hover:border-mint">
            {POPULAR_CITIES.includes(city.slug as (typeof POPULAR_CITIES)[number]) && (
              <span className="sticker mb-3">Popular</span>
            )}
            <h2 className="font-display text-3xl uppercase text-cream">{city.name}</h2>
            <p className="mt-2 line-clamp-3 text-sm text-cream/70">{city.intro}</p>
            <p className="mt-4 font-display text-xs uppercase text-mint">
              {countByCity.get(city.name.toLowerCase()) || 0} live deals
            </p>
          </Link>
        ))}
      </div>
      <Link href="/deals" className="btn-primary mt-10">
        Browse All Michigan Deals →
      </Link>
    </div>
  )
}
