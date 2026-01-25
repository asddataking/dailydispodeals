import { NextRequest } from 'next/server'
import { z } from 'zod'
import { stripe } from '@/lib/stripe'
import { rateLimit } from '@/lib/rate-limit'
import { getOrCreateAuthUser } from '@/lib/auth-helpers'
import * as Sentry from "@sentry/nextjs"
import {
  success,
  validationError,
  serverError,
  rateLimitError,
} from '@/lib/api-response'

// Mark route as dynamic to prevent static analysis during build
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const schema = z.object({
  email: z.string().email(),
  plan: z.enum(['monthly', 'yearly']),
})

export async function POST(request: NextRequest) {
  // Rate limiting - strict for payment endpoints
  const rateLimitResult = await rateLimit(request, 'strict')
  if (!rateLimitResult.success) {
    return rateLimitError('Too many requests. Please try again later.')
  }

  try {
    const body = await request.json()
    const validated = schema.parse(body)

    // Fail fast with clear messages if required env is missing (Production)
    const missing: string[] = []
    if (!process.env.STRIPE_SECRET_KEY) missing.push('STRIPE_SECRET_KEY')
    if (!process.env.STRIPE_MONTHLY_PRICE_ID) missing.push('STRIPE_MONTHLY_PRICE_ID')
    if (!process.env.STRIPE_YEARLY_PRICE_ID) missing.push('STRIPE_YEARLY_PRICE_ID')
    if (!process.env.APP_URL) missing.push('APP_URL')
    if (!process.env.SUPABASE_URL) missing.push('SUPABASE_URL')
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY')
    if (missing.length > 0) {
      return serverError('Checkout not configured', `Missing in Vercel: ${missing.join(', ')}`)
    }

    // Create/get Supabase Auth user silently (before Stripe checkout)
    const authUserId = await getOrCreateAuthUser(validated.email)

    // Find or create Stripe customer by email
    const customers = await stripe.customers.list({
      email: validated.email,
      limit: 1,
    })

    let customerId: string
    if (customers.data.length > 0) {
      customerId = customers.data[0].id
    } else {
      const customer = await stripe.customers.create({
        email: validated.email,
      })
      customerId = customer.id
    }

    // Get price ID based on plan
    const priceId = validated.plan === 'monthly'
      ? process.env.STRIPE_MONTHLY_PRICE_ID!
      : process.env.STRIPE_YEARLY_PRICE_ID!

    if (!priceId) {
      return serverError('Price ID not configured')
    }

    // Create checkout session with auth_user_id in metadata
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/?canceled=1`,
      metadata: {
        auth_user_id: authUserId,
      },
    })

    return success({ url: session.url })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError('Invalid input', error.errors)
    }
    
    const { logger } = Sentry;
    logger.error("Stripe checkout error", {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
      tags: {
        operation: "stripe_checkout",
      },
    });

    const errMessage = error instanceof Error ? error.message : String(error)
    return serverError('Failed to create checkout session', errMessage)
  }
}
