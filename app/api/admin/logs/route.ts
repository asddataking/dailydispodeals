import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/server'
import * as Sentry from "@sentry/nextjs"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/logs
 * Get email and ingestion logs
 */
export async function GET(request: NextRequest) {
  // Check admin session
  const session = await getAdminSession()
  if (!session.authenticated) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'all' // 'email', 'ingestion', or 'all'
    const days = parseInt(searchParams.get('days') || '7', 10)
    
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startDateStr = startDate.toISOString().split('T')[0]

    const results: {
      email_logs?: any[]
      ingestion_logs?: any[]
      ingestion_error?: string
    } = {}

    // Email logs
    if (type === 'email' || type === 'all') {
      const { data: emailLogs, error: emailError } = await supabaseAdmin
        .from('email_logs')
        .select('*')
        .gte('date', startDateStr)
        .order('sent_at', { ascending: false })
        .limit(1000)

      if (emailError) {
        const { logger } = Sentry;
        logger.error("Error fetching email logs", {
          error: emailError.message,
        });

        Sentry.captureException(emailError, {
          tags: {
            operation: "admin_logs",
            log_type: "email",
          },
        });
      } else {
        results.email_logs = emailLogs || []
      }
    }

    // Ingestion logs (from deal_flyers)
    // Note: ocr_processed_at omitted so this works without migrations 004/008
    if (type === 'ingestion' || type === 'all') {
      const { data: ingestionLogs, error: ingestionError } = await supabaseAdmin
        .from('deal_flyers')
        .select('dispensary_name, date, file_path, source_url, deals_extracted, processed_at, created_at')
        .gte('date', startDateStr)
        .order('created_at', { ascending: false })
        .limit(1000)

      if (ingestionError) {
        const { logger } = Sentry;
        logger.error("Error fetching ingestion logs", {
          error: ingestionError.message,
          code: ingestionError.code,
          details: ingestionError.details,
        });

        Sentry.captureException(ingestionError, {
          tags: {
            operation: "admin_logs",
            log_type: "ingestion",
          },
          extra: {
            supabase_code: ingestionError.code,
            supabase_message: ingestionError.message,
            supabase_details: ingestionError.details,
          },
        });
        results.ingestion_logs = []
        results.ingestion_error = ingestionError.message
      } else {
        results.ingestion_logs = ingestionLogs || []
      }
    }

    return NextResponse.json({
      ...results,
      date_range: {
        start: startDateStr,
        days,
      },
    })
  } catch (error) {
    const { logger } = Sentry;
    logger.error("Logs API error", {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
      tags: {
        operation: "admin_logs",
      },
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
