# Stripe Webhook Setup Guide

This guide explains how to configure Stripe webhooks for your Daily Dispo Deals application.

## Webhook Endpoint

Your webhook endpoint is located at:
```
https://dailydispodeals.com/api/stripe/webhook
```

**Important:** Use the exact URL format above. If you're using a Vercel deployment without a custom domain, use:
```
https://dailydispodeals.vercel.app/api/stripe/webhook
```

Make sure the URL:
- Includes `https://` protocol
- Has the correct domain (`.com` or `.vercel.app`)
- Ends with `/api/stripe/webhook`

## Required Events

Your webhook handler listens for the following Stripe events:

1. **`checkout.session.completed`** - Triggered when a customer completes checkout
   - Creates/updates user in database
   - Creates/updates subscription record
   - Links Stripe customer to Supabase user

2. **`customer.subscription.updated`** - Triggered when subscription status changes
   - Updates subscription status in database
   - Updates current_period_end timestamp

3. **`customer.subscription.deleted`** - Triggered when subscription is cancelled
   - Updates subscription status to cancelled
   - Updates current_period_end timestamp

## Setup Instructions

### Step 1: Access Stripe Dashboard

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** → **Webhooks** (or use [Workbench](https://dashboard.stripe.com/workbench/webhooks) if enabled)

### Step 2: Create Webhook Endpoint

1. Click **"Add endpoint"** or **"Create an event destination"**
2. Enter your webhook URL (use the exact format):
   ```
   https://dailydispodeals.com/api/stripe/webhook
   ```
   Or if using Vercel default domain:
   ```
   https://dailydispodeals.vercel.app/api/stripe/webhook
   ```
   **Note:** Make sure the URL is publicly accessible and returns a 200 status code
3. Select the following events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Click **"Add endpoint"** or **"Create destination"**

### Step 3: Get Webhook Signing Secret

1. After creating the endpoint, click on it to view details
2. Click **"Reveal"** or **"Click to reveal"** next to **Signing secret**
3. Copy the secret (starts with `whsec_...`)
4. Add it to your environment variables:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
   ```

### Step 4: Test Webhook (Optional)

1. Use Stripe CLI to test locally:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
2. Trigger a test event:
   ```bash
   stripe trigger checkout.session.completed
   ```
3. Check your application logs to verify the webhook was received and processed

### Step 5: Deploy and Verify

1. Deploy your application to Vercel with the `STRIPE_WEBHOOK_SECRET` environment variable set
2. In Stripe Dashboard, verify the webhook endpoint shows as **"Enabled"**
3. Test with a real checkout session in test mode
4. Check the webhook logs in Stripe Dashboard to ensure events are being received successfully

## Environment Variables

Make sure these are set in your Vercel project:

```bash
STRIPE_SECRET_KEY=sk_live_...  # or sk_test_... for test mode
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_MONTHLY_PRICE_ID=price_...
STRIPE_YEARLY_PRICE_ID=price_...
```

## Monitoring

The webhook handler includes Sentry instrumentation for:
- Performance monitoring (response times)
- Error tracking (failed webhook processing)
- Event type tracking
- Customer and subscription ID tracking

Check your Sentry dashboard for webhook-related errors and performance metrics.

## Troubleshooting

### Webhook Not Receiving Events

1. Verify the webhook URL is correct and publicly accessible
2. Check that the endpoint is enabled in Stripe Dashboard
3. Verify `STRIPE_WEBHOOK_SECRET` is set correctly
4. Check Vercel function logs for errors

### Signature Verification Failing

1. Ensure you're using the correct signing secret for your endpoint
2. Verify the secret matches the environment variable
3. Check that the request body is being read as raw text (not parsed JSON)

### Events Not Processing

1. Check Sentry for error logs
2. Verify database connection is working
3. Ensure required environment variables are set
4. Check that user/subscription tables exist in Supabase

## Security Notes

- Webhook signature verification is required and enforced
- The endpoint returns 500 errors for processing failures so Stripe will retry
- All webhook events are logged to Sentry for monitoring
- Invalid signatures return 400 errors and are not retried
