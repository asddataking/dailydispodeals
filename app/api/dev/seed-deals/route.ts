import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  // Dev-only protection
  if (process.env.NODE_ENV === 'production') {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    const token = authHeader.substring(7)
    if (token !== process.env.DEV_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
  }

  try {
    const today = new Date().toISOString().split('T')[0]

    const sampleDeals = [
      {
        dispensary_name: 'Greenhouse Lapeer',
        city: 'Lapeer',
        date: today,
        category: 'flower',
        title: '3/$60 Exotic Eighths',
        price_text: '3/$60',
        source_url: null,
      },
      {
        dispensary_name: 'Gage Ferndale',
        city: 'Ferndale',
        date: today,
        category: 'vapes',
        title: '2/$60 Live Resin Carts 2g',
        price_text: '2/$60',
        source_url: null,
      },
      {
        dispensary_name: 'Greenhouse Lapeer',
        city: 'Lapeer',
        date: today,
        category: 'edibles',
        title: '30% Off All Gummies',
        price_text: '30% off',
        source_url: null,
      },
      {
        dispensary_name: 'Gage Ferndale',
        city: 'Ferndale',
        date: today,
        category: 'concentrates',
        title: 'Live Resin 1g',
        price_text: '$35',
        source_url: null,
      },
      {
        dispensary_name: 'Greenhouse Lapeer',
        city: 'Lapeer',
        date: today,
        category: 'pre-rolls',
        title: '5 Pack Pre-Rolls',
        price_text: '2/$25',
        source_url: null,
      },
      {
        dispensary_name: 'Gage Ferndale',
        city: 'Ferndale',
        date: today,
        category: 'drinks',
        title: 'Cannabis Beverages',
        price_text: '$15 each',
        source_url: null,
      },
      {
        dispensary_name: 'Greenhouse Lapeer',
        city: 'Lapeer',
        date: today,
        category: 'topicals',
        title: 'CBD Topicals',
        price_text: '20% off',
        source_url: null,
      },
      {
        dispensary_name: 'Gage Ferndale',
        city: 'Ferndale',
        date: today,
        category: 'cbd/thca',
        title: 'THCA Flower',
        price_text: '$40/eighth',
        source_url: null,
      },
      {
        dispensary_name: 'Greenhouse Lapeer',
        city: 'Lapeer',
        date: today,
        category: 'accessories',
        title: 'Vaporizers',
        price_text: '15% off',
        source_url: null,
      },
      {
        dispensary_name: 'Gage Ferndale',
        city: 'Ferndale',
        date: today,
        category: 'flower',
        title: 'Premium Eighths',
        price_text: '$45',
        source_url: null,
      },
    ]

    const { error } = await supabaseAdmin
      .from('deals')
      .insert(sampleDeals)

    if (error) {
      console.error('Seed error:', error)
      return NextResponse.json(
        { error: 'Failed to seed deals' },
        { status: 500 }
      )
    }

    return NextResponse.json({ inserted: sampleDeals.length })
  } catch (error) {
    console.error('Seed API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
