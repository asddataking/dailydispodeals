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
  const dispensariesToProcess = new Map<string, { name: string; city?: string; flyer_url?: string }>()
  
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
    .select('name, city, flyer_url')
    .eq('active', true)

  if (allActiveDispensaries) {
    for (const disp of allActiveDispensaries) {
      if (!dispensariesToProcess.has(disp.name) && disp.flyer_url) {
        dispensariesToProcess.set(disp.name, {
          name: disp.name,
          city: disp.city,
          flyer_url: disp.flyer_url,
        })
      }
    }
  }

  const dispensaries = Array.from(dispensariesToProcess.values())

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
        if (!dispensary.flyer_url) {
          console.log(`Skipping ${dispensary.name}: No flyer URL configured`)
          skipped++
          return
        }

        // Step 1: Fetch flyer
        const fetchResponse = await fetch(`${process.env.APP_URL}/api/ingest/fetch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dispensary_name: dispensary.name,
            source_url: dispensary.flyer_url,
          }),
        })

        if (!fetchResponse.ok) {
          const data = await fetchResponse.json()
          if (data.skipped) {
            skipped++
            return
          }
          throw new Error(`Fetch failed: ${fetchResponse.statusText}`)
        }

        const fetchData = await fetchResponse.json()
        if (fetchData.skipped) {
          skipped++
          return
        }

        // Step 2: OCR
        const ocrResponse = await fetch(`${process.env.APP_URL}/api/ingest/ocr`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_path: fetchData.file_path,
          }),
        })

        if (!ocrResponse.ok) {
          throw new Error(`OCR failed: ${ocrResponse.statusText}`)
        }

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

        if (!parseResponse.ok) {
          throw new Error(`Parse failed: ${parseResponse.statusText}`)
        }

        const parseData = await parseResponse.json()
        dealsInserted += parseData.deals_inserted || 0
        processed++
        successCounts.set(dispensary.name, (successCounts.get(dispensary.name) || 0) + 1)

        // Update dispensary last_ingested_at and success rate
        await updateDispensaryStats(dispensary.name, true)
      } catch (error) {
        console.error(`Failed to process ${dispensary.name}:`, error)
        failed++
        failureCounts.set(dispensary.name, (failureCounts.get(dispensary.name) || 0) + 1)
        
        // Update dispensary failure count
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
