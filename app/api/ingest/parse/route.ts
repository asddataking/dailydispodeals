import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/server'
import { parseDealsFromText } from '@/lib/ai-parser'

const schema = z.object({
  ocr_text: z.string().min(10),
  dispensary_name: z.string().min(1),
  city: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = schema.parse(body)

    // Parse deals using AI
    const deals = await parseDealsFromText(
      validated.ocr_text,
      validated.dispensary_name,
      validated.city
    )

    if (deals.length === 0) {
      return NextResponse.json({ deals_inserted: 0, deals: [] })
    }

    // Get today's date
    const today = new Date().toISOString().split('T')[0]

    // Get source_url from deal_flyers if available
    const { data: flyer } = await supabaseAdmin
      .from('deal_flyers')
      .select('source_url')
      .eq('dispensary_name', validated.dispensary_name)
      .eq('date', today)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const sourceUrl = flyer?.source_url || null

    // Insert deals
    const dealsToInsert = deals.map(deal => ({
      dispensary_name: validated.dispensary_name,
      city: validated.city || null,
      date: today,
      category: deal.category,
      title: deal.title,
      price_text: deal.price_text,
      source_url: sourceUrl,
    }))

    const { error: insertError } = await supabaseAdmin
      .from('deals')
      .insert(dealsToInsert)

    if (insertError) {
      console.error('Deals insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to insert deals' },
        { status: 500 }
      )
    }

    // Update deal_flyers with deals_extracted count
    if (flyer) {
      await supabaseAdmin
        .from('deal_flyers')
        .update({
          deals_extracted: deals.length,
          processed_at: new Date().toISOString(),
        })
        .eq('dispensary_name', validated.dispensary_name)
        .eq('date', today)
    }

    return NextResponse.json({ deals_inserted: deals.length, deals })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Parse API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
