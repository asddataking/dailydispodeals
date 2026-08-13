import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getAdminSession } from '@/lib/admin-auth'
import { success, unauthorized, validationError, serverError } from '@/lib/api-response'
import { slugify } from '@/lib/slugs'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getAdminSession()
  if (!session.authenticated) return unauthorized()
  const { data, error } = await supabaseAdmin
    .from('affiliate_products')
    .select('*')
    .order('sort_order')
  if (error) return serverError('Failed to load products', error)
  return success({ products: data || [] })
}

const schema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2),
  blurb: z.string().optional(),
  category_slug: z.string(),
  url: z.string().url(),
  discount: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  active: z.boolean().optional(),
  delete: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  const session = await getAdminSession()
  if (!session.authenticated) return unauthorized()
  try {
    const parsed = schema.parse(await request.json())
    if (parsed.delete && parsed.id) {
      await supabaseAdmin.from('affiliate_products').delete().eq('id', parsed.id)
      return success({ ok: true })
    }
    if (parsed.id) {
      const { error } = await supabaseAdmin
        .from('affiliate_products')
        .update({
          name: parsed.name,
          blurb: parsed.blurb,
          category_slug: parsed.category_slug,
          url: parsed.url,
          discount: parsed.discount,
          image: parsed.image,
          active: parsed.active ?? true,
        })
        .eq('id', parsed.id)
      if (error) return serverError('Update failed', error)
    } else {
      const { error } = await supabaseAdmin.from('affiliate_products').insert({
        name: parsed.name,
        slug: slugify(parsed.name),
        blurb: parsed.blurb,
        category_slug: parsed.category_slug,
        url: parsed.url,
        discount: parsed.discount,
        image: parsed.image,
        active: true,
      })
      if (error) return serverError('Insert failed', error)
    }
    return success({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError) return validationError('Invalid product', error.errors)
    return serverError('Save failed')
  }
}
