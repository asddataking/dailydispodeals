import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/server'
import { extractDealsFromWebsite } from '@/lib/website-deals'
import { calculateDealHash, validateDealQuality, flagForReview, type DealWithMetadata } from '@/lib/deal-quality'
import { findOrCreateBrand, extractBrandFromTitle } from '@/lib/brand-extraction'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const schema = z.object({
  dispensary_name: z.string().min(1),
  website_url: z.string().url(),
  city: z.string().optional(),
})

/**
 * POST /api/ingest/website-deals
 * Extract deals from dispensary website using Gemini AI
 * Alternative to flyer-based ingestion
 */
export async function POST(request: NextRequest) {
  // Rate limiting - strict for AI endpoints
  const rateLimitResult = await rateLimit(request, 'strict')
  if (!rateLimitResult.success) {
    return rateLimitResult.response
  }

  try {
    const body = await request.json()
    const validated = schema.parse(body)

    const today = new Date().toISOString().split('T')[0]

    // Fetch HTML from website
    let html: string
    try {
      const response = await fetch(validated.website_url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DailyDispoDeals/1.0; +https://dailydispodeals.com)',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      html = await response.text()
    } catch (fetchError) {
      console.error('Failed to fetch website:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch website', details: fetchError instanceof Error ? fetchError.message : 'Unknown error' },
        { status: 400 }
      )
    }

    if (html.length < 100) {
      return NextResponse.json(
        { error: 'Website content too short or empty' },
        { status: 400 }
      )
    }

    // Extract deals using Gemini
    let deals: Array<{
      category: string
      title: string
      brand?: string
      product_name?: string
      price_text: string
      confidence?: number
    }> = []

    try {
      deals = await extractDealsFromWebsite(html, validated.dispensary_name, validated.city)
    } catch (aiError) {
      console.error('AI extraction failed:', aiError)
      return NextResponse.json(
        { error: 'Failed to extract deals from website', details: aiError instanceof Error ? aiError.message : 'Unknown error' },
        { status: 500 }
      )
    }

    if (deals.length === 0) {
      return NextResponse.json({
        deals_inserted: 0,
        deals: [],
        message: 'No deals found on website',
      })
    }

    // Process and insert deals (similar to parse route)
    let dealsInserted = 0
    let dealsFlaggedForReview = 0

    const dealsToInsert: Array<{ deal: any; reviewReason?: string }> = []

    for (const deal of deals) {
      const dealWithMetadata: DealWithMetadata = {
        category: deal.category as any,
        title: deal.title,
        brand: deal.brand,
        product_name: deal.product_name,
        price_text: deal.price_text,
        confidence: deal.confidence,
        dispensary_name: validated.dispensary_name,
        date: today,
        city: validated.city,
      }

      const dealHash = calculateDealHash(dealWithMetadata)
      const qualityCheck = await validateDealQuality(dealWithMetadata)

      if (!qualityCheck.isValid || qualityCheck.duplicateFound) {
        continue
      }

      // Extract brand
      let brandId: string | null = null
      let productName: string | null = null

      if (deal.brand) {
        brandId = await findOrCreateBrand(deal.brand)
        productName = deal.product_name || deal.title.replace(deal.brand, '').trim()
      } else {
        const extracted = extractBrandFromTitle(deal.title)
        if (extracted.brand) {
          brandId = await findOrCreateBrand(extracted.brand)
          productName = extracted.productName
        }
      }

      const dealToInsert: any = {
        dispensary_name: validated.dispensary_name,
        city: validated.city || null,
        date: today,
        category: deal.category,
        title: deal.title,
        product_name: productName,
        price_text: deal.price_text,
        source_url: validated.website_url,
        brand_id: brandId,
        confidence: deal.confidence ?? 1.0,
        deal_hash: dealHash,
        needs_review: qualityCheck.needsReview,
      }

      dealsToInsert.push({
        deal: dealToInsert,
        reviewReason: qualityCheck.reviewReason,
      })

      if (qualityCheck.needsReview && qualityCheck.reviewReason) {
        dealsFlaggedForReview++
      }
    }

    if (dealsToInsert.length > 0) {
      const dealsForInsertion = dealsToInsert.map((item) => item.deal)

      const { data: insertedDeals, error: insertError } = await supabaseAdmin
        .from('deals')
        .insert(dealsForInsertion)
        .select('id, needs_review')

      if (insertError) {
        console.error('Deals insert error:', insertError)
        return NextResponse.json({ error: 'Failed to insert deals' }, { status: 500 })
      }

      dealsInserted = dealsToInsert.length

      // Flag deals for review
      if (insertedDeals) {
        for (let i = 0; i < insertedDeals.length; i++) {
          const insertedDeal = insertedDeals[i]
          const dealData = dealsToInsert[i]

          if (insertedDeal.needs_review && dealData.reviewReason) {
            await flagForReview(insertedDeal.id, dealData.reviewReason)
          }
        }
      }
    }

    return NextResponse.json({
      deals_inserted: dealsInserted,
      deals: deals.slice(0, dealsInserted),
      flagged_for_review: dealsFlaggedForReview,
      source: 'website',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Website deals API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
