import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  // Rate limiting - strict for session retrieval
  const rateLimitResult = await rateLimit(request, 'strict')
  if (!rateLimitResult.success) {
    return rateLimitResult.response
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing session_id parameter' },
        { status: 400 }
      )
    }

    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (!session.customer) {
      return NextResponse.json(
        { error: 'No customer found in session' },
        { status: 404 }
      )
    }

    // Get customer email
    const customer = await stripe.customers.retrieve(session.customer as string)
    const email = typeof customer === 'object' && !customer.deleted ? customer.email : null

    if (!email) {
      return NextResponse.json(
        { error: 'No email found for customer' },
        { status: 404 }
      )
    }

    return NextResponse.json({ email, sessionId })
  } catch (error) {
    console.error('Error retrieving Stripe session:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve session' },
      { status: 500 }
    )
  }
}
