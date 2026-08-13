import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { DealCard } from '@/app/components/deals/DealCard'
import { FAQ } from '@/app/components/FAQ'
import { CURATED_CITIES, cityName, getCity } from '@/lib/cities'
import { DEAL_CATEGORIES } from '@/lib/categories'
import { getActiveDeals, toDealCard } from '@/lib/deals'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export function generateStaticParams() {
  return CURATED_CITIES.map((c) => ({ city: c.slug }))
}

export async function generateMetadata({ params }: { params: { city: string } }): Promise<Metadata> {
  const city = getCity(params.city)
  const name = city?.name || cityName(params.city)
  return {
    title: `Cannabis Deals in ${name}, Michigan | Daily Dispo Deals`,
    description: city?.intro || `Current dispensary deals in ${name}, MI. Submitted by shops. Free to browse.`,
    alternates: { canonical: `https://dailydispodeals.com/michigan/${params.city}` },
  }
}

export default async function CityPage({ params }: { params: { city: string } }) {
  const city = getCity(params.city)
  if (!city) notFound()

  const [deals, featured] = await Promise.all([
    getActiveDeals({ city: city.name, limit: 40 }),
    getActiveDeals({ city: city.name, featured: true, limit: 3 }),
  ])

  const cards = deals.map(toDealCard)
  const featuredCards = featured.map(toDealCard)
  const dispensaryNames = Array.from(new Set(deals.map((d) => d.dispensaries?.name || d.dispensary_name)))

  let sponsorName: string | null = null
  try {
    const { data } = await supabaseAdmin
      .from('sponsored_placements')
      .select('notes, dispensaries(name)')
      .eq('type', 'city_sponsor')
      .eq('city_slug', city.slug)
      .eq('active', true)
      .maybeSingle()
    sponsorName = (data as { dispensaries?: { name?: string } } | null)?.dispensaries?.name || null
  } catch {
    sponsorName = null
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <p className="section-kicker">{city.state}</p>
      <h1 className="font-display text-5xl uppercase leading-none text-cream sm:text-7xl">
        {city.name} Deals
      </h1>
      {sponsorName && (
        <p className="mt-3 font-marker text-gold">
          {city.name} Deals — Presented by {sponsorName}
        </p>
      )}
      <p className="mt-4 max-w-2xl text-cream/75">{city.intro}</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {DEAL_CATEGORIES.map((cat) => (
          <Link
            key={cat.slug}
            href={`/deals/${cat.slug}`}
            className="border-[2px] border-cream/30 px-3 py-1 font-display text-xs uppercase text-cream hover:border-mint"
          >
            {cat.label}
          </Link>
        ))}
      </div>

      {featuredCards.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-3xl uppercase text-cream">Featured Deal</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {featuredCards.map((deal) => (
              <DealCard key={deal.id} deal={deal} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-12">
        <h2 className="font-display text-3xl uppercase text-cream">Today&apos;s Deals</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.length ? (
            cards.map((deal) => <DealCard key={deal.id} deal={deal} />)
          ) : (
            <p className="text-cream/60">
              No live {city.name} deals yet.{' '}
              <Link href="/submit" className="text-mint">
                Submit a deal →
              </Link>
            </p>
          )}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-3xl uppercase text-cream">Dispensaries With Active Deals</h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {dispensaryNames.length ? (
            dispensaryNames.map((name) => (
              <li key={name} className="border-[2px] border-cream/20 px-3 py-1 text-sm text-cream">
                {name}
              </li>
            ))
          ) : (
            <li className="text-cream/50">None yet — be first.</li>
          )}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-3xl uppercase text-cream">Nearby Cities</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {city.nearby.map((slug) => (
            <Link key={slug} href={`/michigan/${slug}`} className="btn-ghost !py-2 !text-sm">
              {cityName(slug)}
            </Link>
          ))}
        </div>
      </section>

      <FAQ items={city.faq} />
    </div>
  )
}
