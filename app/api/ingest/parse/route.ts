import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/server'
import { parseDealsFromText } from '@/lib/ai-parser'

const schema = z.object({
  ocr_text: z.string().min(10),
  dispensary_name: z.string().min(1),
  city: z.string().optional(),
  source_url: z.string().url().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = schema.parse(body)

    // Get today's date
    const today = new Date().toISOString().split('T')[0]

    // Get source_url from deal_flyers if not provided
    let sourceUrl = validated.source_url || null
    if (!sourceUrl) {
      const { data: flyer } = await supabaseAdmin
        .from('deal_flyers')
        .select('source_url')
        .eq('dispensary_name', validated.dispensary_name)
        .eq('date', today)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      sourceUrl = flyer?.source_url || null
    }

    let deals: Array<{ category: string; title: string; price_text: string; confidence?: number }> = []
    let aiFailed = false

    try {
      // Parse deals using AI Gateway
      deals = await parseDealsFromText(
        validated.ocr_text,
        validated.dispensary_name,
        validated.city
      )
    } catch (aiError) {
      console.error('AI Gateway parsing failed:', aiError)
      aiFailed = true
      
      // Create a summary-only entry when AI fails
      const summaryEntry = {
        dispensary_name: validated.dispensary_name,
        city: validated.city || null,
        date: today,
        category: 'flower', // Default category for summary
        title: `${validated.dispensary_name} - Deal Flyer Available`,
        price_text: 'See flyer for details',
        source_url: sourceUrl, // Always include source_url for verification
      }

      const { error: insertError } = await supabaseAdmin
        .from('deals')
        .insert(summaryEntry)

      if (insertError) {
        console.error('Summary entry insert error:', insertError)
        return NextResponse.json(
          { error: 'Failed to insert summary entry' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        deals_inserted: 1,
        deals: [summaryEntry],
        ai_failed: true,
        message: 'AI parsing failed, created summary entry',
      })
    }

    // Filter out deals with low confidence (these would also become summary entries)
    const highConfidenceDeals = deals.filter(deal => (deal.confidence ?? 1) >= 0.5)
    const lowConfidenceDeals = deals.filter(deal => (deal.confidence ?? 1) < 0.5)

    // Insert high confidence deals
    let dealsInserted = 0
    if (highConfidenceDeals.length > 0) {
      const dealsToInsert = highConfidenceDeals.map(deal => ({
        dispensary_name: validated.dispensary_name,
        city: validated.city || null,
        date: today,
        category: deal.category,
        title: deal.title,
        price_text: deal.price_text,
        source_url: sourceUrl, // Always include source_url for verification
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

      dealsInserted = dealsToInsert.length
    }

    // For low confidence deals, create a summary entry
    if (lowConfidenceDeals.length > 0) {
      const summaryEntry = {
        dispensary_name: validated.dispensary_name,
        city: validated.city || null,
        date: today,
        category: 'flower', // Default category
        title: `${validated.dispensary_name} - Multiple Deals Available`,
        price_text: 'See flyer for details',
        source_url: sourceUrl,
      }

      await supabaseAdmin
        .from('deals')
        .insert(summaryEntry)

      dealsInserted += 1
    }

    // Update deal_flyers with deals_extracted count
    await supabaseAdmin
      .from('deal_flyers')
      .update({
        deals_extracted: dealsInserted,
        processed_at: new Date().toISOString(),
      })
      .eq('dispensary_name', validated.dispensary_name)
      .eq('date', today)

    return NextResponse.json({
      deals_inserted: dealsInserted,
      deals: highConfidenceDeals,
      low_confidence_handled: lowConfidenceDeals.length > 0,
    })
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
