import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/server'
import { success, validationError, serverError } from '@/lib/api-response'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const schema = z.object({
  email: z.string().email(),
  zip: z.string().min(5).max(10),
  categories: z.array(z.string()).optional(),
})

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, 'moderate')
  if (!limited.success) return limited.response

  try {
    const parsed = schema.parse(await request.json())
    const { error } = await supabaseAdmin.from('newsletter_signups').upsert(
      {
        email: parsed.email.toLowerCase(),
        zip: parsed.zip,
        categories: parsed.categories || [],
      },
      { onConflict: 'email' }
    )
    if (error) {
      console.error(error)
      return serverError('Could not subscribe')
    }
    return success({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError) return validationError('Email and ZIP are required')
    return serverError('Could not subscribe')
  }
}
