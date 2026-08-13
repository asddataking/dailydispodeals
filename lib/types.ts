export type DealStatus = 'pending' | 'approved' | 'rejected' | 'expired'
export type SubmissionSource = 'dispensary' | 'admin' | 'ingest'

export type DealRecord = {
  id: string
  dispensary_id: string | null
  dispensary_name: string
  title: string
  slug: string
  description: string | null
  category: string
  brand: string | null
  brand_id: string | null
  regular_price: string | null
  deal_price: string | null
  price_text: string
  start_date: string | null
  end_date: string | null
  date: string
  image: string | null
  menu_url: string | null
  source_url: string | null
  city: string | null
  state: string | null
  featured: boolean
  sponsored: boolean
  verified: boolean
  submission_source: SubmissionSource | null
  status: DealStatus | null
  needs_review: boolean | null
  created_at: string
  updated_at: string | null
  dispensaries?: {
    id: string
    name: string
    slug: string | null
    city: string | null
    verified: boolean | null
    logo: string | null
  } | null
}

export type DealCardData = {
  id: string
  slug: string
  title: string
  subtitle: string
  category: string
  brand?: string | null
  image?: string | null
  dispensaryName: string
  dispensarySlug?: string | null
  city?: string | null
  state?: string
  distanceMi?: number | null
  endDate?: string | null
  featured: boolean
  sponsored: boolean
  verified: boolean
  submissionSource?: string | null
  isSample?: boolean
  href: string
}

export type AffiliateProduct = {
  id: string
  name: string
  slug: string
  blurb: string
  category_slug: string
  image: string | null
  url: string
  discount: string | null
  featured: boolean
  sort_order: number
}

export type SiteSettings = {
  featured_deal_per_day: number
  featured_dispensary_per_month: number
  city_sponsor_per_month: number
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  featured_deal_per_day: 15,
  featured_dispensary_per_month: 99,
  city_sponsor_per_month: 249,
}

export const SAMPLE_DEALS: DealCardData[] = [
  {
    id: 'sample-1',
    slug: 'sample-30-off-flower',
    title: '30% OFF',
    subtitle: 'All Flower',
    category: 'flower',
    image: '/hero-city.png',
    dispensaryName: 'Green Therapy',
    city: 'Port Huron',
    state: 'MI',
    distanceMi: 2.1,
    endDate: new Date().toISOString().slice(0, 10),
    featured: true,
    sponsored: false,
    verified: true,
    isSample: true,
    href: '/submit',
  },
  {
    id: 'sample-2',
    slug: 'sample-bogo-concentrates',
    title: 'BOGO',
    subtitle: 'Concentrates',
    category: 'concentrates',
    dispensaryName: 'Riverfront Cannabis',
    city: 'Detroit',
    state: 'MI',
    featured: false,
    sponsored: false,
    verified: true,
    isSample: true,
    href: '/submit',
  },
  {
    id: 'sample-3',
    slug: 'sample-5-for-100-carts',
    title: '5 FOR $100',
    subtitle: 'Carts',
    category: 'vapes',
    dispensaryName: 'Annex',
    city: 'Ann Arbor',
    state: 'MI',
    featured: false,
    sponsored: true,
    verified: false,
    isSample: true,
    href: '/submit',
  },
  {
    id: 'sample-4',
    slug: 'sample-20-off-edibles',
    title: '20% OFF',
    subtitle: 'Edibles',
    category: 'edibles',
    dispensaryName: 'House of Dank',
    city: 'Grand Rapids',
    state: 'MI',
    featured: false,
    sponsored: false,
    verified: true,
    isSample: true,
    href: '/submit',
  },
  {
    id: 'sample-5',
    slug: 'sample-99-premium-oz',
    title: '$99',
    subtitle: 'Premium OZ',
    category: 'ounces',
    dispensaryName: 'Jars',
    city: 'Lansing',
    state: 'MI',
    featured: true,
    sponsored: false,
    verified: false,
    isSample: true,
    href: '/submit',
  },
  {
    id: 'sample-6',
    slug: 'sample-25-off-brands',
    title: '25% OFF',
    subtitle: 'Select Brands',
    category: 'flower',
    dispensaryName: 'Information Entropy',
    city: 'Flint',
    state: 'MI',
    featured: false,
    sponsored: false,
    verified: true,
    isSample: true,
    href: '/submit',
  },
]
