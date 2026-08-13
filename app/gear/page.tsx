import Link from 'next/link'
import { AffiliateCard } from '@/app/components/gear/AffiliateCard'
import { GEAR_ARTICLES, GEAR_CATEGORIES } from '@/lib/gear'
import { getAffiliateProducts } from '@/lib/settings'

export const metadata = {
  title: 'Stash Essentials | Daily Dispo Deals',
  description: 'Gear, storage and cannabis accessories. Deals do not stop at the dispo.',
}

export default async function GearPage() {
  const products = await getAffiliateProducts()
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="section-kicker">Deals don&apos;t stop at the dispo.</p>
      <h1 className="font-display text-5xl uppercase text-cream">Stash Essentials</h1>
      <p className="mt-3 max-w-xl text-cream/70">Gear, storage and everyday cannabis accessories worth checking out.</p>
      <div className="mt-8 flex flex-wrap gap-2">
        {GEAR_CATEGORIES.map((c) => (
          <Link key={c.slug} href={`/gear/${c.slug}`} className="border-[2px] border-cream/30 px-3 py-1 font-display text-xs uppercase hover:border-mint">
            {c.headline}
          </Link>
        ))}
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((p) => (
          <AffiliateCard key={p.id} product={p} />
        ))}
      </div>
      <section className="mt-14">
        <h2 className="font-display text-3xl uppercase">Guides</h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {GEAR_ARTICLES.map((a) => (
            <li key={a.slug}>
              <Link href={`/gear/${a.slug}`} className="panel block p-5 hover:border-mint">
                <h3 className="font-display text-xl uppercase text-cream">{a.title}</h3>
                <p className="mt-2 text-sm text-cream/70">{a.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <p className="mt-8 text-xs text-cream/45">
        Some links may be affiliate links. Daily Dispo Deals may earn a commission from qualifying purchases at no additional cost to you.
      </p>
    </div>
  )
}
