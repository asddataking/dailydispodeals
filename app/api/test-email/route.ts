import { NextRequest, NextResponse } from 'next/server'
import { resend } from '@/lib/resend'
import { renderDailyDealsEmail } from '@/lib/email/render'
import { rateLimit } from '@/lib/rate-limit'
import * as Sentry from "@sentry/nextjs"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/test-email
 * Test endpoint to send a test email
 * 
 * Body: { email: string }
 */
export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResult = await rateLimit(request, 'moderate')
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const { email } = body

    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      )
    }

    // Create sample deals for testing
    const sampleDeals = [
      {
        dispensary_name: 'Test Dispensary',
        title: 'Test Deal - 20% Off',
        product_name: 'Premium Flower',
        price_text: '$30',
        city: 'Detroit',
        source_url: process.env.APP_URL || 'https://www.dailydispodeals.com',
        brands: { name: 'Test Brand' },
      },
      {
        dispensary_name: 'Another Dispensary',
        title: 'Special Offer',
        product_name: 'Edibles',
        price_text: '2/$50',
        city: 'Ann Arbor',
        source_url: process.env.APP_URL || 'https://www.dailydispodeals.com',
        brands: null,
      },
    ]

    const { subject, html } = renderDailyDealsEmail(
      sampleDeals,
      email,
      process.env.APP_URL || 'https://www.dailydispodeals.com'
    )

    const result = await resend.emails.send({
      from: 'Daily Dispo Deals <deals@dailydispodeals.com>',
      to: email,
      subject,
      html,
    })

    const { logger } = Sentry;
    logger.info("Test email sent", {
      email,
      email_id: result.data?.id || 'unknown',
    });

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      emailId: result.data?.id,
    })
  } catch (error: any) {
    const { logger } = Sentry;
    logger.error("Test email failed", {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
      tags: {
        operation: "test_email",
      },
    });

    return NextResponse.json(
      {
        error: 'Failed to send test email',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
