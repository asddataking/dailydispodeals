import * as Sentry from '@sentry/nextjs'
import { supabaseAdmin } from './supabase/server'

export interface DispensaryForIngest {
  name: string
  city?: string
  flyer_url?: string
  website?: string
}

const APP_URL = process.env.APP_URL || ''

/**
 * Ingest deals for a single dispensary (flyer and/or website).
 * Uses /api/ingest/fetch, ocr, parse and /api/ingest/website-deals.
 * Updates dispensary ingestion stats on success/failure.
 * @returns Number of deals inserted
 */
export async function ingestDealsForDispensary(
  dispensary: DispensaryForIngest
): Promise<number> {
  if (!dispensary.flyer_url && !dispensary.website) {
    return 0
  }

  let dealsInserted = 0

  const [flyerResult, websiteResult] = await Promise.allSettled([
    dispensary.flyer_url && APP_URL
      ? (async () => {
          try {
            const fetchResponse = await fetch(`${APP_URL}/api/ingest/fetch`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                dispensary_name: dispensary.name,
                source_url: dispensary.flyer_url,
              }),
            })
            if (!fetchResponse.ok) return 0
            const fetchData = await fetchResponse.json()
            if (fetchData.skipped) return 0

            const ocrResponse = await fetch(`${APP_URL}/api/ingest/ocr`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ file_path: fetchData.file_path }),
            })
            if (!ocrResponse.ok) return 0
            const ocrData = await ocrResponse.json()

            const parseResponse = await fetch(`${APP_URL}/api/ingest/parse`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ocr_text: ocrData.text,
                dispensary_name: dispensary.name,
                city: dispensary.city,
                source_url: dispensary.flyer_url,
              }),
            })
            if (!parseResponse.ok) return 0
            const parseData = await parseResponse.json()
            return parseData.deals_inserted || 0
          } catch (err) {
            const { logger } = Sentry
            logger.warn('Flyer ingestion failed', {
              dispensary: dispensary.name,
              error: err instanceof Error ? err.message : 'Unknown error',
            })
            return 0
          }
        })()
      : Promise.resolve(0),

    dispensary.website && APP_URL
      ? (async () => {
          try {
            const website = dispensary.website!
            const possibleUrls = [
              website.endsWith('/') ? website + 'deals' : website + '/deals',
              website.endsWith('/') ? website + 'specials' : website + '/specials',
              website.endsWith('/') ? website + 'menu' : website + '/menu',
              website,
            ]
            for (const url of possibleUrls) {
              try {
                const res = await fetch(`${APP_URL}/api/ingest/website-deals`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    dispensary_name: dispensary.name,
                    website_url: url,
                    city: dispensary.city,
                  }),
                })
                if (res.ok) {
                  const data = await res.json()
                  if (data.deals_inserted > 0) return data.deals_inserted || 0
                }
              } catch {
                continue
              }
            }
            return 0
          } catch (err) {
            const { logger } = Sentry
            logger.warn('Website extraction failed', {
              dispensary: dispensary.name,
              error: err instanceof Error ? err.message : 'Unknown error',
            })
            return 0
          }
        })()
      : Promise.resolve(0),
  ])

  if (flyerResult.status === 'fulfilled') dealsInserted += flyerResult.value
  if (websiteResult.status === 'fulfilled') dealsInserted += websiteResult.value

  await updateDispensaryStats(dispensary.name, dealsInserted > 0)
  return dealsInserted
}

/**
 * Update dispensary ingestion_success_rate and last_ingested_at.
 */
export async function updateDispensaryStats(
  dispensaryName: string,
  success: boolean
): Promise<void> {
  try {
    const { data: dispensary } = await supabaseAdmin
      .from('dispensaries')
      .select('ingestion_success_rate, last_ingested_at')
      .eq('name', dispensaryName)
      .single()

    if (!dispensary) return

    const currentRate = dispensary.ingestion_success_rate || 1.0
    const newRate = success
      ? Math.min(1.0, currentRate + 0.1)
      : Math.max(0.0, currentRate - 0.2)
    const shouldBeActive = newRate >= 0.3

    await supabaseAdmin
      .from('dispensaries')
      .update({
        last_ingested_at: new Date().toISOString(),
        ingestion_success_rate: newRate,
        active: shouldBeActive,
        updated_at: new Date().toISOString(),
      })
      .eq('name', dispensaryName)
  } catch (err) {
    const { logger } = Sentry
    logger.error('Error updating dispensary stats', {
      dispensary: dispensaryName,
      error: err instanceof Error ? err.message : 'Unknown error',
    })
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)), {
      tags: { operation: 'update_dispensary_stats' },
      extra: { dispensary: dispensaryName },
    })
  }
}
