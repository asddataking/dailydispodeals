import Link from 'next/link'
import type { AffiliateProduct } from '@/lib/types'
import { AffiliateCard } from '@/app/components/gear/AffiliateCard'

export function StashEssentials({ products }: { products: AffiliateProduct[] }) {
  if (!products.length) return null
  return (
    <section className="border-y-[3px] border-cream/10 py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <p className="section-kicker">Deals don&apos;t stop at the dispo.</p>
        <h2 className="mt-2 font-display text-4xl uppercase text-cream sm:text-6xl">Stash Essentials</h2>
        <p className="mt-3 max-w-xl text-cream/70">
          Gear, storage and everyday cannabis accessories worth checking out.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.slice(0, 4).map((product) => (
            <AffiliateCard key={product.id} product={product} />
          ))}
        </div>
        <Link href="/gear" className="mt-6 inline-block font-display uppercase text-mint">
          Shop All Stash Essentials →
        </Link>
        <p className="mt-4 max-w-2xl text-xs text-cream/45">
          Some links may be affiliate links. Daily Dispo Deals may earn a commission from qualifying purchases at no
          additional cost to you.
        </p>
      </div>
    </section>
  )
}
