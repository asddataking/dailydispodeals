import OpenAI from 'openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText } from 'ai'
import * as Sentry from "@sentry/nextjs"

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
  return Sentry.startSpan(
    {
      op: "ai.ocr",
      name: "Extract Text from Image",
    },
    async (span) => {
      span.setAttribute("mime_type", mimeType);
      span.setAttribute("image_size_bytes", imageBuffer.length);

      // Prefer Vercel AI Gateway (for rate limit protection), fallback to direct Gemini API
      const geminiApiKey = process.env.GEMINI_API_KEY
      const gatewayApiKey = process.env.AI_GATEWAY_API_KEY
      const apiKey = gatewayApiKey || geminiApiKey
      const baseURL = gatewayApiKey ? (process.env.AI_GATEWAY_URL || 'https://gateway.vercel.ai/v1') : undefined

      span.setAttribute("using_gateway", !!gatewayApiKey);
      span.setAttribute("provider", apiKey ? "gemini" : "openai");

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
          
          span.setAttribute("text_length", text.length);
          span.setAttribute("usage_tokens", result.usage?.totalTokens || 0);

          const { logger } = Sentry;
          logger.info("OCR completed with Gemini", {
            mimeType,
            textLength: text.length,
            usingGateway: !!gatewayApiKey,
          });

          return { text, confidence: 0.9 }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          span.setAttribute("gemini_error", true);
          span.setAttribute("gemini_error_message", errorMessage);

          const { logger } = Sentry;
          logger.warn("Gemini OCR error (falling back to OpenAI if available)", {
            error: errorMessage,
            usingGateway: !!gatewayApiKey,
          });

          Sentry.captureException(error, {
            tags: {
              operation: "ai_ocr",
              provider: "gemini",
            },
            extra: {
              mimeType,
              usingGateway: !!gatewayApiKey,
            },
          });

          // fall through to OpenAI fallback if configured
        }
      }

      // Fallback: OpenAI Vision API if configured
      if (!openai) {
        const error = new Error('No OCR provider configured: set GEMINI_API_KEY (direct) or AI_GATEWAY_API_KEY (via gateway) for Gemini, or OPENAI_API_KEY for OpenAI.');
        
        span.setAttribute("error", true);
        Sentry.captureException(error, {
          tags: {
            operation: "ai_ocr",
            error_type: "configuration",
          },
        });

        throw error;
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
        
        span.setAttribute("text_length", text.length);
        span.setAttribute("provider", "openai");

        const { logger } = Sentry;
        logger.info("OCR completed with OpenAI", {
          mimeType,
          textLength: text.length,
        });

        return { text, confidence: 0.9 }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        span.setAttribute("error", true);
        span.setAttribute("error_message", errorMessage);

        const { logger } = Sentry;
        logger.error("OpenAI OCR error", {
          error: errorMessage,
          mimeType,
        });

        Sentry.captureException(error, {
          tags: {
            operation: "ai_ocr",
            provider: "openai",
          },
          extra: {
            mimeType,
          },
        });

        throw new Error(`OCR failed: ${errorMessage}`)
      }
    }
  );
}
