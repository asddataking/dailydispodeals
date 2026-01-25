import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import * as Sentry from '@sentry/nextjs'
import { getAdminSession } from '@/lib/admin-auth'
import { getDispensariesNearZip, discoverDispensariesForZip } from '@/lib/dispensary-discovery'
import { success, validationError, serverError, unauthorized } from '@/lib/api-response'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const discoverSchema = z.object({
  zip: z.string().regex(/^\d{5}$/, 'ZIP must be 5 digits'),
  radius: z.union([z.literal(5), z.literal(10), z.literal(25)]).optional().default(25),
})

/**
 * POST /api/admin/discover
 * Discover dispensaries for a zip code: DB first, then Google Places if none found.
 */
export async function POST(request: NextRequest) {
  const session = await getAdminSession()
  if (!session.authenticated) {
    return unauthorized('Unauthorized')
  }

  try {
    const body = await request.json()
    const validated = discoverSchema.parse(body)

    const { logger } = Sentry
    logger.info('Discovery started', { zip: validated.zip, radius: validated.radius })

    // 1. Try DB (dispensaries already in DB within radius)
    let dispensaries = await getDispensariesNearZip(validated.zip, validated.radius)

    // 2. If none in DB, discover via Google Places and persist
    if (dispensaries.length === 0) {
      logger.info('No dispensaries in DB for zip, calling Google Places', { zip: validated.zip, radius: validated.radius })
      const discovered = await discoverDispensariesForZip(validated.zip, validated.radius)
      dispensaries = discovered.map(d => ({
        id: '',
        name: d.name,
        city: d.city,
        zip: d.zip,
        flyer_url: d.flyer_url,
        weedmaps_url: d.weedmaps_url,
      }))
      logger.info('Discovery via Places completed', {
        zip: validated.zip,
        found: dispensaries.length,
        source: 'google_places',
      })
      if (dispensaries.length === 0) {
        Sentry.captureMessage('Dispensary discovery returned 0 for zip (geocode or Places may have failed)', {
          level: 'warning',
          tags: { feature: 'discovery', zip: validated.zip, radius: String(validated.radius) },
          extra: { zip: validated.zip, radius: validated.radius },
        })
      }
    } else {
      logger.info('Discovery from DB', { zip: validated.zip, found: dispensaries.length, source: 'db' })
    }

    return success({
      discovered: dispensaries.length,
      zip: validated.zip,
      radius: validated.radius,
      dispensaries: dispensaries.map(d => ({
        name: d.name,
        city: d.city,
        zip: d.zip,
        flyer_url: d.flyer_url,
        weedmaps_url: d.weedmaps_url,
      })),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError('Invalid input', error.errors)
    }
    const { logger } = Sentry
    logger.error('Discovery error', { error: error instanceof Error ? error.message : String(error) })
    Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
      tags: { feature: 'discovery' },
    })
    return serverError('Internal server error')
  }
}
