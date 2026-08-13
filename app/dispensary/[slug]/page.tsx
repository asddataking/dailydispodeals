import Link from 'next/link'
import type { Metadata } from 'next'
import { DealCard } from '@/app/components/deals/DealCard'
import { ClaimForm } from '@/app/components/dispensary/ClaimForm'
import { getActiveDeals, toDealCard } from '@/lib/deals'
import { supabaseAdmin } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  return { title: `Dispensary | Daily Dispo Deals` }
}

export default async function DispensaryPage({ params }: { params: { slug: string } }) {
  const { data: shop } = await supabaseAdmin
    .from('dispensaries')
    .select('*')
    .eq('slug', params.slug)
    .maybeSingle()

  if (!shop) notFound()

  const deals = await getActiveDeals({ dispensaryId: shop.id, limit: 40 })
  const cards = deals.map(toDealCard)
  const menu = shop.menu_url || shop.website || shop.deals_url

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {shop.verified && <span className="sticker">Verified Dispensary</span>}
          <h1 className="mt-3 font-display text-5xl uppercase leading-none text-cream">{shop.name}</h1>
          <p className="mt-2 text-cream/70">
            {shop.city}
            {shop.state ? `, ${shop.state}` : ''}
            {shop.address ? ` · ${shop.address}` : ''}
          </p>
          {shop.updated_at && (
            <p className="mt-1 text-xs text-cream/50">Last updated {new Date(shop.updated_at).toLocaleDateString()}</p>
          )}
        </div>
        {menu && (
          <a href={menu} target="_blank" rel="noreferrer" className="btn-primary">
            View Menu
          </a>
        )}
      </div>
      <section className="mt-10">
        <h2 className="font-display text-3xl uppercase">Active Deals</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {cards.length ? cards.map((d) => <DealCard key={d.id} deal={d} />) : <p className="text-cream/60">No live deals right now.</p>}
        </div>
      </section>
      <ClaimForm slug={shop.slug} />
      <Link href="/submit" className="mt-6 inline-block font-display uppercase text-mint">
        Submit a deal for this shop →
      </Link>
    </div>
  )
}
