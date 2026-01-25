import * as Sentry from '@sentry/nextjs'
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
    const { logger } = Sentry
    logger.warn('Could not geocode zip; discover aborted', { zip })
    Sentry.captureMessage('Dispensary discovery aborted: could not geocode zip', {
      level: 'warning',
      tags: { feature: 'dispensary_discovery' },
      extra: { zip, radiusMiles },
    })
    return []
  }

  // Check if we've already discovered dispensaries for this zip
  const { data: existing } = await supabaseAdmin
    .from('dispensaries')
    .select('*')
    .eq('zip', zip)
    .eq('active', true)

  if (existing && existing.length > 0) {
    const { logger } = Sentry
    logger.info('Dispensaries found in DB for zip', { zip, count: existing.length })
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

  // No existing dispensaries for this zip - discover via Google Places
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    const { logger } = Sentry
    logger.warn('GOOGLE_MAPS_API_KEY not configured, skipping dispensary discovery', { zip })
    Sentry.captureMessage('GOOGLE_MAPS_API_KEY not configured; Places discovery skipped', {
      level: 'warning',
      tags: { feature: 'dispensary_discovery' },
      extra: { zip },
    })
    return []
  }

  try {
    const radiusMeters = Math.min(radiusMiles, 50) * 1609.34 // cap radius to 50 miles
    const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json')
    url.searchParams.set('key', apiKey)
    url.searchParams.set('query', 'cannabis dispensary')
    url.searchParams.set('location', `${zipLocation.latitude},${zipLocation.longitude}`)
    url.searchParams.set('radius', String(Math.round(radiusMeters)))

    const response = await fetch(url.toString())
    if (!response.ok) {
      const { logger } = Sentry
      logger.error('Places API error', { status: response.status, statusText: response.statusText, zip })
      Sentry.captureException(new Error(`Places API error: ${response.status} ${response.statusText}`), {
        tags: { feature: 'dispensary_discovery' },
        extra: { zip, radiusMiles, status: response.status },
      })
      return []
    }

    const data = await response.json()

    if (data.status && data.status !== 'OK') {
      const { logger } = Sentry
      logger.warn('Places API non-OK status', { status: data.status, error_message: data.error_message, zip })
      Sentry.captureMessage('Places API returned non-OK status', {
        level: 'warning',
        tags: { feature: 'dispensary_discovery', places_status: data.status },
        extra: { zip, radiusMiles, status: data.status, error_message: data.error_message },
      })
      if (data.status === 'OVER_QUERY_LIMIT' || data.status === 'RESOURCE_EXHAUSTED') {
        return []
      }
    }

    const results: any[] = Array.isArray(data.results) ? data.results : []

    const candidates: DispensaryCandidate[] = []

    for (const place of results) {
      const name = place.name as string | undefined
      if (!name) continue

      const location = place.geometry?.location
      const latitude = typeof location?.lat === 'number' ? location.lat : undefined
      const longitude = typeof location?.lng === 'number' ? location.lng : undefined

      // Extract city and zip from address components if available
      let city: string | undefined
      let placeZip: string | undefined
      const components = place.address_components as any[] | undefined
      if (components) {
        for (const c of components) {
          if (c.types?.includes('locality')) {
            city = c.long_name
          }
          if (c.types?.includes('postal_code')) {
            placeZip = c.long_name
          }
        }
      }

      const candidate: DispensaryCandidate = {
        name,
        city: city || zipLocation.city,
        zip: placeZip || zip,
        latitude,
        longitude,
      }

      candidates.push(candidate)

      // Persist in database (best-effort)
      await addDispensary(candidate)
    }

    const { logger } = Sentry
    logger.info('Places discovery completed', { zip, radiusMiles, found: candidates.length })
    return candidates
  } catch (error) {
    const { logger } = Sentry
    logger.error('Error discovering dispensaries via Places API', {
      zip,
      error: error instanceof Error ? error.message : String(error),
    })
    Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
      tags: { feature: 'dispensary_discovery' },
      extra: { zip, radiusMiles },
    })
    return []
  }
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
): Promise<Array<{ id: string; name: string; city?: string; zip?: string; flyer_url?: string; weedmaps_url?: string }>> {
  const zipLocation = await geocodeZip(zip)

  if (!zipLocation) {
    const { logger } = Sentry
    logger.warn('getDispensariesNearZip: geocode failed, returning []', { zip })
    return []
  }

  // Get all active dispensaries
  const { data: dispensaries, error } = await supabaseAdmin
    .from('dispensaries')
    .select('id, name, city, zip, latitude, longitude, flyer_url, weedmaps_url')
    .eq('active', true)

  if (error || !dispensaries) {
    const { logger } = Sentry
    logger.error('Error fetching dispensaries', { zip, error: error?.message })
    Sentry.captureException(error || new Error('No dispensaries data'), {
      tags: { feature: 'dispensary_discovery' },
      extra: { zip, radiusMiles },
    })
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
      zip: d.zip,
      flyer_url: d.flyer_url,
      weedmaps_url: d.weedmaps_url,
    }))

  const { logger } = Sentry
  if (dispensaries.length > 0 && nearby.length === 0) {
    logger.info('Dispensaries in DB but none within radius', {
      zip,
      radiusMiles,
      totalInDb: dispensaries.length,
    })
  } else {
    logger.info('getDispensariesNearZip result', { zip, radiusMiles, nearby: nearby.length, totalInDb: dispensaries.length })
  }
  return nearby
}

/**
 * Enrich a dispensary with additional details from Google Places.
 * This is a best-effort helper and is safe to call in background jobs.
 */
export async function enrichDispensaryWithPlacesAPI(
  dispensaryName: string,
  zip?: string
): Promise<void> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    console.warn('GOOGLE_MAPS_API_KEY not configured, skipping dispensary enrichment')
    return
  }

  try {
    const query = zip ? `${dispensaryName} dispensary ${zip}` : `${dispensaryName} dispensary`
    const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json')
    url.searchParams.set('key', apiKey)
    url.searchParams.set('query', query)

    const response = await fetch(url.toString())
    if (!response.ok) {
      console.error('Places API (enrich) error:', response.status, response.statusText)
      return
    }

    const data = await response.json()
    if (data.status && data.status !== 'OK') {
      console.warn('Places API (enrich) non-OK status:', data.status, data.error_message)
      if (data.status === 'OVER_QUERY_LIMIT' || data.status === 'RESOURCE_EXHAUSTED') {
        return
      }
    }

    const result = Array.isArray(data.results) && data.results.length > 0 ? data.results[0] : null
    if (!result) return

    const location = result.geometry?.location
    const latitude = typeof location?.lat === 'number' ? location.lat : undefined
    const longitude = typeof location?.lng === 'number' ? location.lng : undefined

    let city: string | undefined
    let placeZip: string | undefined
    const components = result.address_components as any[] | undefined
    if (components) {
      for (const c of components) {
        if (c.types?.includes('locality')) {
          city = c.long_name
        }
        if (c.types?.includes('postal_code')) {
          placeZip = c.long_name
        }
      }
    }

    await supabaseAdmin
      .from('dispensaries')
      .update({
        city: city ?? undefined,
        zip: placeZip ?? zip ?? undefined,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('name', dispensaryName)
  } catch (error) {
    console.error('Error enriching dispensary via Places API:', error)
  }
}
