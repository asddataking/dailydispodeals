import { NextRequest, NextResponse } from 'next/server'
import { extractTextFromImage } from '@/lib/ocr'
import { parseDealsFromText } from '@/lib/ai-parser'
import { supabaseAdmin } from '@/lib/supabase/server'
import { success, validationError, serverError } from '@/lib/api-response'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, 'strict')
  if (!limited.success) return limited.response

  try {
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return validationError('Upload a flyer image')

    const buffer = Buffer.from(await file.arrayBuffer())
    const mime = file.type || 'image/jpeg'
    const { text } = await extractTextFromImage(buffer, mime)
    const dispensaryName = String(form.get('dispensary_name') || 'Unknown')
    const city = String(form.get('city') || '')
    const deals = text ? await parseDealsFromText(text, dispensaryName, city) : []

    let imageUrl: string | null = null
    try {
      const path = `flyers/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '-')}`
      const { error } = await supabaseAdmin.storage.from('deal-media').upload(path, buffer, {
        contentType: mime,
        upsert: true,
      })
      if (!error) {
        const { data } = supabaseAdmin.storage.from('deal-media').getPublicUrl(path)
        imageUrl = data.publicUrl
      }
    } catch {
      imageUrl = null
    }

    return success({
      deal: deals[0] || null,
      deals,
      image_url: imageUrl,
      ocr_text: text?.slice(0, 2000) || '',
    })
  } catch (error) {
    console.error(error)
    return serverError('Could not read flyer')
  }
}
