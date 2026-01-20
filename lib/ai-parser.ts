import OpenAI from 'openai'
import { z } from 'zod'

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null

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

export async function parseDealsFromText(
  ocrText: string,
  dispensaryName: string,
  city?: string
): Promise<Deal[]> {
  if (!openai) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const prompt = `Extract all cannabis deals from this dispensary flyer text. 
Return a JSON array with objects containing: category, title, price_text, and optional confidence (0-1).

Categories must be one of: flower, pre-rolls, vapes, concentrates, edibles, drinks, topicals, cbd/thca, accessories
Price format examples: "2/$35", "1g $15", "30% off", "$25 each", "3/$60"

Dispensary: ${dispensaryName}
${city ? `City: ${city}` : ''}

Text:
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
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that extracts structured deal information from dispensary flyer text. Always return valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from OpenAI')
    }

    const parsed = JSON.parse(content)
    const validated = ParseResponseSchema.parse(parsed)
    
    // Filter by confidence if provided (default threshold: 0.7)
    return validated.deals.filter(deal => (deal.confidence ?? 1) >= 0.7)
  } catch (error) {
    console.error('AI parsing error:', error)
    throw new Error(`AI parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
