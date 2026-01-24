import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getDispensariesNearZip } from '@/lib/dispensary-discovery'
import * as Sentry from "@sentry/nextjs"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  return Sentry.startSpan(
    {
      op: "cron",
      name: "Daily Deal Ingestion",
    },
    async (span) => {
      span.setAttribute("cron.schedule", "0 8 * * *");
      span.setAttribute("cron.type", "ingest-daily");

      // Verify cron secret
      const headersList = await headers()
      const authHeader = headersList.get('authorization')
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        span.setAttribute("error", true);
        span.setAttribute("error_type", "unauthorized");
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }

      const token = authHeader.substring(7)
      if (token !== process.env.INGESTION_CRON_SECRET) {
        span.setAttribute("error", true);
        span.setAttribute("error_type", "unauthorized");
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }

      const today = new Date().toISOString().split('T')[0]
      let processed = 0
      let skipped = 0
      let failed = 0
      let dealsInserted = 0

      try {
        // Get all active users with preferences (zip + radius)
        const { data: usersWithPrefs, error: usersError } = await supabaseAdmin
          .from('preferences')
          .select('user_id, zip, radius')
          .not('zip', 'is', null)
          .not('radius', 'is', null)
          .limit(1000) // Prevent unbounded queries - reasonable limit for cron job

        if (usersError) {
          const { logger } = Sentry;
          logger.error("Error fetching user preferences", {
            error: usersError.message,
          });

          span.setAttribute("error", true);
          Sentry.captureException(usersError, {
            tags: {
              operation: "cron_ingest",
              step: "fetch_preferences",
            },
          });

          return NextResponse.json(
            { error: 'Failed to fetch user preferences' },
            { status: 500 }
          )
        }

        span.setAttribute("users_with_prefs", usersWithPrefs?.length || 0);

        // Get unique zip codes with their max radius
        const zipRadiusMap = new Map<string, number>()
        if (usersWithPrefs) {
          for (const pref of usersWithPrefs) {
            if (pref.zip && pref.radius) {
              const currentRadius = zipRadiusMap.get(pref.zip) || 0
              zipRadiusMap.set(pref.zip, Math.max(currentRadius, pref.radius))
            }
          }
        }

        // Collect all dispensaries that are near any user's zip code
        const dispensariesToProcess = new Map<string, { name: string; city?: string; flyer_url?: string; website?: string }>()
        
        for (const [zip, radius] of zipRadiusMap.entries()) {
          const nearbyDispensaries = await getDispensariesNearZip(zip, radius)
          for (const disp of nearbyDispensaries) {
            if (!dispensariesToProcess.has(disp.name)) {
              dispensariesToProcess.set(disp.name, {
                name: disp.name,
                city: disp.city,
                flyer_url: disp.flyer_url,
              })
            }
          }
        }

        // Also get dispensaries that are active but might not have users yet (for initial setup)
        const { data: allActiveDispensaries } = await supabaseAdmin
          .from('dispensaries')
          .select('name, city, flyer_url, website, ingestion_success_rate')
          .eq('active', true)

        if (allActiveDispensaries) {
          for (const disp of allActiveDispensaries) {
            if (!dispensariesToProcess.has(disp.name) && (disp.flyer_url || disp.website)) {
              dispensariesToProcess.set(disp.name, {
                name: disp.name,
                city: disp.city,
                flyer_url: disp.flyer_url || undefined,
                website: disp.website || undefined,
              })
            }
          }
        }

        let dispensaries = Array.from(dispensariesToProcess.values())

        // Prioritize Weedmaps flyers and higher success-rate dispensaries to maximize value per OCR/AI call
        dispensaries = dispensaries.sort((a, b) => {
          const aIsWeedmaps = a.flyer_url?.includes('weedmaps') ? 1 : 0
          const bIsWeedmaps = b.flyer_url?.includes('weedmaps') ? 1 : 0

          if (aIsWeedmaps !== bIsWeedmaps) {
            return bIsWeedmaps - aIsWeedmaps
          }

          // Prefer flyers over websites (more reliable)
          const aHasFlyer = a.flyer_url ? 1 : 0
          const bHasFlyer = b.flyer_url ? 1 : 0
          if (aHasFlyer !== bHasFlyer) {
            return bHasFlyer - aHasFlyer
          }

          // Fallback: we'll rely on ingestion_success_rate from the joined data if present
          // (default to 1.0 when not available)
          const aStats = allActiveDispensaries?.find(d => d.name === a.name)
          const bStats = allActiveDispensaries?.find(d => d.name === b.name)
          const aRate = aStats?.ingestion_success_rate ?? 1.0
          const bRate = bStats?.ingestion_success_rate ?? 1.0

          return Number(bRate) - Number(aRate)
        })

        span.setAttribute("dispensaries_to_process", dispensaries.length);

        if (dispensaries.length === 0) {
          const { logger } = Sentry;
          logger.info("No dispensaries to process", {
            date: today,
          });

          return NextResponse.json({
            processed: 0,
            skipped: 0,
            failed: 0,
            deals_inserted: 0,
            message: 'No dispensaries to process',
          })
        }

        // Process dispensaries with concurrency limit
        const concurrency = 5
        const successCounts = new Map<string, number>()
        const failureCounts = new Map<string, number>()

        for (let i = 0; i < dispensaries.length; i += concurrency) {
          const batch = dispensaries.slice(i, i + concurrency)
          
          await Promise.all(batch.map(async (dispensary) => {
            try {
              let dealsFromThisDispensary = 0

              // Try flyer and website extraction in parallel for faster processing
              const [flyerResult, websiteResult] = await Promise.allSettled([
                // Flyer ingestion (if available)
                dispensary.flyer_url ? (async () => {
                  try {
                    // Step 1: Fetch flyer
                    const fetchResponse = await fetch(`${process.env.APP_URL}/api/ingest/fetch`, {
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

                    // Step 2: OCR
                    const ocrResponse = await fetch(`${process.env.APP_URL}/api/ingest/ocr`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        file_path: fetchData.file_path,
                      }),
                    })

                    if (!ocrResponse.ok) return 0
                    const ocrData = await ocrResponse.json()

                    // Step 3: Parse
                    const parseResponse = await fetch(`${process.env.APP_URL}/api/ingest/parse`, {
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
                  } catch (error) {
                    const { logger } = Sentry;
                    logger.warn("Flyer ingestion failed", {
                      dispensary: dispensary.name,
                      error: error instanceof Error ? error.message : 'Unknown error',
                    });
                    return 0
                  }
                })() : Promise.resolve(0),

                // Website extraction (if available)
                dispensary.website ? (async () => {
                  try {
                    const website = dispensary.website! // TypeScript: we know it's defined from the check above
                    // Try common deals page paths
                    const possibleUrls = [
                      website.endsWith('/') ? website + 'deals' : website + '/deals',
                      website.endsWith('/') ? website + 'specials' : website + '/specials',
                      website.endsWith('/') ? website + 'menu' : website + '/menu',
                      website, // Fallback to homepage
                    ]

                    for (const url of possibleUrls) {
                      try {
                        const websiteResponse = await fetch(`${process.env.APP_URL}/api/ingest/website-deals`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            dispensary_name: dispensary.name,
                            website_url: url,
                            city: dispensary.city,
                          }),
                        })

                        if (websiteResponse.ok) {
                          const websiteData = await websiteResponse.json()
                          if (websiteData.deals_inserted > 0) {
                            return websiteData.deals_inserted || 0
                          }
                        }
                      } catch (urlError) {
                        // Try next URL
                        continue
                      }
                    }
                    return 0
              } catch (error) {
                const { logger } = Sentry;
                logger.warn("Website extraction failed", {
                  dispensary: dispensary.name,
                  error: error instanceof Error ? error.message : 'Unknown error',
                });
                return 0
              }
                })() : Promise.resolve(0),
              ])

              // Sum up deals from both sources
              if (flyerResult.status === 'fulfilled') {
                dealsFromThisDispensary += flyerResult.value
              }
              if (websiteResult.status === 'fulfilled') {
                dealsFromThisDispensary += websiteResult.value
              }

              if (dealsFromThisDispensary > 0) {
                dealsInserted += dealsFromThisDispensary
                processed++
                successCounts.set(dispensary.name, (successCounts.get(dispensary.name) || 0) + 1)
                await updateDispensaryStats(dispensary.name, true)
              } else {
                if (!dispensary.flyer_url && !dispensary.website) {
                  const { logger } = Sentry;
                  logger.info("Skipping dispensary - no flyer URL or website", {
                    dispensary: dispensary.name,
                  });
                  skipped++
                } else {
                  // Had sources but failed to extract deals
                  failed++
                  failureCounts.set(dispensary.name, (failureCounts.get(dispensary.name) || 0) + 1)
                  await updateDispensaryStats(dispensary.name, false)
                }
              }
            } catch (error) {
              const { logger } = Sentry;
              logger.error("Failed to process dispensary", {
                dispensary: dispensary.name,
                error: error instanceof Error ? error.message : 'Unknown error',
              });

              Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
                tags: {
                  operation: "cron_ingest",
                  step: "process_dispensary",
                },
                extra: {
                  dispensary: dispensary.name,
                },
              });

              failed++
              failureCounts.set(dispensary.name, (failureCounts.get(dispensary.name) || 0) + 1)
              await updateDispensaryStats(dispensary.name, false)
            }
          }))
        }

        span.setAttribute("processed", processed);
        span.setAttribute("skipped", skipped);
        span.setAttribute("failed", failed);
        span.setAttribute("deals_inserted", dealsInserted);

        const { logger } = Sentry;
        logger.info("Daily ingestion completed", {
          date: today,
          processed,
          skipped,
          failed,
          dealsInserted,
          dispensariesProcessed: dispensaries.length,
        });

        return NextResponse.json({
          processed,
          skipped,
          failed,
          deals_inserted: dealsInserted,
          dispensaries_processed: dispensaries.length,
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        span.setAttribute("error", true);
        span.setAttribute("error_message", errorMessage);

        const { logger } = Sentry;
        logger.error("Daily ingestion failed", {
          date: today,
          error: errorMessage,
        });

        Sentry.captureException(error, {
          tags: {
            operation: "cron_ingest",
            cron_type: "ingest-daily",
          },
          extra: {
            date: today,
            processed,
            skipped,
            failed,
            dealsInserted,
          },
        });

        throw error;
      }
    }
  );
}

/**
 * Update dispensary ingestion statistics
 */
async function updateDispensaryStats(dispensaryName: string, success: boolean): Promise<void> {
  try {
    // Get current stats
    const { data: dispensary } = await supabaseAdmin
      .from('dispensaries')
      .select('ingestion_success_rate, last_ingested_at')
      .eq('name', dispensaryName)
      .single()

    if (!dispensary) return

    // Calculate new success rate (simple moving average)
    const currentRate = dispensary.ingestion_success_rate || 1.0
    const newRate = success 
      ? Math.min(1.0, currentRate + 0.1) // Increase on success
      : Math.max(0.0, currentRate - 0.2) // Decrease more on failure

    // Auto-disable if success rate drops below 0.3
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
  } catch (error) {
    const { logger } = Sentry;
    logger.error("Error updating dispensary stats", {
      dispensary: dispensaryName,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
      tags: {
        operation: "update_dispensary_stats",
      },
      extra: {
        dispensary: dispensaryName,
      },
    });
  }
}
