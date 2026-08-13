import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getAdminSession } from '@/lib/admin-auth'
import { success, unauthorized, validationError, serverError } from '@/lib/api-response'
import { DEFAULT_SITE_SETTINGS } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getAdminSession()
  if (!session.authenticated) return unauthorized()
  const { data } = await supabaseAdmin.from('site_settings').select('value').eq('key', 'placement_prices').maybeSingle()
  return success({ settings: { ...DEFAULT_SITE_SETTINGS, ...(data?.value || {}) } })
}

const schema = z.object({
  featured_deal_per_day: z.number(),
  featured_dispensary_per_month: z.number(),
  city_sponsor_per_month: z.number(),
})

export async function POST(request: NextRequest) {
  const session = await getAdminSession()
  if (!session.authenticated) return unauthorized()
  try {
    const parsed = schema.parse(await request.json())
    const { error } = await supabaseAdmin.from('site_settings').upsert({
      key: 'placement_prices',
      value: parsed,
      updated_at: new Date().toISOString(),
    })
    if (error) return serverError('Could not save settings', error)
    return success({ settings: parsed })
  } catch (error) {
    if (error instanceof z.ZodError) return validationError('Invalid settings')
    return serverError('Could not save settings')
  }
}
