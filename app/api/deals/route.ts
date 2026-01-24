import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import * as Sentry from "@sentry/nextjs"
import {
  getDispensariesInUserZones,
  addDistancesToDeals,
  rankDealsWithDistance,
} from '@/lib/zone-deals'
import {
  success,
  validationError,
  notFound,
  serverError,
  rateLimitError,
} from '@/lib/api-response'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function parsePrice(priceText: string): number {
  // Try to extract numeric value from price text
  // Examples: "2/$35" -> 17.5, "1g $15" -> 15, "$25 each" -> 25, "30% off" -> 0.3
  const priceLower = priceText.toLowerCase().trim()
  
  // Handle percentage discounts (e.g., "30% off", "50% discount")
  // For percentages, we can't calculate exact price, so use percentage as a score
  // Higher percentage = better deal, but we'll invert it so lower numbers = better
  const percentMatch = priceLower.match(/(\d+(?:\.\d+)?)\s*%/)
  if (percentMatch) {
    const percent = parseFloat(percentMatch[1])
    // Return negative so higher percentages sort first (we want 50% > 30%)
    // But we want lower numbers to be "better" in sorting, so return 100 - percent
    return 100 - percent
  }
  
  const match = priceText.match(/(\d+(?:\.\d+)?)/g)
  if (!match || match.length === 0) return Infinity
  
  const numbers = match.map(Number)
  
  // If format is "X/$Y", calculate per unit
  if (priceText.includes('/$') && numbers.length >= 2) {
    return numbers[1] / numbers[0]
  }
  
  // Otherwise use the first number found
  return numbers[0]
}

export async function GET(request: NextRequest) {
  // Rate limiting - moderate for deals endpoint
  const rateLimitResult = await rateLimit(request, 'moderate')
  if (!rateLimitResult.success) {
    return rateLimitError('Too many requests. Please try again later.')
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const email = searchParams.get('email')
    const date = searchParams.get('date')

    // Validate inputs
    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return validationError('Valid email is required')
    }

    if (!date || !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return validationError('Valid date (YYYY-MM-DD) is required')
    }

    // Load user by email
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (userError || !user) {
      return notFound('User not found')
    }

    // Load user preferences
    const { data: preferences } = await supabaseAdmin
      .from('preferences')
      .select('categories, brands, zip, radius')
      .eq('user_id', user.id)
      .single()

    if (!preferences || !preferences.categories || preferences.categories.length === 0) {
      return success({ deals: [] })
    }

    // Filter out stale deals (older than 2 days from requested date)
    const requestedDate = new Date(date)
    const twoDaysAgo = new Date(requestedDate)
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
    const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0]

    // Query deals matching date and categories, with brand join
    let query = supabaseAdmin
      .from('deals')
      .select(`
        *,
        brands (
          id,
          name
        )
      `)
      .eq('date', date)
      .gte('date', twoDaysAgoStr) // Only show deals from last 2 days
      .in('category', preferences.categories)
      .eq('needs_review', false) // Only show approved deals
      .limit(100) // Prevent unbounded queries

    // If user has brand preferences, filter by brands
    if (preferences.brands && preferences.brands.length > 0) {
      // Get brand IDs for user's preferred brands
      const { data: brandIds } = await supabaseAdmin
        .from('brands')
        .select('id')
        .in('name', preferences.brands)

      if (brandIds && brandIds.length > 0) {
        const ids = brandIds.map(b => b.id)
        query = query.in('brand_id', ids)
      } else {
        // User has brand preferences but no matching brands found
        // Return empty (or could return all deals - depends on UX preference)
        return success({ deals: [] })
      }
    }

    // Filter deals by zone: only show deals from dispensaries in user's zones
    const dispensariesInZones = await getDispensariesInUserZones(email)
    if (dispensariesInZones.length > 0) {
      query = query.in('dispensary_name', dispensariesInZones)
    } else {
      // User has no zones subscribed, return empty
      return success({ deals: [] })
    }

    const { data: deals, error: dealsError } = await query

    if (dealsError) {
      const { logger } = Sentry;
      logger.error("Deals query error", {
        error: dealsError.message,
        email,
        date,
      });

      Sentry.captureException(dealsError, {
        tags: {
          operation: "deals_api",
          step: "query_deals",
        },
        extra: {
          email,
          date,
        },
      });

      return serverError('Failed to fetch deals', dealsError)
    }

    if (!deals || deals.length === 0) {
      return success({ deals: [] })
    }

    // Add distances for ranking (if user has ZIP)
    const dealsWithDistances = await addDistancesToDeals(
      deals,
      preferences.zip || null
    )

    // Rank deals: group duplicates and rank by distance
    const rankedDeals = rankDealsWithDistance(dealsWithDistances)

    // Score and sort deals by price (lower = better)
    const scoredDeals = rankedDeals.map(deal => ({
      ...deal,
      score: parsePrice(deal.price_text),
    }))

    scoredDeals.sort((a, b) => {
      // Lower price = higher score
      if (a.score !== b.score) {
        return a.score - b.score
      }
      // If same price, prefer closer (if distances available)
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance
      }
      // If same price, prefer newer
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    // Remove score and distance from response (distance is only used for ranking)
    const result = scoredDeals.map(({ score, distance, ...deal }) => deal)

    return success({ deals: result })
  } catch (error) {
    const { logger } = Sentry;
    logger.error("Deals API error", {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
      tags: {
        operation: "deals_api",
      },
    });

    return serverError('Internal server error')
  }
}
