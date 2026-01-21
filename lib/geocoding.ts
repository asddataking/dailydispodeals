/**
 * Geocoding utilities for finding dispensaries by location
 */

interface Coordinates {
  latitude: number
  longitude: number
}

interface GeocodeResult {
  latitude: number
  longitude: number
  city?: string
  state?: string
}

/**
 * Geocode a zip code to get latitude/longitude
 */
export async function geocodeZip(zip: string): Promise<GeocodeResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  
  if (!apiKey) {
    console.warn('GOOGLE_MAPS_API_KEY not configured, skipping geocoding')
    return null
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(zip)}&key=${apiKey}`
    )

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.warn(`Geocoding failed for zip ${zip}: ${data.status}`)
      return null
    }

    const location = data.results[0].geometry.location
    const addressComponents = data.results[0].address_components || []
    
    let city: string | undefined
    let state: string | undefined

    for (const component of addressComponents) {
      if (component.types.includes('locality')) {
        city = component.long_name
      }
      if (component.types.includes('administrative_area_level_1')) {
        state = component.short_name
      }
    }

    return {
      latitude: location.lat,
      longitude: location.lng,
      city,
      state,
    }
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

/**
 * Calculate distance between two coordinates in miles (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959 // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Find dispensaries within radius of a location
 * This is a helper function - actual query will be done in the database
 */
export function isWithinRadius(
  centerLat: number,
  centerLng: number,
  targetLat: number,
  targetLng: number,
  radiusMiles: number
): boolean {
  const distance = calculateDistance(centerLat, centerLng, targetLat, targetLng)
  return distance <= radiusMiles
}
