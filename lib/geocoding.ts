import * as Sentry from '@sentry/nextjs'

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

// In-memory cache for geocoding results
// ZIP codes don't change, so we can cache indefinitely
const geocodeCache = new Map<string, { result: GeocodeResult | null; cachedAt: number }>()

// Optional: Clean up very old entries (24 hours TTL, though ZIP codes are stable)
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 // 24 hours
const CLEANUP_INTERVAL_MS = 1000 * 60 * 60 // Clean up every hour

// Set up periodic cleanup (only once)
let cleanupInterval: NodeJS.Timeout | null = null
if (typeof setInterval !== 'undefined' && !cleanupInterval) {
  cleanupInterval = setInterval(() => {
    const now = Date.now()
    for (const [zip, entry] of geocodeCache.entries()) {
      if (now - entry.cachedAt > CACHE_TTL_MS) {
        geocodeCache.delete(zip)
      }
    }
  }, CLEANUP_INTERVAL_MS)
}

/**
 * Geocode a zip code to get latitude/longitude
 * Results are cached in-memory to avoid duplicate API calls
 */
export async function geocodeZip(zip: string): Promise<GeocodeResult | null> {
  // Normalize ZIP (first 5 digits)
  const normalizedZip = zip.trim().substring(0, 5)

  // Check cache first
  const cached = geocodeCache.get(normalizedZip)
  if (cached) {
    return cached.result
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    const { logger } = Sentry
    logger.warn('GOOGLE_MAPS_API_KEY not configured, skipping geocoding', { zip: normalizedZip })
    Sentry.captureMessage('GOOGLE_MAPS_API_KEY not configured; geocoding skipped', {
      level: 'warning',
      tags: { feature: 'geocoding' },
      extra: { zip: normalizedZip },
    })
    // Cache null result to avoid retrying
    geocodeCache.set(normalizedZip, { result: null, cachedAt: Date.now() })
    return null
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(normalizedZip)}&key=${apiKey}`
    )

    if (!response.ok) {
      const err = new Error(`Geocoding API error: ${response.status}`)
      Sentry.captureException(err, { tags: { feature: 'geocoding' }, extra: { zip: normalizedZip, status: response.status } })
      // Cache null result to avoid retrying failed lookups
      geocodeCache.set(normalizedZip, { result: null, cachedAt: Date.now() })
      return null
    }

    const data = await response.json()

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      const { logger } = Sentry
      logger.warn('Geocoding failed for zip', { zip: normalizedZip, status: data.status })
      Sentry.captureMessage('Geocoding returned no results for zip', {
        level: 'warning',
        tags: { feature: 'geocoding' },
        extra: { zip: normalizedZip, status: data.status, error_message: data.error_message },
      })
      // Cache null result
      geocodeCache.set(normalizedZip, { result: null, cachedAt: Date.now() })
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

    const result: GeocodeResult = {
      latitude: location.lat,
      longitude: location.lng,
      city,
      state,
    }

    // Cache successful result
    geocodeCache.set(normalizedZip, { result, cachedAt: Date.now() })

    return result
  } catch (error) {
    const { logger } = Sentry
    logger.error('Geocoding error', { zip: normalizedZip, error: error instanceof Error ? error.message : String(error) })
    Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
      tags: { feature: 'geocoding' },
      extra: { zip: normalizedZip },
    })
    // Cache null result on error
    geocodeCache.set(normalizedZip, { result: null, cachedAt: Date.now() })
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
