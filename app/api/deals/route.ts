import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

function parsePrice(priceText: string): number {
  // Try to extract numeric value from price text
  // Examples: "2/$35" -> 17.5, "1g $15" -> 15, "$25 each" -> 25
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
  try {
    const searchParams = request.nextUrl.searchParams
    const email = searchParams.get('email')
    const date = searchParams.get('date')

    // Validate inputs
    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      )
    }

    if (!date || !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return NextResponse.json(
        { error: 'Valid date (YYYY-MM-DD) is required' },
        { status: 400 }
      )
    }

    // Load user by email
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Load user preferences
    const { data: preferences } = await supabaseAdmin
      .from('preferences')
      .select('categories, zip, radius')
      .eq('user_id', user.id)
      .single()

    if (!preferences || !preferences.categories || preferences.categories.length === 0) {
      return NextResponse.json({ deals: [] })
    }

    // Query deals matching date and categories
    // Note: deals.category is a single text field, preferences.categories is an array
    // We need to check if deals.category is IN preferences.categories
    let query = supabaseAdmin
      .from('deals')
      .select('*')
      .eq('date', date)
      .in('category', preferences.categories)

    // If zip provided, filter by location (simplified - would need geocoding for real implementation)
    // For MVP, we'll return all matching deals regardless of zip/radius

    const { data: deals, error: dealsError } = await query

    if (dealsError) {
      console.error('Deals query error:', dealsError)
      return NextResponse.json(
        { error: 'Failed to fetch deals' },
        { status: 500 }
      )
    }

    if (!deals || deals.length === 0) {
      return NextResponse.json({ deals: [] })
    }

    // Score and sort deals
    const scoredDeals = deals.map(deal => ({
      ...deal,
      score: parsePrice(deal.price_text),
    }))

    scoredDeals.sort((a, b) => {
      // Lower price = higher score
      if (a.score !== b.score) {
        return a.score - b.score
      }
      // If same price, prefer newer
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    // Remove score from response
    const result = scoredDeals.map(({ score, ...deal }) => deal)

    return NextResponse.json({ deals: result })
  } catch (error) {
    console.error('Deals API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
