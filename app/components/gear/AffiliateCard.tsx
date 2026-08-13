import Link from 'next/link'
import type { AffiliateProduct } from '@/lib/types'

const CATEGORY_LABELS: Record<string, string> = {
  storage: 'Keep It Fresh',
  grinders: 'Grind It',
  'humidity-control': 'Keep It Fresh',
  'smell-proof-storage': 'Stash It',
  cleaning: 'Keep It Clean',
  grow: 'Grow Gear',
}

export function AffiliateCard({ product }: { product: AffiliateProduct }) {
  return (
    <article className="panel flex h-full flex-col overflow-hidden">
      <div className="flex h-36 items-center justify-center bg-teal-deep font-display text-3xl text-mint/50">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          'GEAR'
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="font-display text-[11px] uppercase tracking-widest text-gold">
          {CATEGORY_LABELS[product.category_slug] || product.category_slug}
        </p>
        <h3 className="mt-1 font-display text-xl uppercase text-cream">{product.name}</h3>
        <p className="mt-2 text-sm text-cream/70">{product.blurb}</p>
        {product.discount && <p className="mt-2 font-marker text-coral">{product.discount}</p>}
        <a href={product.url} target="_blank" rel="noreferrer sponsored" className="btn-ghost mt-auto w-full !py-2 !text-sm">
          Check It Out →
        </a>
      </div>
    </article>
  )
}
