import Link from 'next/link'
import { getActiveBrands, getActiveDeals } from '@/lib/deals'
import { slugify } from '@/lib/slugs'

export const dynamic = 'force-dynamic'

export default async function BrandsPage() {
  const brands = await getActiveBrands()
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-5xl uppercase text-cream">Brands</h1>
      <p className="mt-3 max-w-xl text-cream/70">
        Brand pages collect current submitted promotions. Statewide campaigns can be featured.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        {brands.length ? (
          brands.map((brand) => (
            <Link key={brand} href={`/brands/${slugify(brand)}`} className="panel px-4 py-3 font-display uppercase text-cream hover:border-mint">
              {brand}
            </Link>
          ))
        ) : (
          <p className="text-cream/60">Brand deals will appear here as shops submit them.</p>
        )}
      </div>
    </div>
  )
}
