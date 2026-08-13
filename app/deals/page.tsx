import Link from 'next/link'
import { DealCard } from '@/app/components/deals/DealCard'
import { LocationSearch } from '@/app/components/home/LocationSearch'
import { DEAL_CATEGORIES } from '@/lib/categories'
import { getActiveDeals, toDealCard } from '@/lib/deals'
import { SAMPLE_DEALS } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function DealsPage({
  searchParams,
}: {
  searchParams: { q?: string; near?: string }
}) {
  const deals = await getActiveDeals({ search: searchParams.q, limit: 60 })
  const cards = deals.length ? deals.map(toDealCard) : SAMPLE_DEALS

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <p className="section-kicker">Michigan</p>
      <h1 className="font-display text-5xl uppercase leading-none text-cream sm:text-7xl">Today&apos;s Deals</h1>
      <p className="mt-3 max-w-xl text-cream/70">
        Current dispensary specials submitted by shops. Expired deals are pulled automatically.
      </p>
      <div className="mt-8 max-w-xl">
        <LocationSearch />
      </div>
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
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((deal) => (
          <DealCard key={deal.id} deal={deal} />
        ))}
      </div>
    </div>
  )
}
