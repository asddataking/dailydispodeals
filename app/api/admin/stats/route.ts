import { NextRequest } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import {
  success,
  unauthorized,
  serverError,
} from '@/lib/api-response'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/stats
 * Get aggregated statistics
 */
export async function GET(request: NextRequest) {
  // Check admin session
  const session = await getAdminSession()
  if (!session.authenticated) {
    return unauthorized()
  }

  try {
    // Get date range from query params (default to last 30 days)
    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '30', 10)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startDateStr = startDate.toISOString().split('T')[0]

    // Total users
    const { count: totalUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })

    // Active subscriptions
    const { count: activeSubscriptions } = await supabaseAdmin
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    // Total subscriptions (all statuses)
    const { count: totalSubscriptions } = await supabaseAdmin
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })

    // Deals in date range
    const { count: dealsCount } = await supabaseAdmin
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .gte('date', startDateStr)

    // Deals by category
    const { data: dealsByCategory } = await supabaseAdmin
      .from('deals')
      .select('category')
      .gte('date', startDateStr)

    const categoryCounts: Record<string, number> = {}
    if (dealsByCategory) {
      dealsByCategory.forEach((deal) => {
        categoryCounts[deal.category] = (categoryCounts[deal.category] || 0) + 1
      })
    }

    // Active dispensaries
    const { count: activeDispensaries } = await supabaseAdmin
      .from('dispensaries')
      .select('*', { count: 'exact', head: true })
      .eq('active', true)

    // Dispensary stats
    const { data: dispensaryStats } = await supabaseAdmin
      .from('dispensaries')
      .select('name, ingestion_success_rate, last_ingested_at, active')
      .eq('active', true)

    // Email logs in date range
    const { count: emailsSent } = await supabaseAdmin
      .from('email_logs')
      .select('*', { count: 'exact', head: true })
      .gte('date', startDateStr)
      .eq('status', 'sent')

    const { count: emailsFailed } = await supabaseAdmin
      .from('email_logs')
      .select('*', { count: 'exact', head: true })
      .gte('date', startDateStr)
      .eq('status', 'failed')

    // Pending reviews
    const { count: pendingReviews } = await supabaseAdmin
      .from('deal_reviews')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    // Ingestion stats (from deal_flyers)
    const { data: flyers } = await supabaseAdmin
      .from('deal_flyers')
      .select('deals_extracted, processed_at')
      .gte('date', startDateStr)
      .not('processed_at', 'is', null)

    const totalFlyersProcessed = flyers?.length || 0
    const totalDealsExtracted = flyers?.reduce((sum, f) => sum + (f.deals_extracted || 0), 0) || 0

    return success({
      users: {
        total: totalUsers || 0,
      },
      subscriptions: {
        total: totalSubscriptions || 0,
        active: activeSubscriptions || 0,
      },
      deals: {
        total: dealsCount || 0,
        by_category: categoryCounts,
      },
      dispensaries: {
        active: activeDispensaries || 0,
        stats: dispensaryStats || [],
      },
      emails: {
        sent: emailsSent || 0,
        failed: emailsFailed || 0,
        success_rate: emailsSent && emailsSent + emailsFailed
          ? ((emailsSent / (emailsSent + emailsFailed)) * 100).toFixed(1)
          : '0',
      },
      reviews: {
        pending: pendingReviews || 0,
      },
      ingestion: {
        flyers_processed: totalFlyersProcessed,
        deals_extracted: totalDealsExtracted,
        avg_deals_per_flyer: totalFlyersProcessed > 0
          ? (totalDealsExtracted / totalFlyersProcessed).toFixed(1)
          : '0',
      },
      date_range: {
        start: startDateStr,
        days,
      },
    })
  } catch (error) {
    console.error('Stats API error:', error)
    return serverError('Internal server error')
  }
}
