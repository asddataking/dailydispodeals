/**
 * Stripe Webhook Setup Script
 * 
 * This script creates a webhook endpoint in Stripe for your application.
 * Run this once after deploying your application.
 * 
 * Usage:
 *   npx tsx scripts/setup-stripe-webhook.ts
 *   or
 *   npm run setup:webhook
 */

import Stripe from 'stripe'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })
config() // Fallback to .env

const STRIPE_SECRET_KEY = process.env.STRIPE_TEST_SK_KEY || process.env.STRIPE_SECRET_KEY
// Default to www.dailydispodeals.com if APP_URL not set
const APP_URL = process.env.APP_URL || 'https://www.dailydispodeals.com'

if (!STRIPE_SECRET_KEY) {
  console.error('❌ Error: STRIPE_TEST_SK_KEY or STRIPE_SECRET_KEY is not set in .env.local')
  console.error('   Please add your Stripe secret key to .env.local')
  process.exit(1)
}

if (!APP_URL || APP_URL.includes('yourdomain.com')) {
  console.error('❌ Error: APP_URL is not set correctly in .env.local')
  console.error('   Please set APP_URL to your actual deployment URL')
  console.error('   Example: APP_URL=https://dailydispodeals.com')
  console.error('   Or: APP_URL=https://dailydispodeals.vercel.app')
  process.exit(1)
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia',
})

const WEBHOOK_URL = `${APP_URL}/api/stripe/webhook`
const REQUIRED_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
]

async function setupWebhook() {
  try {
    console.log('🔧 Setting up Stripe webhook endpoint...')
    console.log(`📍 Webhook URL: ${WEBHOOK_URL}`)
    console.log(`📋 Events: ${REQUIRED_EVENTS.join(', ')}`)
    console.log('')

    // First, delete any webhooks with placeholder URLs
    const allEndpoints = await stripe.webhookEndpoints.list({ limit: 100 })
    const placeholderEndpoints = allEndpoints.data.filter(
      (endpoint) => endpoint.url.includes('yourdomain.com')
    )

    if (placeholderEndpoints.length > 0) {
      console.log('🗑️  Found webhook endpoints with placeholder URLs. Deleting...')
      for (const endpoint of placeholderEndpoints) {
        await stripe.webhookEndpoints.del(endpoint.id)
        console.log(`   Deleted: ${endpoint.url}`)
      }
      console.log('')
    }

    // Check if webhook endpoint already exists with correct URL
    const existingEndpoints = await stripe.webhookEndpoints.list({ limit: 100 })
    let existingEndpoint = existingEndpoints.data.find(
      (endpoint) => endpoint.url === WEBHOOK_URL
    )

    // If not found, check for URL without www or with www
    if (!existingEndpoint) {
      const alternateUrl = WEBHOOK_URL.includes('www.') 
        ? WEBHOOK_URL.replace('www.', '')
        : WEBHOOK_URL.replace('https://', 'https://www.')
      existingEndpoint = existingEndpoints.data.find(
        (endpoint) => endpoint.url === alternateUrl || endpoint.url === WEBHOOK_URL
      )
      
      // If found with different URL, update it
      if (existingEndpoint && existingEndpoint.url !== WEBHOOK_URL) {
        console.log(`⚠️  Found webhook with different URL: ${existingEndpoint.url}`)
        console.log(`   Updating to: ${WEBHOOK_URL}`)
        existingEndpoint = await stripe.webhookEndpoints.update(existingEndpoint.id, {
          url: WEBHOOK_URL,
        })
      }
    }

    if (existingEndpoint) {
      console.log('⚠️  Webhook endpoint already exists!')
      console.log(`   Endpoint ID: ${existingEndpoint.id}`)
      console.log(`   Status: ${existingEndpoint.status}`)
      console.log(`   URL: ${existingEndpoint.url}`)
      console.log('')

      // Check if events match
      const currentEvents = existingEndpoint.enabled_events
      const missingEvents = REQUIRED_EVENTS.filter(
        (event) => !currentEvents.includes(event as any)
      )

      if (missingEvents.length > 0) {
        console.log('⚠️  Some required events are missing. Updating endpoint...')
        const updated = await stripe.webhookEndpoints.update(existingEndpoint.id, {
          enabled_events: REQUIRED_EVENTS as any,
        })
        
        // Retrieve the secret separately (update doesn't return it)
        const endpointWithSecret = await stripe.webhookEndpoints.retrieve(existingEndpoint.id)
        
        console.log('✅ Webhook endpoint updated successfully!')
        console.log(`   Signing Secret: ${endpointWithSecret.secret}`)
        console.log('')
        console.log('📝 Add this to your .env.local:')
        console.log(`   STRIPE_WEBHOOK_SECRET=${endpointWithSecret.secret}`)
      } else {
        console.log('✅ All required events are already configured!')
        console.log('')
        console.log('📝 To get your webhook signing secret:')
        console.log('   1. Go to https://dashboard.stripe.com/webhooks')
        console.log(`   2. Click on the webhook endpoint (ID: ${existingEndpoint.id})`)
        console.log('   3. Click "Reveal" next to "Signing secret"')
        console.log('   4. Copy the secret and add it to your .env.local:')
        console.log('      STRIPE_WEBHOOK_SECRET=whsec_...')
        console.log('')
        console.log('   Or if you already have it in .env.local, you\'re all set!')
      }
    } else {
      // Create new webhook endpoint
      console.log('🆕 Creating new webhook endpoint...')
      const endpoint = await stripe.webhookEndpoints.create({
        url: WEBHOOK_URL,
        enabled_events: REQUIRED_EVENTS as any,
        description: 'Daily Dispo Deals - Subscription webhooks',
      })

      console.log('✅ Webhook endpoint created successfully!')
      console.log(`   Endpoint ID: ${endpoint.id}`)
      console.log(`   Status: ${endpoint.status}`)
      console.log(`   URL: ${endpoint.url}`)
      console.log('')
      console.log('📝 Add this to your .env.local:')
      console.log(`   STRIPE_WEBHOOK_SECRET=${endpoint.secret}`)
      console.log('')
      console.log('⚠️  Important: Make sure to add STRIPE_WEBHOOK_SECRET to your Vercel environment variables!')
    }

    console.log('')
    console.log('✨ Setup complete!')
  } catch (error: any) {
    console.error('❌ Error setting up webhook:', error.message)
    if (error.type === 'StripeInvalidRequestError') {
      console.error('   This might mean:')
      console.error('   - The webhook URL is not publicly accessible')
      console.error('   - The URL format is incorrect')
      console.error('   - Stripe cannot reach your endpoint')
    }
    process.exit(1)
  }
}

setupWebhook()
