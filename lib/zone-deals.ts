/**
 * Zone-based deal filtering and ranking utilities
 */

import { supabaseAdmin } from './supabase/server'
import { geocodeZip, calculateDistance } from './geocoding'

interface DealWithDistance {
  id: string
  dispensary_name: string
  title: string
  price_text: string
  category: string
  date: string
  city: string | null
  source_url: string | null
  created_at: string
  brand_id: string | null
  brands?: { id: string; name: string } | null
  distance?: number // Distance in miles from user's ZIP
}

/**
 * Get dispensary names that are in the user's subscribed zones
 * Optimized to use 2 queries instead of 3 sequential queries
 */
export async function getDispensariesInUserZones(
  email: string
): Promise<string[]> {
  // Query 1: Get user's zone IDs
  const { data: userSubscriptions } = await supabaseAdmin
    .from('user_subscriptions')
    .select('zone_id')
    .eq('email', email)

  if (!userSubscriptions || userSubscriptions.length === 0) {
    return []
  }

  const zoneIds = userSubscriptions.map(sub => sub.zone_id)

  // Query 2: Join zone_dispensaries and dispensaries in one query
  const { data: zoneDispensariesWithNames } = await supabaseAdmin
    .from('zone_dispensaries')
    .select(`
      dispensary_id,
      dispensaries!inner(
        name,
        active
      )
    `)
    .in('zone_id', zoneIds)

  if (!zoneDispensariesWithNames || zoneDispensariesWithNames.length === 0) {
    return []
  }

  // Extract dispensary names (filter for active only)
  const dispensaryNames = new Set<string>()
  for (const zd of zoneDispensariesWithNames) {
    const dispensary = zd.dispensaries as any
    if (dispensary?.active && dispensary?.name) {
      dispensaryNames.add(dispensary.name)
    }
  }

  return Array.from(dispensaryNames)
}

/**
 * Calculate distances for deals from user's ZIP code
 * Returns deals with distance property added
 */
export async function addDistancesToDeals(
  deals: Array<{
    dispensary_name: string
    latitude?: number
    longitude?: number
    [key: string]: any
  }>,
  userZip: string | null
): Promise<DealWithDistance[]> {
  if (!userZip) {
    return deals as DealWithDistance[]
  }

  // Geocode user's ZIP once
  const zipLocation = await geocodeZip(userZip)
  if (!zipLocation) {
    return deals as DealWithDistance[]
  }

  // Get dispensary coordinates
  const dispensaryNames = [...new Set(deals.map(d => d.dispensary_name))]
  const { data: dispensaries } = await supabaseAdmin
    .from('dispensaries')
    .select('name, latitude, longitude')
    .in('name', dispensaryNames)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)

  if (!dispensaries || dispensaries.length === 0) {
    return deals as DealWithDistance[]
  }

  // Create a map of dispensary name -> coordinates
  const dispensaryCoords = new Map<string, { lat: number; lng: number }>()
  for (const d of dispensaries) {
    if (d.latitude && d.longitude) {
      dispensaryCoords.set(d.name, {
        lat: d.latitude,
        lng: d.longitude,
      })
    }
  }

  // Add distance to each deal
  return deals.map(deal => {
    const coords = dispensaryCoords.get(deal.dispensary_name)
    const distance = coords
      ? calculateDistance(
          zipLocation.latitude,
          zipLocation.longitude,
          coords.lat,
          coords.lng
        )
      : undefined

    return {
      ...deal,
      distance,
    } as DealWithDistance
  })
}

/**
 * Rank deals: group duplicates (same title + price) and rank by distance
 * For duplicate deals from different dispensaries:
 * 1. Preferred dispensaries first (if user has preferences - TODO: add preferred_dispensaries field)
 * 2. Distance (closer = better)
 */
export function rankDealsWithDistance(
  deals: DealWithDistance[]
): DealWithDistance[] {
  // Group deals by title + price_text (duplicate detection)
  const dealGroups = new Map<string, DealWithDistance[]>()
  
  for (const deal of deals) {
    const key = `${deal.title.toLowerCase().trim()}|${deal.price_text.toLowerCase().trim()}`
    if (!dealGroups.has(key)) {
      dealGroups.set(key, [])
    }
    dealGroups.get(key)!.push(deal)
  }

  const rankedDeals: DealWithDistance[] = []

  for (const [key, group] of dealGroups) {
    if (group.length === 1) {
      // Single deal, no duplicates
      rankedDeals.push(group[0])
    } else {
      // Multiple dispensaries with same deal - rank by distance
      // TODO: Add preferred dispensaries check here when preferences.dispensaries field is added
      const sorted = [...group].sort((a, b) => {
        // If both have distances, closer is better
        if (a.distance !== undefined && b.distance !== undefined) {
          return a.distance - b.distance
        }
        // If only one has distance, prefer the one with distance
        if (a.distance !== undefined) return -1
        if (b.distance !== undefined) return 1
        // Neither has distance, keep original order
        return 0
      })
      
      // Only include the closest one (or first if no distances)
      rankedDeals.push(sorted[0])
    }
  }

  return rankedDeals
}
