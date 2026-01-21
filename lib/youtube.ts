interface YouTubeVideo {
  id: string
  title: string
  description: string
  publishedAt: string
  thumbnailUrl: string
  url: string
}

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

function getYouTubeApiKey(): string | null {
  const apiKey = process.env.GOOGLE_YOUTUBE_API_KEY
  if (!apiKey) {
    console.warn('GOOGLE_YOUTUBE_API_KEY is not set. YouTube API calls will be disabled.')
    return null
  }
  return apiKey
}

/**
 * Get the latest videos for a channel.
 * Expects a channelId (preferred) and optional maxResults (default 2).
 */
export async function getLatestVideosForChannel(
  channelId: string,
  maxResults: number = 2
): Promise<YouTubeVideo[]> {
  const apiKey = getYouTubeApiKey()
  if (!apiKey) return []

  if (!channelId) {
    console.warn('YOUTUBE_CHANNEL_ID is not configured.')
    return []
  }

  const url = new URL(`${YOUTUBE_API_BASE}/search`)
  url.searchParams.set('key', apiKey)
  url.searchParams.set('channelId', channelId)
  url.searchParams.set('part', 'snippet')
  url.searchParams.set('order', 'date')
  url.searchParams.set('type', 'video')
  url.searchParams.set('maxResults', String(maxResults))

  try {
    const response = await fetch(url.toString())
    if (!response.ok) {
      console.error('YouTube API error:', response.status, response.statusText)
      return []
    }

    const data = await response.json()

    if (data.error) {
      console.error('YouTube API error response:', data.error)
      return []
    }

    const items = Array.isArray(data.items) ? data.items : []

    return items
      .map((item: any): YouTubeVideo | null => {
        const videoId = item.id?.videoId
        const snippet = item.snippet
        if (!videoId || !snippet) return null

        const thumbnail =
          snippet.thumbnails?.high?.url ??
          snippet.thumbnails?.medium?.url ??
          snippet.thumbnails?.default?.url ??
          ''

        return {
          id: videoId,
          title: snippet.title ?? '',
          description: snippet.description ?? '',
          publishedAt: snippet.publishedAt ?? '',
          thumbnailUrl: thumbnail,
          url: `https://www.youtube.com/watch?v=${videoId}`,
        }
      })
      .filter((v: YouTubeVideo | null): v is YouTubeVideo => v !== null)
  } catch (error) {
    console.error('Error fetching latest YouTube videos:', error)
    return []
  }
}

/**
 * Helper to get latest videos using channel ID from environment.
 */
export async function getLatestVideosFromEnvChannel(
  maxResults: number = 2
): Promise<YouTubeVideo[]> {
  const channelId = process.env.YOUTUBE_CHANNEL_ID || ''
  return getLatestVideosForChannel(channelId, maxResults)
}

