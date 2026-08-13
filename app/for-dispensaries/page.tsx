import { HowSubmitWorks } from '@/app/components/home/HowSubmitWorks'
import { WhySubmit } from '@/app/components/home/WhySubmit'
import { AudienceSplit } from '@/app/components/home/AudienceSplit'
import Link from 'next/link'

export const metadata = {
  title: 'For Dispensaries | Daily Dispo Deals',
  description: 'Submit today’s dispensary deal for free. No contracts, no commission, no account required.',
}

export default function ForDispensariesPage() {
  return (
    <div>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <p className="section-kicker">For dispensaries</p>
        <h1 className="max-w-3xl font-display text-5xl uppercase leading-[0.9] text-cream sm:text-7xl">
          Got a deal? Put it in front of people looking for one.
        </h1>
        <p className="mt-4 max-w-xl text-cream/75">
          Standard listings are free. Shoppers click through to your menu. We are not Weedmaps — just today&apos;s specials.
        </p>
        <Link href="/submit" className="btn-coral mt-8">
          Submit a Deal — Free
        </Link>
      </div>
      <HowSubmitWorks />
      <WhySubmit />
      <AudienceSplit />
    </div>
  )
}
