import { geocodeZip, calculateDistance } from './geocoding'
import { supabaseAdmin } from './supabase/server'

interface DispensaryCandidate {
  name: string
  city?: string
  zip?: string
  latitude?: number
  longitude?: number
  weedmaps_url?: string
  flyer_url?: string
}

/**
 * Discover dispensaries near a zip code
 * For MVP, we'll use a simple approach - in production, integrate with Weedmaps API or directory
 */
export async function discoverDispensariesForZip(
  zip: string,
  radiusMiles: number
): Promise<DispensaryCandidate[]> {
  // Geocode the zip code
  const zipLocation = await geocodeZip(zip)
  
  if (!zipLocation) {
    console.warn(`Could not geocode zip ${zip}`)
    return []
  }

  // Check if we've already discovered dispensaries for this zip
  const { data: existing } = await supabaseAdmin
    .from('dispensaries')
    .select('*')
    .eq('zip', zip)
    .eq('active', true)

  if (existing && existing.length > 0) {
    // Already have dispensaries for this zip, return them
    return existing.map(d => ({
      name: d.name,
      city: d.city,
      zip: d.zip,
      latitude: d.latitude,
      longitude: d.longitude,
      weedmaps_url: d.weedmaps_url,
      flyer_url: d.flyer_url,
    }))
  }

  // For MVP: Return empty array - manual dispensary addition
  // In production: Integrate with Weedmaps API or dispensary directory
  // This is a placeholder for future integration
  console.log(`Discovery for zip ${zip} - manual dispensary addition required for MVP`)
  
  return []
}

/**
 * Add a dispensary to the database
 * Used when manually adding or when discovered via API
 */
export async function addDispensary(
  dispensary: DispensaryCandidate
): Promise<{ id: string } | null> {
  // Check if dispensary already exists
  const { data: existing } = await supabaseAdmin
    .from('dispensaries')
    .select('id, city, zip, latitude, longitude, weedmaps_url, flyer_url')
    .eq('name', dispensary.name)
    .single()

  if (existing) {
    // Update existing dispensary
    const { data, error } = await supabaseAdmin
      .from('dispensaries')
      .update({
        city: dispensary.city || existing.city,
        zip: dispensary.zip || existing.zip,
        latitude: dispensary.latitude || existing.latitude,
        longitude: dispensary.longitude || existing.longitude,
        weedmaps_url: dispensary.weedmaps_url || existing.weedmaps_url,
        flyer_url: dispensary.flyer_url || existing.flyer_url,
        active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('id')
      .single()

    if (error) {
      console.error('Error updating dispensary:', error)
      return null
    }

    return { id: data.id }
  }

  // Insert new dispensary
  const { data, error } = await supabaseAdmin
    .from('dispensaries')
    .insert({
      name: dispensary.name,
      city: dispensary.city,
      zip: dispensary.zip,
      latitude: dispensary.latitude,
      longitude: dispensary.longitude,
      weedmaps_url: dispensary.weedmaps_url,
      flyer_url: dispensary.flyer_url,
      active: true,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error adding dispensary:', error)
    return null
  }

  return { id: data.id }
}

/**
 * Get dispensaries within radius of a zip code
 * Uses database query with geospatial filtering
 */
export async function getDispensariesNearZip(
  zip: string,
  radiusMiles: number
): Promise<Array<{ id: string; name: string; city?: string; flyer_url?: string }>> {
  const zipLocation = await geocodeZip(zip)
  
  if (!zipLocation) {
    return []
  }

  // Get all active dispensaries
  const { data: dispensaries, error } = await supabaseAdmin
    .from('dispensaries')
    .select('id, name, city, latitude, longitude, flyer_url')
    .eq('active', true)

  if (error || !dispensaries) {
    console.error('Error fetching dispensaries:', error)
    return []
  }

  // Filter by distance
  const nearby = dispensaries
    .filter(d => {
      if (!d.latitude || !d.longitude) return false
      const distance = calculateDistance(
        zipLocation.latitude,
        zipLocation.longitude,
        d.latitude,
        d.longitude
      )
      return distance <= radiusMiles
    })
    .map(d => ({
      id: d.id,
      name: d.name,
      city: d.city,
      flyer_url: d.flyer_url,
    }))

  return nearby
}
