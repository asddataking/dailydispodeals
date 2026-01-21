import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/server'
import { extractTextFromImage } from '@/lib/ocr'
import { rateLimit } from '@/lib/rate-limit'
import { PDFDocument } from 'pdf-lib'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const schema = z.object({
  file_path: z.string().min(1),
})

export async function POST(request: NextRequest) {
  // Rate limiting - strict for OCR endpoints (expensive operations)
  const rateLimitResult = await rateLimit(request, 'strict')
  if (!rateLimitResult.success) {
    return rateLimitResult.response
  }

  try {
    const body = await request.json()
    const validated = schema.parse(body)

    // Try to reuse cached OCR text if available
    const today = new Date().toISOString().split('T')[0]
    const { data: flyer } = await supabaseAdmin
      .from('deal_flyers')
      .select('id, ocr_text, ocr_processed_at')
      .eq('file_path', validated.file_path)
      .eq('date', today)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (flyer && flyer.ocr_text) {
      return NextResponse.json({
        text: flyer.ocr_text,
        cached: true,
      })
    }

    // Download file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('deal-flyers')
      .download(validated.file_path)

    if (downloadError || !fileData) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    const arrayBuffer = await fileData.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Determine MIME type
    const isPdf = validated.file_path.toLowerCase().endsWith('.pdf')
    let mimeType = 'image/png'
    if (isPdf) {
      mimeType = 'application/pdf'
    } else if (validated.file_path.toLowerCase().endsWith('.jpg') || validated.file_path.toLowerCase().endsWith('.jpeg')) {
      mimeType = 'image/jpeg'
    } else if (validated.file_path.toLowerCase().endsWith('.webp')) {
      mimeType = 'image/webp'
    }

    // For PDFs, convert first page to image (simplified - would need pdf-poppler or similar)
    // For MVP, we'll try OCR on PDF directly if OpenAI supports it
    // Otherwise, we'd need to convert PDF to image first

    // Run OCR
    const result = await extractTextFromImage(buffer, mimeType)

    // Persist OCR result for future reuse
    if (result.text && flyer?.id) {
      try {
        const crypto = await import('crypto')
        const hash = crypto
          .createHash('sha256')
          .update(result.text)
          .digest('hex')

        await supabaseAdmin
          .from('deal_flyers')
          .update({
            ocr_text: result.text,
            ocr_text_hash: hash,
            ocr_processed_at: new Date().toISOString(),
          })
          .eq('id', flyer.id)
      } catch (cacheError) {
        console.error('Failed to cache OCR text:', cacheError)
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    console.error('OCR API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
