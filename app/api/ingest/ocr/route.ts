import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/server'
import { extractTextFromImage } from '@/lib/ocr'
import { PDFDocument } from 'pdf-lib'

const schema = z.object({
  file_path: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = schema.parse(body)

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
