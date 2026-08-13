import { DealCard } from '@/app/components/deals/DealCard'
import { getActiveDeals, toDealCard } from '@/lib/deals'
import { slugify } from '@/lib/slugs'

export const dynamic = 'force-dynamic'

export default async function BrandPage({ params }: { params: { slug: string } }) {
  const deals = await getActiveDeals({ limit: 80 })
  const matched = deals.filter((d) => d.brand && slugify(d.brand) === params.slug)
  const name = matched[0]?.brand || params.slug.replace(/-/g, ' ')

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="section-kicker">Brand</p>
      <h1 className="font-display text-5xl uppercase text-cream">{name}</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {matched.length ? (
          matched.map((d) => <DealCard key={d.id} deal={toDealCard(d)} />)
        ) : (
          <p className="text-cream/60">No live deals for this brand right now.</p>
        )}
      </div>
    </div>
  )
}
