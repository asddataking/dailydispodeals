import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { AffiliateCard } from '@/app/components/gear/AffiliateCard'
import { GEAR_ARTICLES, GEAR_CATEGORIES } from '@/lib/gear'
import { getAffiliateProducts, getAffiliateProductsByCategory } from '@/lib/settings'

export const dynamic = 'force-dynamic'

export function generateStaticParams() {
  return [...GEAR_CATEGORIES.map((c) => ({ slug: c.slug })), ...GEAR_ARTICLES.map((a) => ({ slug: a.slug }))]
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const article = GEAR_ARTICLES.find((a) => a.slug === params.slug)
  const cat = GEAR_CATEGORIES.find((c) => c.slug === params.slug)
  if (article) return { title: `${article.title} | Daily Dispo Deals`, description: article.description }
  if (cat) return { title: `${cat.headline} | Stash Essentials`, description: cat.description }
  return { title: 'Stash Essentials' }
}

export default async function GearSlugPage({ params }: { params: { slug: string } }) {
  const article = GEAR_ARTICLES.find((a) => a.slug === params.slug)
  const cat = GEAR_CATEGORIES.find((c) => c.slug === params.slug)
  if (!article && !cat) notFound()

  if (article) {
    const related = await getAffiliateProductsByCategory(article.related)
    return (
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link href="/gear" className="text-sm text-mint">
          ← Stash Essentials
        </Link>
        <h1 className="mt-4 font-display text-5xl uppercase leading-none text-cream">{article.title}</h1>
        <p className="mt-4 text-lg text-cream/75">{article.description}</p>
        <div className="mt-8 space-y-4 text-cream/80">
          {article.body.map((p) => (
            <p key={p.slice(0, 24)}>{p}</p>
          ))}
        </div>
        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-2xl uppercase">Worth checking out</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {related.map((p) => (
                <AffiliateCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
        <p className="mt-8 text-xs text-cream/45">
          Some links may be affiliate links. Daily Dispo Deals may earn a commission from qualifying purchases at no additional cost to you.
        </p>
      </article>
    )
  }

  const products = await getAffiliateProductsByCategory(cat!.slug)
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link href="/gear" className="text-sm text-mint">
        ← Stash Essentials
      </Link>
      <p className="section-kicker mt-4">{cat!.headline}</p>
      <h1 className="font-display text-5xl uppercase text-cream">{cat!.name}</h1>
      <p className="mt-3 max-w-xl text-cream/70">{cat!.description}</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.length ? products.map((p) => <AffiliateCard key={p.id} product={p} />) : <p className="text-cream/60">Nothing listed here yet.</p>}
      </div>
    </div>
  )
}
