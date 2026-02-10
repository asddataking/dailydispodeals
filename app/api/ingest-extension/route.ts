import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import * as Sentry from '@sentry/nextjs'
import { supabaseAdmin } from '@/lib/supabase/server'
import { success, validationError, unauthorized, serverError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
}

const payloadSchema = z.object({
  source: z.string().min(1).default('chrome_extension'),
  dispensary_name: z.string().min(1),
  dispensary_url: z.string().min(1),
  raw_text: z.string().min(1),
  product_name: z.string().nullable().optional(),
  price_text: z.string().nullable().optional(),
  category_hint: z.string().nullable().optional(),
  page_url: z.string().min(1),
  captured_at: z
    .string()
    .refine((val) => !Number.isNaN(Date.parse(val)), {
      message: 'captured_at must be a valid ISO timestamp',
    }),
})

function withCors<T extends NextResponse>(response: T): T {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  return response
}

function getApiKeyFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim()
  }

  const apiKeyHeader = request.headers.get('x-api-key')
  if (apiKeyHeader) {
    return apiKeyHeader.trim()
  }

  return null
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  })
}

/**
 * POST /api/ingest-extension
 *
 * Ingestion-only endpoint for the Chrome extension to submit raw deal data.
 * Data is stored as-is in the raw_deal_ingest table for later Gemini processing.
 */
export async function POST(request: NextRequest) {
  const { logger } = Sentry

  try {
    const configuredKey = process.env.EXTENSION_INGEST_API_KEY
    if (!configuredKey) {
      logger.error('EXTENSION_INGEST_API_KEY is not configured')
      return withCors(serverError('Extension ingest is not configured'))
    }

    const providedKey = getApiKeyFromRequest(request)
    if (!providedKey || providedKey !== configuredKey) {
      logger.warn('Invalid or missing extension ingest API key')
      return withCors(unauthorized('Invalid API key'))
    }

    const json = await request.json().catch(() => {
      return null
    })

    if (!json || typeof json !== 'object') {
      logger.warn('Invalid JSON payload from extension')
      return withCors(validationError('Invalid JSON payload'))
    }

    const parsed = payloadSchema.safeParse(json)
    if (!parsed.success) {
      if (process.env.NODE_ENV !== 'production') {
        logger.debug('Extension ingest payload validation failed', {
          issues: parsed.error.issues,
        })
      }
      return withCors(validationError('Invalid input', parsed.error.issues))
    }

    const data = parsed.data

    // Insert raw payload for later Gemini processing
    const { data: insertResult, error: insertError } = await supabaseAdmin
      .from('raw_deal_ingest')
      .insert({
        source: data.source || 'chrome_extension',
        dispensary_name: data.dispensary_name,
        dispensary_url: data.dispensary_url,
        raw_text: data.raw_text,
        product_name: data.product_name,
        price_text: data.price_text,
        category_hint: data.category_hint,
        page_url: data.page_url,
        captured_at: new Date(data.captured_at).toISOString(),
        processed: false,
        processing_error: null,
      })
      .select('id')
      .single()

    if (insertError || !insertResult) {
      Sentry.captureException(insertError ?? new Error('Unknown insert error in raw_deal_ingest'))
      logger.error('Failed to insert raw deal ingest record', {
        code: insertError?.code,
        message: insertError?.message,
        details: insertError?.details,
      })
      return withCors(serverError('Failed to store deal data'))
    }

    // Avoid logging raw_text in production to keep logs lean and privacy-safe
    if (process.env.NODE_ENV !== 'production') {
      logger.info('Raw deal ingest stored', {
        id: insertResult.id,
        dispensary_name: data.dispensary_name,
        page_url: data.page_url,
        source: data.source,
      })
    } else {
      logger.info('Raw deal ingest stored', {
        id: insertResult.id,
        dispensary_name: data.dispensary_name,
        page_url: data.page_url,
      })
    }

    // Gemini normalization and processing will later consume rows from raw_deal_ingest
    // where processed = false and update processed/processing_error accordingly.
    return withCors(
      success(
        {
          id: insertResult.id,
        },
        undefined,
        200
      )
    )
  } catch (err: any) {
    Sentry.captureException(err)
    const { logger } = Sentry
    logger.error('Unexpected error in /api/ingest-extension', {
      message: err?.message,
      stack: err?.stack,
    })
    return withCors(serverError('Internal server error'))
  }
}

