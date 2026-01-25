import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminSession } from '@/lib/admin-auth'
import { getDispensariesNearZip } from '@/lib/dispensary-discovery'
import { success, validationError, serverError, unauthorized } from '@/lib/api-response'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const discoverSchema = z.object({
  zip: z.string().regex(/^\d{5}$/, 'ZIP must be 5 digits'),
  radius: z.union([z.literal(5), z.literal(10), z.literal(25)]).optional().default(25),
})

/**
 * POST /api/admin/discover
 * Manually discover dispensaries for a zip code
 */
export async function POST(request: NextRequest) {
  const session = await getAdminSession()
  if (!session.authenticated) {
    return unauthorized('Unauthorized')
  }

  try {
    const body = await request.json()
    const validated = discoverSchema.parse(body)

    const dispensaries = await getDispensariesNearZip(validated.zip, validated.radius)

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
    console.error('Discovery error:', error)
    return serverError('Internal server error')
  }
}
