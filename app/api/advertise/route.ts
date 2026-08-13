import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/server'
import { success, validationError, serverError } from '@/lib/api-response'
import { rateLimit } from '@/lib/rate-limit'

const schema = z.object({
  name: z.string().optional(),
  email: z.string().email(),
  business: z.string().optional(),
  interest: z.string().optional(),
  message: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, 'strict')
  if (!limited.success) return limited.response
  try {
    const parsed = schema.parse(await request.json())
    const { error } = await supabaseAdmin.from('advertise_inquiries').insert(parsed)
    if (error) return serverError('Could not send inquiry')
    return success({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError) return validationError('Email is required')
    return serverError('Could not send inquiry')
  }
}
