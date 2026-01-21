import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/server'
import { downloadFile, computeFileHash } from '@/lib/file-utils'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const schema = z.object({
  dispensary_name: z.string().min(1),
  source_url: z.string().url(),
})

export async function POST(request: NextRequest) {
  // Rate limiting - strict for ingestion endpoints (expensive operations)
  const rateLimitResult = await rateLimit(request, 'strict')
  if (!rateLimitResult.success) {
    return rateLimitResult.response
  }

  try {
    const body = await request.json()
    const validated = schema.parse(body)

    // Download file
    const fileBuffer = await downloadFile(validated.source_url)
    
    // Compute hash
    const hash = computeFileHash(fileBuffer)
    
    // Get today's date
    const today = new Date().toISOString().split('T')[0]

    // Check if flyer already exists
    const { data: existing } = await supabaseAdmin
      .from('deal_flyers')
      .select('id')
      .eq('hash', hash)
      .eq('date', today)
      .single()

    if (existing) {
      return NextResponse.json({ skipped: true, reason: 'duplicate' })
    }

    // Determine file extension from URL or content type
    const url = new URL(validated.source_url)
    const pathname = url.pathname.toLowerCase()
    let ext = 'png'
    if (pathname.endsWith('.pdf')) ext = 'pdf'
    else if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) ext = 'jpg'
    else if (pathname.endsWith('.webp')) ext = 'webp'
    else if (pathname.endsWith('.png')) ext = 'png'

    // Upload to Supabase Storage
    const filePath = `${validated.dispensary_name}/${today}/${hash}.${ext}`
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('deal-flyers')
      .upload(filePath, fileBuffer, {
        contentType: ext === 'pdf' ? 'application/pdf' : `image/${ext}`,
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      )
    }

    // Insert record into deal_flyers
    const { error: insertError } = await supabaseAdmin
      .from('deal_flyers')
      .insert({
        dispensary_name: validated.dispensary_name,
        date: today,
        file_path: filePath,
        source_url: validated.source_url,
        hash,
      })

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to save flyer record' },
        { status: 500 }
      )
    }

    return NextResponse.json({ file_path: filePath, hash, uploaded: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Fetch API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
