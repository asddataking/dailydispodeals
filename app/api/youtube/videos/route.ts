import { NextRequest, NextResponse } from 'next/server'
import { getLatestVideosFromEnvChannel } from '@/lib/youtube'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

let cachedVideos: any[] | null = null
let cachedAt: number | null = null
// Cache YouTube responses for 6 hours to stay well within quota
const CACHE_TTL_MS = 1000 * 60 * 60 * 6

export async function GET(_request: NextRequest) {
  try {
    const now = Date.now()

    if (cachedVideos && cachedAt && now - cachedAt < CACHE_TTL_MS) {
      return NextResponse.json({ videos: cachedVideos, cached: true })
    }

    const videos = await getLatestVideosFromEnvChannel(2)

    cachedVideos = videos
    cachedAt = now

    return NextResponse.json({ videos, cached: false })
  } catch (error) {
    console.error('YouTube videos API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch YouTube videos' },
      { status: 500 }
    )
  }
}

