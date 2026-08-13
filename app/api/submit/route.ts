import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/server'
import { slugify, uniqueSlug } from '@/lib/slugs'
import { success, validationError, serverError } from '@/lib/api-response'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const schema = z.object({
  dispensary_name: z.string().min(2),
  city: z.string().min(2),
  title: z.string().min(2),
  category: z.string().min(2),
  brand: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  regular_price: z.string().optional().nullable(),
  deal_price: z.string().optional().nullable(),
  start_date: z.string().min(8),
  end_date: z.string().min(8),
  menu_url: z.string().url(),
  contact_email: z.string().email().optional().or(z.literal('')),
  image: z.string().optional().nullable(),
})

export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'strict')
    if (!limited.success) return limited.response

    const body = await request.json()
    const parsed = schema.parse(body)

    const { data: existing } = await supabaseAdmin.from('deals').select('slug')
    const slug = uniqueSlug(`${parsed.title}-${parsed.city}`, (existing || []).map((d) => d.slug).filter(Boolean) as string[])

    let dispensaryId: string | null = null
    const { data: shop } = await supabaseAdmin
      .from('dispensaries')
      .select('id, slug')
      .ilike('name', parsed.dispensary_name)
      .maybeSingle()

    if (shop) {
      dispensaryId = shop.id
    } else {
      const { data: created } = await supabaseAdmin
        .from('dispensaries')
        .insert({
          name: parsed.dispensary_name,
          city: parsed.city.replace(/,?\s*MI$/i, ''),
          state: 'MI',
          slug: slugify(`${parsed.dispensary_name}-${parsed.city}`),
          menu_url: parsed.menu_url,
          website: parsed.menu_url,
          active: true,
        })
        .select('id')
        .maybeSingle()
      dispensaryId = created?.id || null
    }

    const priceText = parsed.deal_price || parsed.title
    const { data: deal, error: dealError } = await supabaseAdmin
      .from('deals')
      .insert({
        dispensary_id: dispensaryId,
        dispensary_name: parsed.dispensary_name,
        city: parsed.city.replace(/,?\s*MI$/i, ''),
        state: 'MI',
        date: parsed.start_date,
        start_date: parsed.start_date,
        end_date: parsed.end_date,
        category: parsed.category,
        title: parsed.title,
        slug,
        description: parsed.description || parsed.title,
        brand: parsed.brand || null,
        regular_price: parsed.regular_price || null,
        deal_price: parsed.deal_price || null,
        price_text: priceText,
        image: parsed.image || null,
        menu_url: parsed.menu_url,
        source_url: parsed.menu_url,
        featured: false,
        sponsored: false,
        verified: false,
        submission_source: 'dispensary',
        status: 'pending',
        needs_review: true,
      })
      .select('id, slug')
      .single()

    if (dealError || !deal) {
      console.error(dealError)
      return serverError('Could not save deal')
    }

    await supabaseAdmin.from('deal_submissions').insert({
      deal_id: deal.id,
      dispensary_name: parsed.dispensary_name,
      city: parsed.city,
      contact_email: parsed.contact_email || null,
      payload: parsed,
      flyer_path: parsed.image || null,
      status: 'pending',
    })

    await supabaseAdmin.from('deal_reviews').insert({
      deal_id: deal.id,
      reason: 'dispensary_submission',
      status: 'pending',
    })

    return success({ id: deal.id, slug: deal.slug }, 'Submitted for review')
  } catch (error) {
    if (error instanceof z.ZodError) return validationError('Check the required fields', error.errors)
    console.error(error)
    return serverError('Could not submit deal')
  }
}
