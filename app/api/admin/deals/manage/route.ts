import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getAdminSession } from '@/lib/admin-auth'
import { success, unauthorized, validationError, serverError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

const schema = z.object({
  deal_id: z.string().uuid(),
  action: z.enum(['approve', 'reject', 'expire', 'feature', 'unfeature', 'sponsor', 'unsponsor', 'edit']),
  notes: z.string().optional(),
  edits: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      end_date: z.string().optional(),
      menu_url: z.string().optional(),
      city: z.string().optional(),
    })
    .optional(),
})

export async function GET() {
  const session = await getAdminSession()
  if (!session.authenticated) return unauthorized()

  const { data, error } = await supabaseAdmin
    .from('deals')
    .select('id, title, dispensary_name, city, category, status, featured, sponsored, end_date, menu_url, slug, created_at, submission_source, needs_review')
    .in('status', ['pending', 'approved'])
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return serverError('Failed to load deals', error)
  return success({ deals: data || [] })
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession()
  if (!session.authenticated) return unauthorized()

  try {
    const parsed = schema.parse(await request.json())
    const now = new Date().toISOString()
    const by = session.email || 'admin'
    const patch: Record<string, unknown> = { updated_at: now, reviewed_at: now, reviewed_by: by }

    if (parsed.action === 'approve') {
      Object.assign(patch, { status: 'approved', needs_review: false })
    } else if (parsed.action === 'reject') {
      Object.assign(patch, { status: 'rejected', needs_review: false })
    } else if (parsed.action === 'expire') {
      Object.assign(patch, { status: 'expired', end_date: now.slice(0, 10) })
    } else if (parsed.action === 'feature') {
      Object.assign(patch, { featured: true })
    } else if (parsed.action === 'unfeature') {
      Object.assign(patch, { featured: false })
    } else if (parsed.action === 'sponsor') {
      Object.assign(patch, { sponsored: true, featured: true })
    } else if (parsed.action === 'unsponsor') {
      Object.assign(patch, { sponsored: false })
    } else if (parsed.action === 'edit' && parsed.edits) {
      Object.assign(patch, parsed.edits)
    }

    const { error } = await supabaseAdmin.from('deals').update(patch).eq('id', parsed.deal_id)
    if (error) return serverError('Update failed', error)

    await supabaseAdmin
      .from('deal_submissions')
      .update({
        ...(parsed.action === 'reject' ? { status: 'rejected' } : {}),
        ...(parsed.action === 'approve' ? { status: 'approved' } : {}),
        reviewed_at: now,
        reviewed_by: by,
        notes: parsed.notes,
      })
      .eq('deal_id', parsed.deal_id)

    if (parsed.action === 'feature' || parsed.action === 'sponsor') {
      await supabaseAdmin.from('sponsored_placements').insert({
        type: parsed.action === 'sponsor' ? 'featured_deal' : 'featured_deal',
        deal_id: parsed.deal_id,
        active: true,
        start_date: now.slice(0, 10),
      })
    }

    return success({ ok: true, action: parsed.action })
  } catch (error) {
    if (error instanceof z.ZodError) return validationError('Invalid input', error.errors)
    return serverError('Update failed')
  }
}
