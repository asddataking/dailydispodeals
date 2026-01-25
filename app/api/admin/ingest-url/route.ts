import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminSession } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/server'
import { updateDispensaryStats } from '@/lib/ingest-deals'
import { success, unauthorized, validationError, serverError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const FLYER_EXT = /\.(pdf|png|jpg|jpeg|webp|gif)(\?|$)/i

const schema = z.object({
  source_url: z.string().url(),
  dispensary_name: z.string().min(1).optional(),
  dispensary_city: z.string().min(1).optional(), // optional; when set, used with dispensary_name for precise match (name+city)
  dispensary_id: z.string().uuid().optional(),
}).refine((d) => d.dispensary_name || d.dispensary_id, {
  message: 'Either dispensary_name or dispensary_id is required',
})

/**
 * POST /api/admin/ingest-url
 * Admin-only: Ingest deals from a URL tied to a dispensary.
 *
 * - HTML deal pages (e.g. https://bowdega.com/deals): use website-deals (1 Gemini call to
 *   extract from HTML). Saves cost vs fetch→OCR→parse and works correctly for direct site URLs.
 * - Image/PDF flyers (.pdf, .png, .jpg, .jpeg, .webp, .gif): use fetch → OCR → parse (2 AI calls).
 *
 * Body: source_url (required), and either dispensary_id or dispensary_name.
 * Optional: dispensary_city for precise match when using dispensary_name.
 * Uses Bearer INGESTION_CRON_SECRET when calling internal ingest routes to bypass rate limits.
 */
export async function POST(request: NextRequest) {
  const session = await getAdminSession()
  if (!session.authenticated) {
    return unauthorized()
  }

  try {
    const body = await request.json()
    const validated = schema.parse(body)

    let dispensaryName: string
    let city: string | null = null

    if (validated.dispensary_id) {
      const { data: disp, error } = await supabaseAdmin
        .from('dispensaries')
        .select('name, city')
        .eq('id', validated.dispensary_id)
        .single()
      if (error || !disp) {
        return validationError('Dispensary not found')
      }
      dispensaryName = disp.name
      city = disp.city ?? null
    } else {
      dispensaryName = validated.dispensary_name!
      let q = supabaseAdmin.from('dispensaries').select('name, city').eq('name', dispensaryName)
      if (validated.dispensary_city) {
        q = q.eq('city', validated.dispensary_city)
      }
      const { data: disp } = await q.maybeSingle()
      if (disp) {
        dispensaryName = disp.name
        city = disp.city ?? null
      } else {
        city = validated.dispensary_city ?? null
      }
    }

    const baseUrl = process.env.APP_URL || 'http://localhost:3000'
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (process.env.INGESTION_CRON_SECRET) {
      headers.Authorization = `Bearer ${process.env.INGESTION_CRON_SECRET}`
    }

    const looksLikeFlyer = FLYER_EXT.test(new URL(validated.source_url).pathname)

    if (!looksLikeFlyer) {
      // HTML deals page: fetch HTML and extract with one Gemini call (website-deals). No OCR.
      const webRes = await fetch(`${baseUrl}/api/ingest/website-deals`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          dispensary_name: dispensaryName,
          website_url: validated.source_url,
          city: city ?? undefined,
        }),
      })
      const webData = await webRes.json()
      if (!webRes.ok) {
        return NextResponse.json(
          { error: webData?.error || 'Website extraction failed', details: webData?.details },
          { status: webRes.status }
        )
      }
      const dealsInserted = webData.deals_inserted ?? 0
      await updateDispensaryStats(dispensaryName, dealsInserted > 0)
      return success({
        deals_inserted: dealsInserted,
        deals: webData.deals ?? [],
        low_confidence_handled: 0,
        flagged_for_review: webData.flagged_for_review ?? 0,
        source: 'website',
      })
    }

    // Flyer path: fetch → OCR → parse
    const fetchRes = await fetch(`${baseUrl}/api/ingest/fetch`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        dispensary_name: dispensaryName,
        source_url: validated.source_url,
      }),
    })
    const fetchData = await fetchRes.json()
    if (!fetchRes.ok) {
      return NextResponse.json(
        { error: fetchData?.error || 'Fetch failed', details: fetchData?.details },
        { status: fetchRes.status }
      )
    }
    if (fetchData.skipped) {
      return success({ deals_inserted: 0, skipped: true, reason: 'duplicate' })
    }
    const filePath = fetchData.file_path
    if (!filePath) {
      return serverError('Fetch did not return file_path')
    }

    const ocrRes = await fetch(`${baseUrl}/api/ingest/ocr`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ file_path: filePath }),
    })
    const ocrData = await ocrRes.json()
    if (!ocrRes.ok) {
      return NextResponse.json(
        { error: ocrData?.error || 'OCR failed' },
        { status: ocrRes.status }
      )
    }
    const ocrText = ocrData.text
    if (!ocrText || typeof ocrText !== 'string') {
      return serverError('OCR did not return text')
    }

    const parseRes = await fetch(`${baseUrl}/api/ingest/parse`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ocr_text: ocrText,
        dispensary_name: dispensaryName,
        city: city ?? undefined,
        source_url: validated.source_url,
      }),
    })
    const parseData = await parseRes.json()
    if (!parseRes.ok) {
      return NextResponse.json(
        { error: parseData?.error || 'Parse failed' },
        { status: parseRes.status }
      )
    }

    const dealsInserted = parseData.deals_inserted ?? 0
    await updateDispensaryStats(dispensaryName, dealsInserted > 0)

    return success({
      deals_inserted: dealsInserted,
      deals: parseData.deals,
      low_confidence_handled: parseData.low_confidence_handled,
      flagged_for_review: parseData.flagged_for_review,
      source: 'flyer',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError('Invalid input', error.errors)
    }
    console.error('Ingest-url API error:', error)
    return serverError('Internal server error')
  }
}
