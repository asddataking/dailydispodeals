/**
 * Website deal extraction using Gemini AI
 * Extracts structured deal data from dispensary website HTML
 */

import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { z } from 'zod'

const DealSchema = z.object({
  category: z.enum(['flower', 'pre-rolls', 'vapes', 'concentrates', 'edibles', 'drinks', 'topicals', 'cbd/thca', 'accessories']),
  title: z.string().min(1),
  brand: z.string().optional(),
  product_name: z.string().optional(),
  price_text: z.string().min(1),
  confidence: z.number().min(0).max(1).optional(),
})

const ParseResponseSchema = z.object({
  deals: z.array(DealSchema),
})

export type WebsiteDeal = z.infer<typeof DealSchema>

/**
 * Extract deals from dispensary website HTML using Gemini
 */
export async function extractDealsFromWebsite(
  html: string,
  dispensaryName: string,
  city?: string
): Promise<WebsiteDeal[]> {
  // Prefer Vercel AI Gateway (for rate limit protection), fallback to direct Gemini API
  const geminiApiKey = process.env.GEMINI_API_KEY
  const gatewayApiKey = process.env.AI_GATEWAY_API_KEY
  const apiKey = gatewayApiKey || geminiApiKey
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY or AI_GATEWAY_API_KEY is required')
  }

  const baseURL = gatewayApiKey ? (process.env.AI_GATEWAY_URL || 'https://gateway.vercel.ai/v1') : undefined

  // Use Gemini Flash for cost efficiency
  const google = createGoogleGenerativeAI({
    apiKey,
    ...(baseURL && { baseURL }), // Only use baseURL for gateway, not direct API
  })

  const model = google('gemini-1.5-flash')

  // Clean HTML: remove scripts, styles, and excessive whitespace
  const cleanedHtml = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/\s+/g, ' ')
    .substring(0, 50000) // Limit to ~50k chars to stay within token limits

  const systemPrompt = `You are extracting cannabis deal data from a dispensary website's deals/specials page. 
Return a JSON array with:
- category (flower, vapes, edibles, etc.)
- title (full product title as shown)
- brand (brand/producer name if present, e.g., "STIIIZY", "Element" - extract from title)
- product_name (product name without brand - extract from title if brand present)
- price_text (e.g. 2/$35, $15/gram, 30% off)
- confidence (0–1)

If brand is not clearly identifiable, leave brand and product_name empty and put full title in title field.
Ignore navigation, headers, footers, and non-deal content. Focus on actual product deals and specials.`

  const userPrompt = `Dispensary: ${dispensaryName}
${city ? `City: ${city}` : ''}

Extract all deals from this website HTML:
${cleanedHtml}

Return only valid JSON in this format:
{
  "deals": [
    {
      "category": "vapes",
      "title": "STIIIZY 1g carts",
      "brand": "STIIIZY",
      "product_name": "1g carts",
      "price_text": "2/$35",
      "confidence": 0.87
    }
  ]
}`

  try {
    const result = await generateObject({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.1,
      schema: ParseResponseSchema,
    })

    const parsedData = result.object as { deals: WebsiteDeal[] }
    return parsedData.deals.filter((deal) => (deal.confidence ?? 1) >= 0.5)
  } catch (error) {
    console.error('Website deal extraction error:', error)
    throw new Error(`Website deal extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
