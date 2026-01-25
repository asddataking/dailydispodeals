import * as Sentry from '@sentry/nextjs'
import { geocodeZip, calculateDistance } from './geocoding'
import { supabaseAdmin } from './supabase/server'
import { searchDispensariesNearLocation } from './places'

interface DispensaryCandidate {
  name: string
  city?: string
  zip?: string
  latitude?: number
  longitude?: number
  weedmaps_url?: string
  flyer_url?: string
  place_id?: string
  website?: string
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

  // No existing dispensaries for this zip - discover via Google Places (searchDispensariesNearLocation + Place Details for website)
  try {
    const radiusMeters = Math.min(radiusMiles, 50) * 1609.34 // cap radius to 50 miles
    const places = await searchDispensariesNearLocation(
      zipLocation.latitude,
      zipLocation.longitude,
      radiusMeters,
      20
    )

    const candidates: DispensaryCandidate[] = []

    for (const place of places) {
      const candidate: DispensaryCandidate = {
        name: place.name,
        city: zipLocation.city,
        zip,
        latitude: place.latitude,
        longitude: place.longitude,
        place_id: place.place_id,
        website: place.website,
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
 * When place_id is provided, prefers lookup by place_id to avoid duplicates across discover and process-zones.
 */
export async function addDispensary(
  dispensary: DispensaryCandidate
): Promise<{ id: string } | null> {
  const updateFields = (existing: { id: string; city?: string; zip?: string; latitude?: number; longitude?: number; weedmaps_url?: string; flyer_url?: string; website?: string }) => ({
    city: dispensary.city || existing.city,
    zip: dispensary.zip || existing.zip,
    latitude: dispensary.latitude || existing.latitude,
    longitude: dispensary.longitude || existing.longitude,
    weedmaps_url: dispensary.weedmaps_url || existing.weedmaps_url,
    flyer_url: dispensary.flyer_url || existing.flyer_url,
    website: dispensary.website ?? existing.website,
    active: true,
    updated_at: new Date().toISOString(),
  })

  // When place_id is present, try lookup by place_id first (dedupe with process-zones)
  if (dispensary.place_id) {
    const { data: byPlaceId } = await supabaseAdmin
      .from('dispensaries')
      .select('id, city, zip, latitude, longitude, weedmaps_url, flyer_url, website')
      .eq('place_id', dispensary.place_id)
      .single()

    if (byPlaceId) {
      const { data, error } = await supabaseAdmin
        .from('dispensaries')
        .update(updateFields(byPlaceId))
        .eq('id', byPlaceId.id)
        .select('id')
        .single()
      if (error) {
        console.error('Error updating dispensary by place_id:', error)
        return null
      }
      return data ? { id: data.id } : null
    }

    // Not found by place_id; try by name to link place_id and website to existing row
    const { data: byName } = await supabaseAdmin
      .from('dispensaries')
      .select('id, city, zip, latitude, longitude, weedmaps_url, flyer_url, website')
      .eq('name', dispensary.name)
      .single()

    if (byName) {
      const { data, error } = await supabaseAdmin
        .from('dispensaries')
        .update({
          ...updateFields(byName),
          place_id: dispensary.place_id,
        })
        .eq('id', byName.id)
        .select('id')
        .single()
      if (error) {
        console.error('Error updating dispensary by name (link place_id):', error)
        return null
      }
      return data ? { id: data.id } : null
    }

    // Insert new with place_id and website
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
        place_id: dispensary.place_id,
        website: dispensary.website,
        active: true,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error adding dispensary with place_id:', error)
      return null
    }
    return data ? { id: data.id } : null
  }

  // No place_id: legacy behavior (match by name only)
  const { data: existing } = await supabaseAdmin
    .from('dispensaries')
    .select('id, city, zip, latitude, longitude, weedmaps_url, flyer_url, website')
    .eq('name', dispensary.name)
    .single()

  if (existing) {
    const { data, error } = await supabaseAdmin
      .from('dispensaries')
      .update(updateFields(existing))
      .eq('id', existing.id)
      .select('id')
      .single()

    if (error) {
      console.error('Error updating dispensary:', error)
      return null
    }

    return data ? { id: data.id } : null
  }

  // Insert new dispensary (no place_id)
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
      website: dispensary.website,
      active: true,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error adding dispensary:', error)
    return null
  }

  return data ? { id: data.id } : null
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
