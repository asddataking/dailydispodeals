import Link from 'next/link'
import type { SiteSettings } from '@/lib/types'

export function GetFeatured({ settings }: { settings: SiteSettings }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <p className="section-kicker">Optional boost</p>
      <h2 className="mt-2 max-w-3xl font-display text-4xl uppercase leading-[0.9] text-cream sm:text-5xl">
        Want more eyes on your deal?
      </h2>
      <p className="mt-3 max-w-xl text-cream/70">
        Standard submissions are free. Dispensaries can optionally increase exposure — never required.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="panel p-6">
          <h3 className="font-display text-2xl uppercase text-cream">Featured Deal</h3>
          <p className="mt-2 text-sm text-cream/70">Pin a promotion above standard listings.</p>
          <p className="mt-4 font-display text-3xl text-mint">${settings.featured_deal_per_day}/day</p>
        </div>
        <div className="panel p-6">
          <h3 className="font-display text-2xl uppercase text-cream">Featured Dispensary</h3>
          <p className="mt-2 text-sm text-cream/70">Highlighted profile + featured deals + enhanced visibility.</p>
          <p className="mt-4 font-display text-3xl text-mint">${settings.featured_dispensary_per_month}/month</p>
        </div>
        <div className="panel p-6">
          <h3 className="font-display text-2xl uppercase text-cream">City Sponsor</h3>
          <p className="mt-2 text-sm text-cream/70">Become the primary sponsor of a local city page.</p>
          <p className="mt-4 font-display text-3xl text-mint">${settings.city_sponsor_per_month}/mo</p>
        </div>
      </div>
      <Link href="/advertise" className="btn-ghost mt-8">
        Get Featured →
      </Link>
    </section>
  )
}
