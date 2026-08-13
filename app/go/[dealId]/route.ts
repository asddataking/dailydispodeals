import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getDealById } from '@/lib/deals'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest, { params }: { params: { dealId: string } }) {
  const deal = await getDealById(params.dealId)
  const dest = deal?.menu_url || deal?.source_url
  if (!dest) {
    return NextResponse.redirect(new URL('/deals', _request.url))
  }
  try {
    await supabaseAdmin.from('deal_clicks').insert({ deal_id: params.dealId, source: 'click' })
  } catch {
    // continue redirect
  }
  return NextResponse.redirect(dest, 302)
}
