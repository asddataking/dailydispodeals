import Link from 'next/link'
import Image from 'next/image'
import { expirationLabel } from '@/lib/deals'
import type { DealCardData } from '@/lib/types'
import { SaveDealButton } from './SaveDealButton'

function badges(deal: DealCardData): { label: string; className: string }[] {
  const items: { label: string; className: string }[] = []
  if (deal.sponsored) items.push({ label: 'Sponsored', className: 'sticker-coral' })
  else if (deal.featured) items.push({ label: 'Featured', className: 'sticker-gold' })
  if (deal.verified) items.push({ label: 'Verified', className: 'sticker' })
  else if (deal.submissionSource === 'dispensary') {
    items.push({ label: 'Submitted by Dispensary', className: 'sticker' })
  }
  if (deal.isSample) items.push({ label: 'Sample', className: 'sticker-coral' })
  if (!items.length) items.push({ label: 'Hot Deal', className: 'sticker-gold' })
  return items.slice(0, 2)
}

export function DealCard({ deal, compact = false }: { deal: DealCardData; compact?: boolean }) {
  const tags = badges(deal)
  return (
    <article
      className={`panel flex h-full min-w-[260px] flex-col overflow-hidden ${compact ? 'w-[260px]' : 'w-full'}`}
    >
      <div className="relative h-40 bg-teal-deep">
        {deal.image ? (
          <Image src={deal.image} alt={deal.title} fill className="object-cover" sizes="320px" />
        ) : (
          <div className="halftone flex h-full items-center justify-center font-display text-4xl text-mint/40">
            DDD
          </div>
        )}
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span key={tag.label} className={tag.className}>
              {tag.label}
            </span>
          ))}
        </div>
        <SaveDealButton dealId={deal.id} />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-3xl uppercase leading-none text-cream">{deal.title}</h3>
        <p className="mt-1 text-sm uppercase tracking-wide text-mint">{deal.subtitle}</p>
        <p className="mt-3 font-display text-sm uppercase text-gold">{deal.dispensaryName}</p>
        <p className="text-xs text-cream/60">
          {deal.city}
          {deal.state ? `, ${deal.state}` : ''}
          {deal.distanceMi != null ? ` · ${deal.distanceMi} mi` : ''}
        </p>
        <p className="mt-2 font-marker text-coral">{expirationLabel(deal.endDate)}</p>
        <Link href={deal.href} className="btn-primary mt-auto w-full !py-2 !text-sm">
          View Deal
        </Link>
      </div>
    </article>
  )
}
