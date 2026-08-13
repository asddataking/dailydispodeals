import Link from 'next/link'
import { AdvertiseForm, AdvertiseTiers } from '@/app/components/advertise/AdvertiseForm'
import { getSiteSettings } from '@/lib/settings'

export const metadata = {
  title: 'Advertise | Daily Dispo Deals',
  description: 'Optional featured placements, city sponsorships and brand campaigns. Standard deal submissions stay free.',
}

export default async function AdvertisePage() {
  const settings = await getSiteSettings()
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <p className="section-kicker">Optional, never required</p>
      <h1 className="font-display text-5xl uppercase leading-none text-cream">Want more eyes on your deal?</h1>
      <p className="mt-4 max-w-2xl text-cream/75">
        Standard submissions are free. These placements are an optional boost — the primary CTA remains submit a deal for free.
      </p>
      <AdvertiseTiers settings={settings} />
      <p className="mt-4 text-sm text-cream/50">Prices are starting concepts and can change. Checkout for paid tiers comes later.</p>
      <Link href="/submit" className="mt-6 inline-block font-display uppercase text-mint">
        Prefer free? Submit a deal →
      </Link>
      <AdvertiseForm />
      <section id="brands" className="mt-16">
        <h2 className="font-display text-4xl uppercase">For Cannabis Brands</h2>
        <p className="mt-3 text-cream/75">
          Statewide or regional campaigns: Wojo Wednesday, weekend drops, 25% off across Michigan. Featured brand, sponsored
          promotion, brand deal page, drop announcement, newsletter sponsorship.
        </p>
      </section>
    </div>
  )
}
