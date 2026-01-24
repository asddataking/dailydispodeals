import { NextRequest } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText, tool } from 'ai'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/server'
import { geocodeZip } from '@/lib/geocoding'
import * as Sentry from "@sentry/nextjs"
import {
  success,
  unauthorized,
  validationError,
  serverError,
} from '@/lib/api-response'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// System prompt for the admin assistant
const SYSTEM_PROMPT = `You are an AI admin assistant for the Daily Dispo Deals application. Your primary role is to help the admin manage the app, answer questions about analytics, and perform administrative tasks.

**Your Capabilities:**
- Answer questions about app analytics, user behavior, and metrics
- Explain how the OCR and parsing pipeline works
- Perform admin actions like adding dispensaries, reviewing deals, checking logs
- Troubleshoot issues with deal extraction and quality checks
- Provide insights about dispensary performance and ingestion success rates

**OCR and Parsing Pipeline:**
The app uses a 3-step ingestion process:
1. **Fetch**: Download flyer images/PDFs from dispensary URLs (Weedmaps, websites)
2. **OCR**: Extract text using Gemini Vision API (gemini-2.5-flash-image model)
   - OCR results are cached in deal_flyers table (ocr_text, ocr_text_hash)
   - If OCR text is too short (<50 chars), creates summary entry instead
3. **Parse**: Use Gemini 1.5 Flash to extract structured deal data
   - Extracts: category, title, brand, product_name, price_text, confidence
   - Filters deals with confidence < 0.5
   - Quality checks: duplicate detection, validation, review flagging
   - Low confidence deals become summary entries

**Database Schema:**
- users: email-based accounts (no passwords, created via Stripe webhook)
- subscriptions: Stripe subscription records (monthly/yearly plans)
- preferences: user deal preferences (categories, brands, zip, radius)
- deals: extracted deal listings with quality metadata
- dispensaries: dispensary configs (name, city, zip, flyer_url, weedmaps_url, active status)
- deal_flyers: flyer tracking (file_path, source_url, hash, ocr_text, deals_extracted)
- deal_reviews: manual review queue for flagged deals
- email_logs: email delivery tracking

**Quality Checks:**
Deals are flagged for review if:
- Confidence < 0.5
- Duplicate hash detected
- Invalid category or price format
- Suspicious patterns detected

Always be helpful, explain your actions, and provide context when answering questions. When performing actions, confirm what you did.`

// Define function schemas
const addDispensarySchema = z.object({
  name: z.string().describe('Dispensary name'),
  city: z.string().optional().describe('City name'),
  zip: z.string().optional().describe('ZIP code (for geocoding)'),
  flyer_url: z.string().url().optional().describe('URL to dispensary flyer/deals page'),
  weedmaps_url: z.string().url().optional().describe('Weedmaps URL'),
})

const updateDispensarySchema = z.object({
  id: z.string().uuid().describe('Dispensary ID'),
  name: z.string().optional().describe('Dispensary name'),
  city: z.string().optional().describe('City name'),
  zip: z.string().optional().describe('ZIP code'),
  flyer_url: z.string().url().optional().describe('Flyer URL'),
  weedmaps_url: z.string().url().optional().describe('Weedmaps URL'),
  active: z.boolean().optional().describe('Active status'),
})

const reviewDealSchema = z.object({
  review_id: z.string().uuid().describe('Review ID'),
  action: z.enum(['approve', 'reject', 'fix']).describe('Action to take'),
  notes: z.string().optional().describe('Optional notes'),
})

const getOcrStatusSchema = z.object({
  dispensary_name: z.string().describe('Dispensary name'),
  date: z.string().optional().describe('Date in YYYY-MM-DD format (defaults to today)'),
})

/**
 * POST /api/admin/chat
 * Chat with Gemini admin assistant
 */
