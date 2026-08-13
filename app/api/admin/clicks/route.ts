import { supabaseAdmin } from '@/lib/supabase/server'
import { getAdminSession } from '@/lib/admin-auth'
import { success, unauthorized, serverError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getAdminSession()
  if (!session.authenticated) return unauthorized()

  const { data: clicks, error } = await supabaseAdmin
    .from('deal_clicks')
    .select('deal_id, source, created_at, deals(title, dispensary_name)')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) return serverError('Failed to load clicks', error)

  const stats = new Map<string, { title: string; views: number; clicks: number }>()
  for (const row of clicks || []) {
    const id = row.deal_id as string
    const title = (row.deals as { title?: string; dispensary_name?: string } | null)?.title || id
    const current = stats.get(id) || { title, views: 0, clicks: 0 }
    if (row.source === 'view') current.views += 1
    else current.clicks += 1
    stats.set(id, current)
  }

  const rows = Array.from(stats.entries()).map(([id, s]) => ({
    deal_id: id,
    title: s.title,
    views: s.views,
    clicks: s.clicks,
    ctr: s.views ? Math.round((s.clicks / s.views) * 1000) / 10 : 0,
  }))

  return success({ stats: rows })
}
