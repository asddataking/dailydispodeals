import OpenAI from 'openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText } from 'ai'

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null

/**
 * Extract text from an image or PDF buffer.
 *
 * Primary path: Gemini via Vercel AI Gateway (cheaper, configurable).
 * Fallback: OpenAI Vision (gpt-4o) if gateway/Gemini is not configured or fails.
 */
export async function extractTextFromImage(
  imageBuffer: Buffer,
  mimeType: string
): Promise<{ text: string; confidence?: number }> {
  // Prefer Vercel AI Gateway (for rate limit protection), fallback to direct Gemini API
  const geminiApiKey = process.env.GEMINI_API_KEY
  const gatewayApiKey = process.env.AI_GATEWAY_API_KEY
  const apiKey = gatewayApiKey || geminiApiKey
  const baseURL = gatewayApiKey ? (process.env.AI_GATEWAY_URL || 'https://gateway.vercel.ai/v1') : undefined

  // Prefer Gemini (direct or via Vercel AI Gateway) when configured
  if (apiKey) {
    try {
      const google = createGoogleGenerativeAI({
        apiKey,
        ...(baseURL && { baseURL }),
      })

      // Use a vision-capable, cost-efficient Gemini model
      const model = google('gemini-2.5-flash-image')

      const result = await generateText({
        model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all text from this dispensary flyer. Return only the text content, no explanations.',
              },
              {
                type: 'file',
                mediaType: mimeType,
                data: imageBuffer,
              },
            ],
          },
        ],
      })

      const text = (result.text || '').trim()
      return { text, confidence: 0.9 }
    } catch (error) {
      console.error('Gemini OCR error (falling back to OpenAI if available):', error)
      // fall through to OpenAI fallback if configured
    }
  }

  // Fallback: OpenAI Vision API if configured
  if (!openai) {
    throw new Error('No OCR provider configured: set GEMINI_API_KEY (direct) or AI_GATEWAY_API_KEY (via gateway) for Gemini, or OPENAI_API_KEY for OpenAI.')
  }

  try {
    const base64Image = imageBuffer.toString('base64')

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all text from this dispensary flyer. Return only the text content, no explanations.',
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 4000,
    })

    const text = (response.choices[0]?.message?.content || '').trim()
    return { text, confidence: 0.9 }
  } catch (error) {
    console.error('OpenAI OCR error:', error)
    throw new Error(`OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
