import { NextRequest, NextResponse } from 'next/server'
import { getAllBrands } from '@/lib/brand-extraction'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/brands
 * Get all brands for preferences UI
 */
export async function GET(request: NextRequest) {
  try {
    const brands = await getAllBrands()
    return NextResponse.json({ brands })
  } catch (error) {
    console.error('Brands API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