export async function POST(request: NextRequest) {
  // Check admin session
  const session = await getAdminSession()
  if (!session.authenticated) {
    return unauthorized()
  }

  try {
    const body = await request.json()
    const { messages } = body

    if (!messages || !Array.isArray(messages)) {
      return validationError('Messages array required')
    }

    // Prefer Vercel AI Gateway (for rate limit protection), fallback to direct Gemini API
    const geminiApiKey = process.env.GEMINI_API_KEY
    const gatewayApiKey = process.env.AI_GATEWAY_API_KEY
    const apiKey = gatewayApiKey || geminiApiKey
    
    if (!apiKey) {
      return serverError('GEMINI_API_KEY or AI_GATEWAY_API_KEY is required')
    }

    const baseURL = gatewayApiKey ? (process.env.AI_GATEWAY_URL || 'https://gateway.vercel.ai/v1') : undefined

    const google = createGoogleGenerativeAI({
      apiKey,
      ...(baseURL && { baseURL }), // Only use baseURL for gateway, not direct API
    })

    const model = google('gemini-1.5-flash')

    // Define tools (functions) the assistant can call
    const tools = {
      add_dispensary: tool({
        description: 'Add a new dispensary to the system',
        inputSchema: addDispensarySchema,
        execute: async ({ name, city, zip, flyer_url, weedmaps_url }) => {
          try {
            // Geocode zip if provided
            let latitude: number | null = null
            let longitude: number | null = null

            if (zip) {
              const location = await geocodeZip(zip)
              if (location) {
                latitude = location.latitude
                longitude = location.longitude
              }
            }

            const { data, error } = await supabaseAdmin
              .from('dispensaries')
              .insert({
                name,
                city,
                zip,
                state: 'MI',
                flyer_url,
                weedmaps_url,
                active: true,
                latitude,
                longitude,
              })
              .select()
              .single()

            if (error) {
              if (error.code === '23505') {
                return { success: false, error: 'Dispensary with this name already exists' }
              }
              return { success: false, error: error.message }
            }

            return { success: true, dispensary: data }
          } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
          }
        },
      }),

      update_dispensary: tool({
        description: 'Update an existing dispensary',
        inputSchema: updateDispensarySchema,
        execute: async ({ id, ...updates }) => {
          try {
            const updateData: Record<string, any> = {
              ...updates,
              updated_at: new Date().toISOString(),
            }

            // Geocode zip if it's being updated
            if (updates.zip) {
              const location = await geocodeZip(updates.zip)
              if (location) {
                updateData.latitude = location.latitude
                updateData.longitude = location.longitude
              }
            }

            const { data, error } = await supabaseAdmin
              .from('dispensaries')
              .update(updateData)
              .eq('id', id)
              .select()
              .single()

            if (error) {
              return { success: false, error: error.message }
            }

            if (!data) {
              return { success: false, error: 'Dispensary not found' }
            }

            return { success: true, dispensary: data }
          } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
          }
        },
      }),

      get_dispensary_stats: tool({
        description: 'Get statistics for a specific dispensary',
        inputSchema: z.object({
          name: z.string().describe('Dispensary name'),
        }),
        execute: async ({ name }: { name: string }) => {
          try {
            const { data: dispensary } = await supabaseAdmin
              .from('dispensaries')
              .select('*')
              .eq('name', name)
              .single()

            if (!dispensary) {
              return { success: false, error: 'Dispensary not found' }
            }

            // Get recent deals count
            const sevenDaysAgo = new Date()
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
            const { count: recentDeals } = await supabaseAdmin
              .from('deals')
              .select('*', { count: 'exact', head: true })
              .eq('dispensary_name', name)
              .gte('date', sevenDaysAgo.toISOString().split('T')[0])

            // Get recent flyers
            const { data: recentFlyers } = await supabaseAdmin
              .from('deal_flyers')
              .select('date, deals_extracted, processed_at')
              .eq('dispensary_name', name)
              .gte('date', sevenDaysAgo.toISOString().split('T')[0])
              .order('date', { ascending: false })
              .limit(7)

            return {
              success: true,
              dispensary,
              recent_deals_count: recentDeals || 0,
              recent_flyers: recentFlyers || [],
            }
          } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
          }
        },
      }),

      review_deal: tool({
        description: 'Review a pending deal (approve, reject, or mark as fixed)',
        inputSchema: reviewDealSchema,
        execute: async ({ review_id, action, notes }) => {
          try {
            // Get the review
            const { data: review, error: reviewError } = await supabaseAdmin
              .from('deal_reviews')
              .select('deal_id, status')
              .eq('id', review_id)
              .eq('status', 'pending')
              .single()

            if (reviewError || !review) {
              return { success: false, error: 'Review not found or already processed' }
            }

            const reviewedBy = process.env.ADMIN_EMAIL || 'admin'

            if (action === 'approve') {
              await supabaseAdmin
                .from('deals')
                .update({
                  needs_review: false,
                  reviewed_at: new Date().toISOString(),
                  reviewed_by: reviewedBy,
                })
                .eq('id', review.deal_id)

              await supabaseAdmin
                .from('deal_reviews')
                .update({
                  status: 'approved',
                  reviewed_at: new Date().toISOString(),
                  reviewed_by: reviewedBy,
                  notes,
                })
                .eq('id', review_id)

              return { success: true, action: 'approved' }
            } else if (action === 'reject') {
              await supabaseAdmin
                .from('deals')
                .update({
                  reviewed_at: new Date().toISOString(),
                  reviewed_by: reviewedBy,
                })
                .eq('id', review.deal_id)

              await supabaseAdmin
                .from('deal_reviews')
                .update({
                  status: 'rejected',
                  reviewed_at: new Date().toISOString(),
                  reviewed_by: reviewedBy,
                  notes,
                })
                .eq('id', review_id)

              return { success: true, action: 'rejected' }
            } else if (action === 'fix') {
              await supabaseAdmin
                .from('deals')
                .update({
                  needs_review: false,
                  reviewed_at: new Date().toISOString(),
                  reviewed_by: reviewedBy,
                })
                .eq('id', review.deal_id)

              await supabaseAdmin
                .from('deal_reviews')
                .update({
                  status: 'fixed',
                  reviewed_at: new Date().toISOString(),
                  reviewed_by: reviewedBy,
                  notes,
                })
                .eq('id', review_id)

              return { success: true, action: 'fixed' }
            }

            return { success: false, error: 'Invalid action' }
          } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
          }
        },
      }),

      get_statistics: tool({
        description: 'Get app-wide statistics and metrics',
        inputSchema: z.object({
          days: z.number().optional().describe('Number of days to look back (default: 30)'),
        }),
        execute: async ({ days = 30 }: { days?: number }) => {
          try {
            const startDate = new Date()
            startDate.setDate(startDate.getDate() - days)
            const startDateStr = startDate.toISOString().split('T')[0]

            const { count: totalUsers } = await supabaseAdmin
              .from('users')
              .select('*', { count: 'exact', head: true })

            const { count: activeSubscriptions } = await supabaseAdmin
              .from('subscriptions')
              .select('*', { count: 'exact', head: true })
              .eq('status', 'active')

            const { count: dealsCount } = await supabaseAdmin
              .from('deals')
              .select('*', { count: 'exact', head: true })
              .gte('date', startDateStr)

            const { count: activeDispensaries } = await supabaseAdmin
              .from('dispensaries')
              .select('*', { count: 'exact', head: true })
              .eq('active', true)

            const { count: pendingReviews } = await supabaseAdmin
              .from('deal_reviews')
              .select('*', { count: 'exact', head: true })
              .eq('status', 'pending')

            return {
              success: true,
              stats: {
                users: { total: totalUsers || 0 },
                subscriptions: { active: activeSubscriptions || 0 },
                deals: { total: dealsCount || 0 },
                dispensaries: { active: activeDispensaries || 0 },
                reviews: { pending: pendingReviews || 0 },
              },
              date_range: { start: startDateStr, days },
            }
          } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
          }
        },
      }),

      get_ocr_status: tool({
        description: 'Check OCR and parsing status for a dispensary',
        inputSchema: getOcrStatusSchema,
        execute: async ({ dispensary_name, date }) => {
          try {
            const targetDate = date || new Date().toISOString().split('T')[0]

            const { data: flyer, error: flyerError } = await supabaseAdmin
              .from('deal_flyers')
              .select('*')
              .eq('dispensary_name', dispensary_name)
              .eq('date', targetDate)
              .order('created_at', { ascending: false })
              .limit(1)
              .single()

            if (flyerError || !flyer) {
              return {
                success: false,
                error: `No flyer found for ${dispensary_name} on ${targetDate}`,
              }
            }

            // Get deals extracted for this flyer
            const { data: deals } = await supabaseAdmin
              .from('deals')
              .select('id, title, category, confidence, needs_review')
              .eq('dispensary_name', dispensary_name)
              .eq('date', targetDate)

            return {
              success: true,
              flyer: {
                date: flyer.date,
                source_url: flyer.source_url,
                ocr_processed_at: flyer.ocr_processed_at,
                ocr_text_length: flyer.ocr_text?.length || 0,
                deals_extracted: flyer.deals_extracted || 0,
                processed_at: flyer.processed_at,
              },
              deals: deals || [],
            }
          } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
          }
        },
      }),

      get_ingestion_logs: tool({
        description: 'Get ingestion pipeline logs (flyers processed, deals extracted)',
        inputSchema: z.object({
          days: z.number().optional().describe('Number of days to look back (default: 7)'),
        }),
        execute: async ({ days = 7 }: { days?: number }) => {
          try {
            const startDate = new Date()
            startDate.setDate(startDate.getDate() - days)
            const startDateStr = startDate.toISOString().split('T')[0]

            const { data: flyers } = await supabaseAdmin
              .from('deal_flyers')
              .select('dispensary_name, date, deals_extracted, processed_at, ocr_processed_at')
              .gte('date', startDateStr)
              .order('created_at', { ascending: false })
              .limit(100)

            return {
              success: true,
              logs: flyers || [],
              date_range: { start: startDateStr, days },
            }
          } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
          }
        },
      }),
    }

    // Generate response with function calling
    const result = await Sentry.startSpan(
      {
        op: "ai.chat",
        name: "Admin Chat Assistant",
      },
      async (span) => {
        span.setAttribute("message_count", messages.length);
        span.setAttribute("using_gateway", !!gatewayApiKey);
        span.setAttribute("tool_count", Object.keys(tools).length);

        try {
          const result = await generateText({
            model,
            system: SYSTEM_PROMPT,
            messages: messages.map((msg: any) => ({
              role: msg.role,
              content: msg.content,
            })),
            tools,
            // Note: maxSteps/maxToolRoundtrips may not be available in all AI SDK versions
            // Tools will still work, but may require multiple turns for complex operations
          });

          span.setAttribute("usage_tokens", result.usage?.totalTokens || 0);
          span.setAttribute("tool_calls_count", result.toolCalls?.length || 0);

          const { logger } = Sentry;
          logger.info("Admin chat completed", {
            messageCount: messages.length,
            toolCallsCount: result.toolCalls?.length || 0,
            usingGateway: !!gatewayApiKey,
          });

          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          span.setAttribute("error", true);
          span.setAttribute("error_message", errorMessage);

          const { logger } = Sentry;
          logger.error("Admin chat failed", {
            messageCount: messages.length,
            usingGateway: !!gatewayApiKey,
            error: errorMessage,
          });

          Sentry.captureException(error, {
            tags: {
              operation: "ai_admin_chat",
            },
            extra: {
              messageCount: messages.length,
              usingGateway: !!gatewayApiKey,
            },
          });

          throw error;
        }
      }
    );

    return success({
      text: result.text,
      toolCalls: result.toolCalls,
      toolResults: result.toolResults,
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return serverError(error instanceof Error ? error.message : 'Internal server error')
  }
}
