import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase/server'
import { resend } from '@/lib/resend'
import { renderDailyDealsEmail } from '@/lib/email/render'

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
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

    // Query active subscriptions with users and preferences
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select(`
        id,
        user_id,
        users!inner(email),
        preferences(categories, brands, zip, radius)
      `)
      .eq('status', 'active')
      .gt('current_period_end', new Date().toISOString())

    if (subError) {
      console.error('Failed to fetch subscriptions:', subError)
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      )
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0, skipped: 0 })
    }

    let sent = 0
    let failed = 0
    let skipped = 0

    for (const sub of subscriptions) {
      const user = sub.users as any
      const preferences = sub.preferences as any

      // Check if email already sent today
      const { data: existingLog } = await supabaseAdmin
        .from('email_logs')
        .select('id')
        .eq('user_id', sub.user_id)
        .eq('date', today)
        .eq('status', 'sent')
        .single()

      if (existingLog) {
        skipped++
        continue
      }

      // Get matching deals
      if (!preferences || !preferences.categories || preferences.categories.length === 0) {
        skipped++
        continue
      }

      // Build query with brand join
      let dealsQuery = supabaseAdmin
        .from('deals')
        .select(`
          *,
          brands (
            id,
            name
          )
        `)
        .eq('date', today)
        .in('category', preferences.categories)
        .eq('needs_review', false) // Only approved deals
        .limit(10)

      // If user has brand preferences, filter by brands
      if (preferences.brands && preferences.brands.length > 0) {
        // Get brand IDs for user's preferred brands
        const { data: brandIds } = await supabaseAdmin
          .from('brands')
          .select('id')
          .in('name', preferences.brands)

        if (brandIds && brandIds.length > 0) {
          const ids = brandIds.map(b => b.id)
          dealsQuery = dealsQuery.in('brand_id', ids)
        } else {
          // User has brand preferences but no matching brands found
          skipped++
          continue
        }
      }

      const { data: deals } = await dealsQuery

      if (!deals || deals.length === 0) {
        skipped++
        continue
      }

      // Render and send email
      try {
        const { subject, html } = renderDailyDealsEmail(
          deals,
          user.email,
          process.env.APP_URL || 'https://dailydispodeals.com'
        )

        await resend.emails.send({
          from: 'Daily Dispo Deals <deals@dailydispodeals.com>',
          to: user.email,
          subject,
          html,
        })

        // Log success
        await supabaseAdmin
          .from('email_logs')
          .insert({
            user_id: sub.user_id,
            date: today,
            status: 'sent',
          })

        sent++
      } catch (emailError) {
        console.error('Failed to send email:', emailError)
        
        // Log failure
        await supabaseAdmin
          .from('email_logs')
          .insert({
            user_id: sub.user_id,
            date: today,
            status: 'failed',
            error: emailError instanceof Error ? emailError.message : 'Unknown error',
          })

        failed++
      }
    }

    return NextResponse.json({ sent, failed, skipped })
  } catch (error) {
    console.error('Cron error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
