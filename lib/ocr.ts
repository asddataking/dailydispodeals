import OpenAI from 'openai'

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null

export async function extractTextFromImage(
  imageBuffer: Buffer,
  mimeType: string
): Promise<{ text: string; confidence?: number }> {
  // Use OpenAI Vision API
  if (!openai) {
    throw new Error('OPENAI_API_KEY is not configured')
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

    const text = response.choices[0]?.message?.content || ''
    return { text, confidence: 0.9 }
  } catch (error) {
    console.error('OCR error:', error)
    throw new Error(`OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
