/**
 * Create and publish the Daily Dispo Deals email template in Resend.
 * Run: npx tsx scripts/create-resend-deals-template.ts
 * Requires: RESEND_API_KEY in .env.local
 *
 * After running, add the printed template ID to Vercel as RESEND_DEALS_TEMPLATE_ID.
 */

import dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { resolve } from 'path'

dotenv.config()
dotenv.config({ path: resolve(process.cwd(), '.env.local'), override: true })

const RESEND_API = 'https://api.resend.com'

async function main() {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    console.error('RESEND_API_KEY is required. Add it to .env.local')
    process.exit(1)
  }

  const htmlPath = resolve(process.cwd(), 'lib/email/deals-template.html')
  const html = readFileSync(htmlPath, 'utf-8')

  const variables = [
    { key: 'ZONE_NAME', type: 'string' as const, fallbackValue: '' },
    { key: 'FORMATTED_DATE', type: 'string' as const, fallbackValue: '' },
    { key: 'DEALS_HTML', type: 'string' as const, fallbackValue: '<p>No deals today.</p>' },
    { key: 'UNSUBSCRIBE_LINK', type: 'string' as const, fallbackValue: '#' },
  ]

  // Create template
  const createRes = await fetch(`${RESEND_API}/templates`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'daily-dispo-deals',
      html,
      from: 'Daily Dispo Deals <deals@dailydispodeals.com>',
      subject: "Today's Dispo Deals",
      variables,
    }),
  })

  if (!createRes.ok) {
    const err = await createRes.text()
    console.error('Resend create template failed:', createRes.status, err)
    if (createRes.status === 400 && err.includes('invalid')) {
      console.error('\nTip: Get a valid API key from https://resend.com/api-keys — use "Create API Key", copy the secret (starts with re_), and set RESEND_API_KEY in .env.local with no extra spaces or quotes.')
    }
    process.exit(1)
  }

  const { id } = (await createRes.json()) as { id: string }
  console.log('Template created:', id)

  // Publish template
  const publishRes = await fetch(`${RESEND_API}/templates/${id}/publish`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
  })

  if (!publishRes.ok) {
    const err = await publishRes.text()
    console.error('Resend publish template failed:', publishRes.status, err)
    process.exit(1)
  }

  console.log('Template published.')
  console.log('\nAdd to Vercel (and .env.local for dev):')
  console.log(`RESEND_DEALS_TEMPLATE_ID=${id}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
