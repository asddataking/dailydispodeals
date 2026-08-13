import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/server'
import { success, validationError, serverError } from '@/lib/api-response'
import { rateLimit } from '@/lib/rate-limit'

const schema = z.object({
  slug: z.string().min(1),
  email: z.string().email(),
  proof: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, 'strict')
  if (!limited.success) return limited.response
  try {
    const parsed = schema.parse(await request.json())
    const { data: shop } = await supabaseAdmin.from('dispensaries').select('id').eq('slug', parsed.slug).maybeSingle()
    const { error } = await supabaseAdmin.from('profile_claims').insert({
      dispensary_id: shop?.id || null,
      dispensary_slug: parsed.slug,
      email: parsed.email,
      proof: parsed.proof || null,
    })
    if (error) return serverError('Could not save claim')
    return success({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError) return validationError('Valid email required')
    return serverError('Could not save claim')
  }
}
