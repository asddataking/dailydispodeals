/**
 * Google Places API utilities for dispensary discovery
 */

interface PlaceResult {
  place_id: string
  name: string
  address?: string
  latitude: number
  longitude: number
  phone?: string
  website?: string
}

/**
 * Search for dispensaries near a location using Google Places Text Search
 */
export async function searchDispensariesNearLocation(
  latitude: number,
  longitude: number,
  radiusMeters: number,
  maxResults: number = 20
): Promise<PlaceResult[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY not configured')
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json')
    url.searchParams.set('key', apiKey)
    url.searchParams.set('query', 'cannabis dispensary')
    url.searchParams.set('location', `${latitude},${longitude}`)
    url.searchParams.set('radius', String(Math.round(radiusMeters)))

    const response = await fetch(url.toString())
    if (!response.ok) {
      throw new Error(`Places API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.status && data.status !== 'OK') {
      if (data.status === 'OVER_QUERY_LIMIT' || data.status === 'RESOURCE_EXHAUSTED') {
        throw new Error(`Places API quota exceeded: ${data.status}`)
      }
      throw new Error(`Places API error: ${data.status} - ${data.error_message || ''}`)
    }

    const results: any[] = Array.isArray(data.results) ? data.results : []
    const places: PlaceResult[] = []

    for (const place of results.slice(0, maxResults)) {
      const location = place.geometry?.location
      if (!location?.lat || !location?.lng || !place.place_id || !place.name) {
        continue
      }

      // Text Search does not return website; always call Place Details to get website (and phone)
      const details = await getPlaceDetails(place.place_id)

      places.push({
        place_id: place.place_id,
        name: place.name,
        address: details?.address ?? place.formatted_address,
        latitude: location.lat,
        longitude: location.lng,
        phone: details?.phone ?? place.formatted_phone_number,
        website: details?.website ?? place.website,
      })
    }

    return places
  } catch (error) {
    console.error('Places API search error:', error)
    throw error
  }
}

/**
 * Get detailed place information including website and phone
 * Uses Place Details API for richer data
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY not configured')
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
    url.searchParams.set('key', apiKey)
    url.searchParams.set('place_id', placeId)
    url.searchParams.set('fields', 'place_id,name,formatted_address,geometry,formatted_phone_number,website')

    const response = await fetch(url.toString())
    if (!response.ok) {
      throw new Error(`Places Details API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.status !== 'OK' || !data.result) {
      console.warn(`Place details failed for ${placeId}: ${data.status}`)
      return null
    }

    const result = data.result
    const location = result.geometry?.location

    if (!location?.lat || !location?.lng) {
      return null
    }

    return {
      place_id: result.place_id,
      name: result.name,
      address: result.formatted_address,
      latitude: location.lat,
      longitude: location.lng,
      phone: result.formatted_phone_number,
      website: result.website,
    }
  } catch (error) {
    console.error('Place details API error:', error)
    return null
  }
}
