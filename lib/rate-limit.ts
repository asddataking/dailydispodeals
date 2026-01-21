// Rate limiting utility for API routes
// Uses Upstash Redis for distributed rate limiting (works across serverless functions)
// Falls back to in-memory if Upstash is not configured

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

// Simple in-memory rate limiter (fallback)
class MemoryRateLimiter {
  private store: Map<string, { count: number; resetTime: number }> = new Map()
  private cleanupInterval: NodeJS.Timeout

  constructor(private maxRequests: number, private windowMs: number) {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      for (const [key, value] of this.store.entries()) {
        if (now > value.resetTime) {
          this.store.delete(key)
        }
      }
    }, 60000)
  }

  async check(identifier: string): Promise<RateLimitResult> {
    const now = Date.now()
    const entry = this.store.get(identifier)

    if (!entry || now > entry.resetTime) {
      // Create new entry
      this.store.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      })
      return {
        success: true,
        limit: this.maxRequests,
        remaining: this.maxRequests - 1,
        reset: now + this.windowMs,
      }
    }

    if (entry.count >= this.maxRequests) {
      return {
        success: false,
        limit: this.maxRequests,
        remaining: 0,
        reset: entry.resetTime,
      }
    }

    entry.count++
    return {
      success: true,
      limit: this.maxRequests,
      remaining: this.maxRequests - entry.count,
      reset: entry.resetTime,
    }
  }
}

// Upstash Redis rate limiter (production)
async function upstashRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult | null> {
  try {
    const { Ratelimit } = await import('@upstash/ratelimit')
    const { Redis } = await import('@upstash/redis')

    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return null // Fallback to memory
    }

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })

    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(maxRequests, `${windowMs} ms`),
      analytics: true,
    })

    const result = await ratelimit.limit(identifier)
    
    return {
      success: result.success,
      limit: maxRequests,
      remaining: result.remaining,
      reset: result.reset,
    }
  } catch (error) {
    console.error('Upstash rate limit error:', error)
    return null // Fallback to memory
  }
}

// Memory rate limiters (fallback)
const rateLimiters = {
  // Strict rate limiting for authentication/payment endpoints
  strict: new MemoryRateLimiter(5, 60 * 1000), // 5 requests per minute
  
  // Moderate rate limiting for API endpoints
  moderate: new MemoryRateLimiter(60, 60 * 1000), // 60 requests per minute
  
  // Lenient rate limiting for public endpoints
  lenient: new MemoryRateLimiter(100, 60 * 1000), // 100 requests per minute
}

/**
 * Get client identifier from request (IP address or API key)
 */
function getIdentifier(request: Request): string {
  // Try to get IP from headers (Vercel sets this)
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwardedFor?.split(',')[0] || realIp || 'unknown'

  // Could also use API key if present
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    // For cron jobs, use token as identifier
    if (token === process.env.CRON_SECRET || token === process.env.INGESTION_CRON_SECRET) {
      return `cron:${token.substring(0, 8)}` // Allow unlimited for cron jobs
    }
  }

  return ip
}

export type RateLimitType = 'strict' | 'moderate' | 'lenient'

/**
 * Rate limit middleware for API routes
 */
export async function rateLimit(
  request: Request,
  type: RateLimitType = 'moderate'
): Promise<{ success: true } | { success: false; response: Response }> {
  const identifier = getIdentifier(request)

  // Allow cron jobs to bypass rate limiting
  if (identifier.startsWith('cron:')) {
    return { success: true }
  }

  // Try Upstash first, fall back to memory
  let result: RateLimitResult | null = null

  const limits = {
    strict: { max: 5, window: 60 * 1000 },
    moderate: { max: 60, window: 60 * 1000 },
    lenient: { max: 100, window: 60 * 1000 },
  }

  const { max, window } = limits[type]

  // Try Upstash Redis first
  result = await upstashRateLimit(identifier, max, window)

  // Fall back to memory if Upstash not configured
  if (!result) {
    result = await rateLimiters[type].check(identifier)
  }

  if (!result.success) {
    return {
      success: false,
      response: new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `Too many requests. Please try again in ${Math.ceil((result.reset - Date.now()) / 1000)} seconds.`,
          retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': result.limit.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.reset.toString(),
            'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
          },
        }
      ),
    }
  }

  return { success: true }
}
