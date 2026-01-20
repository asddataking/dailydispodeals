import { z } from 'zod'

const DealSchema = z.object({
  category: z.enum(['flower', 'pre-rolls', 'vapes', 'concentrates', 'edibles', 'drinks', 'topicals', 'cbd/thca', 'accessories']),
  title: z.string().min(1),
  price_text: z.string().min(1),
  confidence: z.number().min(0).max(1).optional(),
})

export type Deal = z.infer<typeof DealSchema>

const ParseResponseSchema = z.object({
  deals: z.array(DealSchema),
})

/**
 * Parse deals from OCR text using Vercel AI Gateway
 */
export async function parseDealsFromText(
  ocrText: string,
  dispensaryName: string,
  city?: string
): Promise<Deal[]> {
  const aiGatewayUrl = process.env.AI_GATEWAY_URL || 'https://gateway.vercel.ai/v1/chat/completions'
  
  if (!process.env.AI_GATEWAY_API_KEY) {
    throw new Error('AI_GATEWAY_API_KEY is not configured')
  }

  const systemPrompt = `You are extracting cannabis deal data from a dispensary flyer. Return a JSON array with:
- category (flower, vapes, edibles, etc.)
- title (short product name)
- price_text (e.g. 2/$35, $15/gram, 30% off)
- confidence (0–1)
Ignore irrelevant text like store hours.`

  const userPrompt = `Dispensary: ${dispensaryName}
${city ? `City: ${city}` : ''}

Extract all deals from this flyer text:
${ocrText}

Return only valid JSON in this format:
{
  "deals": [
    {
      "category": "vapes",
      "title": "STIIIZY 1g carts",
      "price_text": "2/$35",
      "confidence": 0.87
    }
  ]
}`

  try {
    const response = await fetch(aiGatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AI_GATEWAY_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`AI Gateway error: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('No response from AI Gateway')
    }

    const parsed = JSON.parse(content)
    const validated = ParseResponseSchema.parse(parsed)
    
    // Filter deals with confidence < 0.5 (they'll be handled as summary entries)
    return validated.deals.filter(deal => (deal.confidence ?? 1) >= 0.5)
  } catch (error) {
    console.error('AI parsing error:', error)
    throw new Error(`AI parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
