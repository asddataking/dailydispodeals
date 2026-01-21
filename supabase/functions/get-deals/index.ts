// Supabase Edge Function: get-deals
// Fast edge-optimized deal querying with user preferences

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function parsePrice(priceText: string): number {
  // Try to extract numeric value from price text
  // Examples: "2/$35" -> 17.5, "1g $15" -> 15, "$25 each" -> 25, "30% off" -> 70
  const priceLower = priceText.toLowerCase().trim()
  
  // Handle percentage discounts (e.g., "30% off", "50% discount")
  // For percentages, return 100 - percent so higher discounts sort first
  const percentMatch = priceLower.match(/(\d+(?:\.\d+)?)\s*%/)
  if (percentMatch) {
    const percent = parseFloat(percentMatch[1])
    return 100 - percent
  }
  
  const match = priceText.match(/(\d+(?:\.\d+)?)/g)
  if (!match || match.length === 0) return Infinity
  
  const numbers = match.map(Number)
  
  if (priceText.includes('/$') && numbers.length >= 2) {
    return numbers[1] / numbers[0]
  }
  
  return numbers[0]
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, date } = await req.json()

    // Validate inputs
    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return new Response(
        JSON.stringify({ error: 'Valid email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!date || !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return new Response(
        JSON.stringify({ error: 'Valid date (YYYY-MM-DD) is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with service role for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Load user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Load user preferences
    const { data: preferences } = await supabase
      .from('preferences')
      .select('categories, brands, zip, radius')
      .eq('user_id', user.id)
      .single()

    if (!preferences || !preferences.categories || preferences.categories.length === 0) {
      return new Response(
        JSON.stringify({ deals: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get dispensaries in user's zones for filtering
    const { data: userSubscriptions } = await supabase
      .from('user_subscriptions')
      .select('zone_id')
      .eq('email', email)

    let dispensariesInZones: string[] = []
    if (userSubscriptions && userSubscriptions.length > 0) {
      const zoneIds = userSubscriptions.map(sub => sub.zone_id)
      
      const { data: zoneDispensaries } = await supabase
        .from('zone_dispensaries')
        .select('dispensary_id')
        .in('zone_id', zoneIds)

      if (zoneDispensaries && zoneDispensaries.length > 0) {
        const dispensaryIds = zoneDispensaries.map(zd => zd.dispensary_id)
        
        const { data: dispensaries } = await supabase
          .from('dispensaries')
          .select('name')
          .in('id', dispensaryIds)
          .eq('active', true)

        if (dispensaries && dispensaries.length > 0) {
          dispensariesInZones = dispensaries.map(d => d.name)
        }
      }
    }

    if (dispensariesInZones.length === 0) {
      return new Response(
        JSON.stringify({ deals: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Filter out stale deals (older than 2 days)
    const requestedDate = new Date(date)
    const twoDaysAgo = new Date(requestedDate)
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
    const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0]

    // Query deals matching date and categories, with brand join
    let query = supabase
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
      .in('dispensary_name', dispensariesInZones)
      .eq('needs_review', false)

    // If user has brand preferences, filter by brands
    if (preferences.brands && preferences.brands.length > 0) {
      const { data: brandIds } = await supabase
        .from('brands')
        .select('id')
        .in('name', preferences.brands)

      if (brandIds && brandIds.length > 0) {
        const ids = brandIds.map(b => b.id)
        query = query.in('brand_id', ids)
      } else {
        return new Response(
          JSON.stringify({ deals: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const { data: deals, error: dealsError } = await query

    if (dealsError) {
      console.error('Deals query error:', dealsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch deals' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!deals || deals.length === 0) {
      return new Response(
        JSON.stringify({ deals: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Group duplicate deals (same title + price) and keep only one per group
    // Note: Distance-based ranking would require geocoding which is expensive in edge functions
    // For now, just deduplicate and sort by price
    const dealGroups = new Map<string, typeof deals[0]>()
    for (const deal of deals) {
      const key = `${deal.title.toLowerCase().trim()}|${deal.price_text.toLowerCase().trim()}`
      if (!dealGroups.has(key)) {
        dealGroups.set(key, deal)
      }
    }

    const uniqueDeals = Array.from(dealGroups.values())

    // Score and sort deals
    const scoredDeals = uniqueDeals.map(deal => ({
      ...deal,
      score: parsePrice(deal.price_text),
    }))

    scoredDeals.sort((a, b) => {
      if (a.score !== b.score) {
        return a.score - b.score
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    const result = scoredDeals.map(({ score, ...deal }) => deal)

    return new Response(
      JSON.stringify({ deals: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
