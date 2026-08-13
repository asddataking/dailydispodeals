import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { DealCard } from '@/app/components/deals/DealCard'
import { getActiveDeals, getDealBySlug, incrementDealView, isDealLive, toDealCard, expirationLabel } from '@/lib/deals'
import { ClaimForm } from '@/app/components/dispensary/ClaimForm'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const deal = await getDealBySlug(params.slug)
  if (!deal) return { title: 'Deal | Daily Dispo Deals' }
  return {
    title: `${deal.title} at ${deal.dispensary_name} | Daily Dispo Deals`,
    description: deal.description || deal.price_text || deal.title,
  }
}

export default async function DealPage({ params }: { params: { slug: string } }) {
  const deal = await getDealBySlug(params.slug)
  if (!deal) notFound()

  await incrementDealView(deal.id)
  const live = isDealLive(deal)
  const nearby = (await getActiveDeals({ city: deal.city || undefined, limit: 6 }))
    .filter((d) => d.id !== deal.id)
    .map(toDealCard)

  const menuHref = `/go/${deal.id}`

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      {!live && (
        <div className="mb-8 border-[3px] border-coral bg-coral/10 p-6">
          <p className="font-display text-3xl uppercase text-coral">This deal has ended</p>
          <Link href="/deals" className="mt-3 inline-block font-display uppercase text-mint">
            View Current Deals Near You →
          </Link>
        </div>
      )}
      <p className="section-kicker">{deal.category}</p>
      <h1 className="font-display text-5xl uppercase leading-none text-cream">{deal.deal_price || deal.price_text || deal.title}</h1>
      <p className="mt-2 text-xl text-mint">{deal.description || deal.title}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {deal.featured && <span className="sticker-gold">Featured</span>}
        {deal.sponsored && <span className="sticker-coral">Sponsored</span>}
        {deal.verified && <span className="sticker">Verified</span>}
        {deal.submission_source === 'dispensary' && <span className="sticker">Submitted by Dispensary</span>}
      </div>
      <div className="panel mt-8 p-6">
        <p className="font-display text-2xl uppercase text-gold">{deal.dispensaries?.name || deal.dispensary_name}</p>
        <p className="text-cream/70">
          {deal.city}
          {deal.state ? `, ${deal.state}` : ''}
        </p>
        {deal.brand && <p className="mt-2 text-sm text-cream/70">Brand: {deal.brand}</p>}
        <p className="mt-2 font-marker text-coral">{expirationLabel(deal.end_date)}</p>
        {live && deal.menu_url && (
          <a href={menuHref} className="btn-primary mt-6 inline-flex">
            View Menu →
          </a>
        )}
        {deal.dispensaries?.slug && (
          <Link href={`/dispensary/${deal.dispensaries.slug}`} className="ml-3 inline-block text-sm text-mint">
            Dispensary profile →
          </Link>
        )}
      </div>
      {nearby.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-3xl uppercase">More deals nearby</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {nearby.map((card) => (
              <DealCard key={card.id} deal={card} />
            ))}
          </div>
        </section>
      )}
      {deal.dispensaries?.slug && <ClaimForm slug={deal.dispensaries.slug} />}
    </div>
  )
}
