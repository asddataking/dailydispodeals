import { NextRequest, NextResponse } from 'next/server'
import { getAllBrands } from '@/lib/brand-extraction'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/brands
 * Get all brands for preferences UI
 */
export async function GET(request: NextRequest) {
  // Rate limiting - lenient for brands endpoint (public data)
  const rateLimitResult = await rateLimit(request, 'lenient')
  if (!rateLimitResult.success) {
    return rateLimitResult.response
  }

  try {
    const brands = await getAllBrands()
    // Cache brands for 1 hour (brands don't change frequently)
    return NextResponse.json(
      { brands },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    )
  } catch (error) {
    console.error('Brands API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
