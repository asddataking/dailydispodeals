import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { success } from '@/lib/api-response'
import { toDealCard } from '@/lib/deals'
import type { DealRecord } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const ids = Array.isArray(body.ids) ? body.ids.filter((id: unknown) => typeof id === 'string').slice(0, 50) : []
  if (!ids.length) return success({ deals: [] })
  const { data } = await supabaseAdmin.from('deals').select('*').in('id', ids)
  return success({ deals: (data || []).map((d) => toDealCard(d as DealRecord)) })
}
