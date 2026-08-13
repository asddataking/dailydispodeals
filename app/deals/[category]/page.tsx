import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { DealCard } from '@/app/components/deals/DealCard'
import { DEAL_CATEGORIES, categoryLabel, isDealCategory } from '@/lib/categories'
import { getActiveDeals, toDealCard } from '@/lib/deals'

export const dynamic = 'force-dynamic'

export function generateStaticParams() {
  return DEAL_CATEGORIES.map((c) => ({ category: c.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: { category: string }
}): Promise<Metadata> {
  const label = categoryLabel(params.category)
  return {
    title: `${label} Deals in Michigan | Daily Dispo Deals`,
    description: `Current ${label.toLowerCase()} dispensary deals across Michigan. Submitted by shops, free to browse.`,
  }
}

export default async function CategoryDealsPage({ params }: { params: { category: string } }) {
  if (!isDealCategory(params.category)) notFound()
  const deals = await getActiveDeals({ category: params.category, limit: 60 })
  const cards = deals.map(toDealCard)
  const label = categoryLabel(params.category)

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <p className="section-kicker">Category</p>
      <h1 className="font-display text-5xl uppercase text-cream">{label} Deals</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        {DEAL_CATEGORIES.map((cat) => (
          <Link
            key={cat.slug}
            href={`/deals/${cat.slug}`}
            className={`border-[2px] px-3 py-1 font-display text-xs uppercase ${
              cat.slug === params.category ? 'border-mint bg-mint text-ink' : 'border-cream/30 text-cream'
            }`}
          >
            {cat.label}
          </Link>
        ))}
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.length ? (
          cards.map((deal) => <DealCard key={deal.id} deal={deal} />)
        ) : (
          <p className="text-cream/60">No live {label.toLowerCase()} deals yet. Check back today or submit one.</p>
        )}
      </div>
    </div>
  )
}
