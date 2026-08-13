import { supabaseAdmin } from '@/lib/supabase/server'
import { categoryLabel } from '@/lib/categories'
import { slugify } from '@/lib/slugs'
import type { DealCardData, DealRecord } from '@/lib/types'

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10)
}

const DEAL_SELECT = `
  id,
  dispensary_id,
  dispensary_name,
  title,
  slug,
  description,
  category,
  brand,
  brand_id,
  regular_price,
  deal_price,
  price_text,
  start_date,
  end_date,
  date,
  image,
  menu_url,
  source_url,
  city,
  state,
  featured,
  sponsored,
  verified,
  submission_source,
  status,
  needs_review,
  created_at,
  updated_at,
  dispensaries (
    id,
    name,
    slug,
    city,
    verified,
    logo
  )
`

export function expirationLabel(endDate?: string | null): string {
  if (!endDate) return 'Limited time'
  const end = endDate.slice(0, 10)
  const today = todayISODate()
  if (end === today) return 'Ends Tonight'
  if (end < today) return 'Ended'
  const endTime = new Date(`${end}T23:59:59`)
  const diff = Math.ceil((endTime.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (diff <= 1) return 'Ends Tomorrow'
  return `Ends ${endTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

export function toDealCard(deal: DealRecord): DealCardData {
  const dispensaryName = deal.dispensaries?.name || deal.dispensary_name
  const city = deal.dispensaries?.city || deal.city
  return {
    id: deal.id,
    slug: deal.slug || slugify(deal.title),
    title: deal.deal_price || deal.price_text || deal.title,
    subtitle: deal.description || deal.title || categoryLabel(deal.category),
    category: deal.category,
    brand: deal.brand,
    image: deal.image,
    dispensaryName,
    dispensarySlug: deal.dispensaries?.slug || undefined,
    city,
    state: deal.state || 'MI',
    featured: Boolean(deal.featured),
    sponsored: Boolean(deal.sponsored),
    verified: Boolean(deal.verified || deal.dispensaries?.verified),
    submissionSource: deal.submission_source,
    href: `/deal/${deal.slug || deal.id}`,
  }
}

async function expireStaleDeals() {
  const today = todayISODate()
  await supabaseAdmin
    .from('deals')
    .update({ status: 'expired', updated_at: new Date().toISOString() })
    .eq('status', 'approved')
    .not('end_date', 'is', null)
    .lt('end_date', today)
}

function activeQuery() {
  const today = todayISODate()
  return supabaseAdmin
    .from('deals')
    .select(DEAL_SELECT)
    .eq('status', 'approved')
    .or('needs_review.eq.false,needs_review.is.null')
    .gte('end_date', today)
}

export async function getActiveDeals(options?: {
  city?: string
  category?: string
  brand?: string
  dispensaryId?: string
  featured?: boolean
  limit?: number
  search?: string
}): Promise<DealRecord[]> {
  try {
    await expireStaleDeals()
    let query = activeQuery().order('featured', { ascending: false }).order('created_at', { ascending: false })

    if (options?.city) {
      query = query.ilike('city', options.city)
    }
    if (options?.category) {
      query = query.eq('category', options.category)
    }
    if (options?.brand) {
      query = query.ilike('brand', options.brand)
    }
    if (options?.dispensaryId) {
      query = query.eq('dispensary_id', options.dispensaryId)
    }
    if (options?.featured) {
      query = query.eq('featured', true)
    }
    if (options?.search) {
      const q = options.search.replace(/,/g, ' ')
      query = query.or(`title.ilike.%${q}%,city.ilike.%${q}%,dispensary_name.ilike.%${q}%,description.ilike.%${q}%`)
    }
    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query
    if (error) {
      console.error('getActiveDeals', error)
      return []
    }
    return (data || []) as unknown as DealRecord[]
  } catch (error) {
    console.error('getActiveDeals', error)
    return []
  }
}

export async function getDealBySlug(slug: string): Promise<DealRecord | null> {
  try {
    await expireStaleDeals()
    const { data, error } = await supabaseAdmin
      .from('deals')
      .select(DEAL_SELECT)
      .eq('slug', slug)
      .maybeSingle()
    if (error || !data) return null
    return data as unknown as DealRecord
  } catch {
    return null
  }
}

export async function getDealById(id: string): Promise<DealRecord | null> {
  const { data } = await supabaseAdmin.from('deals').select(DEAL_SELECT).eq('id', id).maybeSingle()
  return (data as unknown as DealRecord) || null
}

export function isDealLive(deal: DealRecord): boolean {
  const today = todayISODate()
  const approved = deal.status === 'approved' || (!deal.status && deal.needs_review === false)
  const notExpired = !deal.end_date || deal.end_date >= today
  return Boolean(approved && notExpired && deal.needs_review !== true)
}

export async function getActiveBrands(): Promise<string[]> {
  const deals = await getActiveDeals({ limit: 200 })
  const set = new Set<string>()
  for (const deal of deals) {
    if (deal.brand) set.add(deal.brand)
  }
  return Array.from(set).sort()
}

export async function incrementDealView(dealId: string) {
  try {
    await supabaseAdmin.from('deal_clicks').insert({
      deal_id: dealId,
      source: 'view',
    })
  } catch {
    // non-blocking
  }
}
