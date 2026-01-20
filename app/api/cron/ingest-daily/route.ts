import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

// Known dispensaries configuration
// In production, this could be stored in a database
const DISPENSARIES = [
  { name: 'Greenhouse Lapeer', url: 'https://example.com/greenhouse-lapeer-flyer.pdf', city: 'Lapeer' },
  { name: 'Gage Ferndale', url: 'https://example.com/gage-ferndale-flyer.pdf', city: 'Ferndale' },
  // Add more dispensaries as needed
]

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

  let processed = 0
  let skipped = 0
  let failed = 0
  let dealsInserted = 0

  // Process dispensaries with concurrency limit
  const concurrency = 5
  for (let i = 0; i < DISPENSARIES.length; i += concurrency) {
    const batch = DISPENSARIES.slice(i, i + concurrency)
    
    await Promise.all(batch.map(async (dispensary) => {
      try {
        // Step 1: Fetch flyer
        const fetchResponse = await fetch(`${process.env.APP_URL}/api/ingest/fetch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dispensary_name: dispensary.name,
            source_url: dispensary.url,
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
          }),
        })

        if (!parseResponse.ok) {
          throw new Error(`Parse failed: ${parseResponse.statusText}`)
        }

        const parseData = await parseResponse.json()
        dealsInserted += parseData.deals_inserted || 0
        processed++
      } catch (error) {
        console.error(`Failed to process ${dispensary.name}:`, error)
        failed++
      }
    }))
  }

  return NextResponse.json({
    processed,
    skipped,
    failed,
    deals_inserted: dealsInserted,
  })
}
