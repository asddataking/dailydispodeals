import { NextRequest, NextResponse } from 'next/server'
import { getChannelIdFromUsername } from '@/lib/youtube'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/youtube/get-channel-id?username=@DankNDevour
 * 
 * Helper endpoint to discover your YouTube channel ID.
 * You can pass:
 * - @username (e.g., @DankNDevour)
 * - username (e.g., DankNDevour)
 * - Full URL (e.g., youtube.com/@DankNDevour)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const username = searchParams.get('username')

    if (!username) {
      return NextResponse.json(
        { error: 'Please provide a username parameter. Example: ?username=@DankNDevour' },
        { status: 400 }
      )
    }

    const channelId = await getChannelIdFromUsername(username)

    if (!channelId) {
      return NextResponse.json(
        { 
          error: 'Channel not found. Make sure the username is correct and the channel exists.',
          username,
          tip: 'Try using your channel handle (e.g., @DankNDevour) or check your channel URL'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      channelId,
      username,
      message: 'Add this to your .env file:',
      envVar: `YOUTUBE_CHANNEL_ID=${channelId}`
    })
  } catch (error) {
    console.error('Error getting channel ID:', error)
    return NextResponse.json(
      { error: 'Failed to get channel ID' },
      { status: 500 }
    )
  }
}
