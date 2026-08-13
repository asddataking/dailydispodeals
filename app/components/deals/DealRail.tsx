import Link from 'next/link'
import { DealCard } from './DealCard'
import type { DealCardData } from '@/lib/types'

export function DealRail({
  title,
  deals,
  href = '/deals',
  kicker = "🔥 Today's Hottest Deals",
}: {
  title?: string
  kicker?: string
  deals: DealCardData[]
  href?: string
}) {
  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="section-kicker">{kicker}</p>
            {title && (
              <h2 className="mt-1 font-display text-3xl uppercase leading-none text-cream sm:text-5xl">{title}</h2>
            )}
          </div>
          <Link href={href} className="hidden font-display text-sm uppercase tracking-wide text-mint sm:inline">
            View All Deals →
          </Link>
        </div>
        <div className="hide-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-2">
          {deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} compact />
          ))}
        </div>
        <Link href={href} className="mt-4 inline-block font-display text-sm uppercase text-mint sm:hidden">
          View All Deals →
        </Link>
      </div>
    </section>
  )
}
