import { supabaseAdmin } from '@/lib/supabase/server'
import { DEFAULT_SITE_SETTINGS, type AffiliateProduct, type SiteSettings } from '@/lib/types'

export const FALLBACK_AFFILIATE_PRODUCTS: AffiliateProduct[] = [
  {
    id: 'fallback-1',
    name: 'Humidity Pack 2-Way Control',
    slug: 'humidity-pack-2-way',
    blurb: 'Keep flower at a stable humidity without babysitting the jar.',
    category_slug: 'humidity-control',
    image: null,
    url: 'https://www.amazon.com/s?k=humidity+pack+cannabis',
    discount: null,
    featured: true,
    sort_order: 1,
  },
  {
    id: 'fallback-2',
    name: 'Smell-Proof Stash Bag',
    slug: 'smell-proof-stash-bag',
    blurb: 'Odor-resistant everyday carry for flower and accessories.',
    category_slug: 'smell-proof-storage',
    image: null,
    url: 'https://www.amazon.com/s?k=smell+proof+stash+bag',
    discount: null,
    featured: true,
    sort_order: 2,
  },
  {
    id: 'fallback-3',
    name: 'Four-Piece Grinder',
    slug: 'four-piece-grinder',
    blurb: 'A solid daily grinder with a kief catcher.',
    category_slug: 'grinders',
    image: null,
    url: 'https://www.amazon.com/s?k=herb+grinder+4+piece',
    discount: null,
    featured: true,
    sort_order: 3,
  },
  {
    id: 'fallback-4',
    name: 'Glass & Accessory Cleaner',
    slug: 'glass-accessory-cleaner',
    blurb: 'Strip resin without wrecking your glass.',
    category_slug: 'cleaning',
    image: null,
    url: 'https://www.amazon.com/s?k=glass+pipe+cleaner',
    discount: null,
    featured: true,
    sort_order: 4,
  },
]

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const { data } = await supabaseAdmin
      .from('site_settings')
      .select('value')
      .eq('key', 'placement_prices')
      .maybeSingle()
    if (!data?.value) return DEFAULT_SITE_SETTINGS
    return { ...DEFAULT_SITE_SETTINGS, ...(data.value as Partial<SiteSettings>) }
  } catch {
    return DEFAULT_SITE_SETTINGS
  }
}

export async function getAffiliateProducts(limit?: number): Promise<AffiliateProduct[]> {
  try {
    let query = supabaseAdmin
      .from('affiliate_products')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
    if (limit) query = query.limit(limit)
    const { data, error } = await query
    if (error || !data?.length) return FALLBACK_AFFILIATE_PRODUCTS.slice(0, limit)
    return data as AffiliateProduct[]
  } catch {
    return FALLBACK_AFFILIATE_PRODUCTS.slice(0, limit)
  }
}

export async function getAffiliateProductsByCategory(slug: string): Promise<AffiliateProduct[]> {
  const all = await getAffiliateProducts()
  const filtered = all.filter((p) => p.category_slug === slug)
  return filtered
}
