import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { z } from 'zod'
import * as Sentry from "@sentry/nextjs"

const DealSchema = z.object({
  category: z.enum(['flower', 'pre-rolls', 'vapes', 'concentrates', 'edibles', 'drinks', 'topicals', 'cbd/thca', 'accessories']),
  title: z.string().min(1),
  brand: z.string().optional(), // Brand/producer name (e.g., "STIIIZY", "Element", "GLTino")
  product_name: z.string().optional(), // Product name without brand (e.g., "1g carts", "Live Resin")
  price_text: z.string().min(1),
  confidence: z.number().min(0).max(1).optional(),
})

export type Deal = z.infer<typeof DealSchema>

const ParseResponseSchema = z.object({
  deals: z.array(DealSchema),
})

/**
 * Parse deals from OCR text using Vercel AI Gateway
 * Supports both OpenAI and Google Gemini models
 */
export async function parseDealsFromText(
  ocrText: string,
  dispensaryName: string,
  city?: string
): Promise<Deal[]> {
  // Prefer Vercel AI Gateway (for rate limit protection), fallback to direct Gemini API
  const geminiApiKey = process.env.GEMINI_API_KEY
  const gatewayApiKey = process.env.AI_GATEWAY_API_KEY
  
  // Determine which provider to use (defaults to Google/Gemini if either key is set, otherwise OpenAI)
  const provider = process.env.AI_MODEL_PROVIDER || (geminiApiKey || gatewayApiKey ? 'google' : 'openai')
  const aiGatewayUrl = process.env.AI_GATEWAY_URL || 'https://gateway.vercel.ai/v1'

  let model: any

  if (provider === 'google') {
    // Use Google Gemini Flash (much cheaper: ~50% cost savings)
    // Prefer gateway for rate limit protection when both keys are available
    const apiKey = gatewayApiKey || geminiApiKey
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY or AI_GATEWAY_API_KEY is required for Google provider')
    }
    
    const google = createGoogleGenerativeAI({
      apiKey,
      ...(gatewayApiKey ? { baseURL: aiGatewayUrl } : {}), // Use baseURL when gateway key is set
    })
    // Gemini 1.5 Flash model
    model = google('gemini-1.5-flash')
  } else {
    // Use OpenAI GPT-4o-mini (default)
    if (!gatewayApiKey) {
      throw new Error('AI_GATEWAY_API_KEY is required for OpenAI provider')
    }
    const openai = createOpenAI({
      apiKey: gatewayApiKey,
      baseURL: aiGatewayUrl,
    })
    model = openai('gpt-4o-mini')
  }

  const systemPrompt = `You are extracting cannabis deal data from a dispensary flyer. Return a JSON array with:
- category (flower, vapes, edibles, etc.)
- title (full product title as shown)
- brand (brand/producer name if present, e.g., "STIIIZY", "Element", "GLTino" - extract from title)
- product_name (product name without brand, e.g., "1g carts", "Live Resin" - extract from title if brand present)
- price_text (e.g. 2/$35, $15/gram, 30% off)
- confidence (0–1)
If brand is not clearly identifiable, leave brand and product_name empty and put full title in title field.
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
      "brand": "STIIIZY",
      "product_name": "1g carts",
      "price_text": "2/$35",
      "confidence": 0.87
    }
  ]
}`

  return Sentry.startSpan(
    {
      op: "ai.parse",
      name: `Parse Deals - ${dispensaryName}`,
    },
    async (span) => {
      span.setAttribute("dispensary", dispensaryName);
      span.setAttribute("city", city || "unknown");
      span.setAttribute("provider", provider);
      span.setAttribute("using_gateway", !!gatewayApiKey);
      span.setAttribute("ocr_text_length", ocrText.length);

      try {
        const result = await generateObject({
          model,
          system: systemPrompt,
          prompt: userPrompt,
          temperature: 0.1,
          schema: ParseResponseSchema,
        });

        // With generateObject, the result.object contains the parsed and validated data
        const parsedData = result.object as { deals: Deal[] };
        
        // Filter deals with confidence < 0.5 (they'll be handled as summary entries)
        const filteredDeals = parsedData.deals.filter(deal => (deal.confidence ?? 1) >= 0.5);
        
        span.setAttribute("deals_found", parsedData.deals.length);
        span.setAttribute("deals_filtered", filteredDeals.length);
        span.setAttribute("usage_tokens", result.usage?.totalTokens || 0);

        const { logger } = Sentry;
        logger.info("AI parsing completed", {
          dispensary: dispensaryName,
          city: city || "unknown",
          dealsFound: parsedData.deals.length,
          dealsFiltered: filteredDeals.length,
          provider,
          usingGateway: !!gatewayApiKey,
        });

        return filteredDeals;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        span.setAttribute("error", true);
        span.setAttribute("error_message", errorMessage);

        const { logger } = Sentry;
        logger.error("AI parsing failed", {
          dispensary: dispensaryName,
          city: city || "unknown",
          provider,
          usingGateway: !!gatewayApiKey,
          error: errorMessage,
        });

        Sentry.captureException(error, {
          tags: {
            operation: "ai_parse",
            dispensary: dispensaryName,
            provider,
          },
          extra: {
            city,
            usingGateway: !!gatewayApiKey,
            ocrTextLength: ocrText.length,
          },
        });

        throw new Error(`AI parsing failed: ${errorMessage}`);
      }
    }
  );
}
