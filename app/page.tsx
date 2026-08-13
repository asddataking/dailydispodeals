import { Hero } from './components/home/Hero'
import { DealRail } from './components/deals/DealRail'
import { AudienceSplit } from './components/home/AudienceSplit'
import { HowSubmitWorks } from './components/home/HowSubmitWorks'
import { WhySubmit } from './components/home/WhySubmit'
import { StashEssentials } from './components/home/StashEssentials'
import { GetFeatured } from './components/home/GetFeatured'
import { BrandPartners } from './components/home/BrandPartners'
import { NewsletterSignup } from './components/home/NewsletterSignup'
import { FAQ } from './components/FAQ'
import { StructuredData } from './components/StructuredData'
import { getActiveDeals, toDealCard } from '@/lib/deals'
import { getAffiliateProducts, getSiteSettings } from '@/lib/settings'
import { SAMPLE_DEALS } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const [deals, products, settings] = await Promise.all([
    getActiveDeals({ limit: 12 }),
    getAffiliateProducts(4),
    getSiteSettings(),
  ])

  const cards = deals.length ? deals.map(toDealCard) : SAMPLE_DEALS
  const usingSamples = deals.length === 0

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Daily Dispo Deals',
    url: process.env.APP_URL || 'https://dailydispodeals.com',
    description:
      "Today's best dispensary deals. No hunting. Cannabis shoppers browse local specials for free. Dispensaries submit promotions for free.",
    areaServed: { '@type': 'State', name: 'Michigan' },
  }

  return (
    <>
      <StructuredData data={structuredData} />
      <Hero />
      {usingSamples && (
        <p className="mx-auto max-w-7xl px-4 pt-8 text-sm text-cream/50 sm:px-6">
          Sample cards until live submissions land. Dispensaries: submit today&apos;s deal for free.
        </p>
      )}
      <DealRail deals={cards} />
      <AudienceSplit />
      <HowSubmitWorks />
      <WhySubmit />
      <StashEssentials products={products} />
      <GetFeatured settings={settings} />
      <BrandPartners />
      <NewsletterSignup />
      <FAQ />
    </>
  )
}
