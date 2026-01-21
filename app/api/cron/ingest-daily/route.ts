import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getDispensariesNearZip } from '@/lib/dispensary-discovery'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  // Verify cron secret
  const headersList = await headers()
  const authHeader = headersList.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const token = authHeader.substring(7)
  if (token !== process.env.INGESTION_CRON_SECRET) {
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

  // Get all active users with preferences (zip + radius)
  const { data: usersWithPrefs, error: usersError } = await supabaseAdmin
    .from('preferences')
    .select('user_id, zip, radius')
    .not('zip', 'is', null)
    .not('radius', 'is', null)

  if (usersError) {
    console.error('Error fetching user preferences:', usersError)
    return NextResponse.json(
      { error: 'Failed to fetch user preferences' },
      { status: 500 }
    )
  }

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

  if (dispensaries.length === 0) {
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

        // Try flyer ingestion first (if available)
        if (dispensary.flyer_url) {
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

            if (fetchResponse.ok) {
              const fetchData = await fetchResponse.json()
              if (!fetchData.skipped) {
                // Step 2: OCR
                const ocrResponse = await fetch(`${process.env.APP_URL}/api/ingest/ocr`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    file_path: fetchData.file_path,
                  }),
                })

                if (ocrResponse.ok) {
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

                  if (parseResponse.ok) {
                    const parseData = await parseResponse.json()
                    dealsFromThisDispensary += parseData.deals_inserted || 0
                  }
                }
              }
            }
          } catch (flyerError) {
            console.warn(`Flyer ingestion failed for ${dispensary.name}, trying website:`, flyerError)
          }
        }

        // Try website extraction if no deals from flyer (or as alternative source)
        if (dispensary.website && dealsFromThisDispensary === 0) {
          try {
            // Try common deals page paths
            const possibleUrls = [
              dispensary.website.endsWith('/') ? dispensary.website + 'deals' : dispensary.website + '/deals',
              dispensary.website.endsWith('/') ? dispensary.website + 'specials' : dispensary.website + '/specials',
              dispensary.website.endsWith('/') ? dispensary.website + 'menu' : dispensary.website + '/menu',
              dispensary.website, // Fallback to homepage
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
                    dealsFromThisDispensary += websiteData.deals_inserted || 0
                    break // Success, no need to try other URLs
                  }
                }
              } catch (urlError) {
                // Try next URL
                continue
              }
            }
          } catch (websiteError) {
            console.warn(`Website extraction failed for ${dispensary.name}:`, websiteError)
          }
        }

        if (dealsFromThisDispensary > 0) {
          dealsInserted += dealsFromThisDispensary
          processed++
          successCounts.set(dispensary.name, (successCounts.get(dispensary.name) || 0) + 1)
          await updateDispensaryStats(dispensary.name, true)
        } else {
          if (!dispensary.flyer_url && !dispensary.website) {
            console.log(`Skipping ${dispensary.name}: No flyer URL or website configured`)
            skipped++
          } else {
            // Had sources but failed to extract deals
            failed++
            failureCounts.set(dispensary.name, (failureCounts.get(dispensary.name) || 0) + 1)
            await updateDispensaryStats(dispensary.name, false)
          }
        }
      } catch (error) {
        console.error(`Failed to process ${dispensary.name}:`, error)
        failed++
        failureCounts.set(dispensary.name, (failureCounts.get(dispensary.name) || 0) + 1)
        await updateDispensaryStats(dispensary.name, false)
      }
    }))
  }

  return NextResponse.json({
    processed,
    skipped,
    failed,
    deals_inserted: dealsInserted,
    dispensaries_processed: dispensaries.length,
  })
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
    console.error(`Error updating dispensary stats for ${dispensaryName}:`, error)
  }
}
