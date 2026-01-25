import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase/server'
import { resend } from '@/lib/resend'
import { getDispensariesNearZip } from '@/lib/dispensary-discovery'
import { renderWeeklySummaryEmail } from '@/lib/email/render'
import * as Sentry from '@sentry/nextjs'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BATCH_SIZE = 10

export async function GET(request: NextRequest) {
  return Sentry.startSpan(
    { op: 'cron', name: 'Weekly Email Sending' },
    async (span) => {
      span.setAttribute('cron.schedule', '0 9 * * 0')
      span.setAttribute('cron.type', 'send-weekly')

      const headersList = await headers()
      const authHeader = headersList.get('authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        span.setAttribute('error', true)
        span.setAttribute('error_type', 'unauthorized')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const token = authHeader.slice(7)
      if (token !== process.env.CRON_SECRET) {
        span.setAttribute('error', true)
        span.setAttribute('error_type', 'unauthorized')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      try {
        const today = new Date().toISOString().split('T')[0]
        const d = new Date()
        d.setDate(d.getDate() - 7)
        const weekAgo = d.toISOString().split('T')[0]

        const { data: freeUsers, error: qErr } = await supabaseAdmin
          .from('subscriptions')
          .select('user_id')
          .eq('plan', 'free')
          .eq('status', 'active')

        if (qErr || !freeUsers?.length) {
          const { logger } = Sentry
          logger.info('No active free subscriptions for weekly', { date: today })
          return NextResponse.json({ sent: 0, failed: 0, skipped: 0, message: 'No free users' })
        }

        const userIds = freeUsers.map((r) => r.user_id)

        const { data: users } = await supabaseAdmin
          .from('users')
          .select('id, email')
          .in('id', userIds)

        if (!users?.length) {
          return NextResponse.json({ sent: 0, failed: 0, skipped: 0, message: 'No users' })
        }

        const { data: prefs } = await supabaseAdmin
          .from('preferences')
          .select('user_id, zip, radius, email_enabled')
          .in('user_id', userIds)
          .not('zip', 'is', null)

        const prefsByUser = new Map((prefs || []).map((p) => [p.user_id, p]))

        let sent = 0
        let failed = 0
        let skipped = 0

        for (const user of users) {
          const p = prefsByUser.get(user.id)
          if (!p?.zip || p.email_enabled === false) {
            skipped++
            continue
          }

          const { data: existing } = await supabaseAdmin
            .from('email_logs')
            .select('id')
            .eq('user_id', user.id)
            .eq('date', today)
            .eq('status', 'sent')
            .maybeSingle()

          if (existing) {
            skipped++
            continue
          }

          const radius = (p.radius as number) || 25
          const dispensaries = await getDispensariesNearZip(p.zip, radius)
          const names = dispensaries.map((d) => d.name)
          if (names.length === 0) {
            skipped++
            continue
          }

          const { data: deals } = await supabaseAdmin
            .from('deals')
            .select(`*, brands ( id, name )`)
            .gte('date', weekAgo)
            .lte('date', today)
            .in('dispensary_name', names)
            .eq('needs_review', false)
            .order('date', { ascending: false })
            .limit(15)

          const { subject, html } = renderWeeklySummaryEmail(
            deals || [],
            user.email,
            process.env.APP_URL || 'https://dailydispodeals.com',
            p.zip
          )

          try {
            await resend.emails.send({
              from: 'Daily Dispo Deals <deals@dailydispodeals.com>',
              to: user.email,
              subject,
              html,
            })
            await supabaseAdmin.from('email_logs').insert({
              user_id: user.id,
              date: today,
              status: 'sent',
            })
            sent++
          } catch (emailErr) {
            const { logger } = Sentry
            logger.error('Weekly email send failed', {
              email: user.email,
              error: emailErr instanceof Error ? emailErr.message : String(emailErr),
            })
            Sentry.captureException(emailErr instanceof Error ? emailErr : new Error(String(emailErr)), {
              tags: { operation: 'cron_send_weekly' },
              extra: { user_id: user.id, email: user.email },
            })
            await supabaseAdmin.from('email_logs').insert({
              user_id: user.id,
              date: today,
              status: 'failed',
              error: emailErr instanceof Error ? emailErr.message : String(emailErr),
            })
            failed++
          }
        }

        span.setAttribute('sent', sent)
        span.setAttribute('failed', failed)
        span.setAttribute('skipped', skipped)

        const { logger } = Sentry
        logger.info('Weekly email sending completed', { date: today, sent, failed, skipped })

        return NextResponse.json({ sent, failed, skipped })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        span.setAttribute('error', true)
        span.setAttribute('error_message', msg)
        const { logger } = Sentry
        logger.error('Send-weekly cron error', { error: msg })
        Sentry.captureException(err instanceof Error ? err : new Error(String(err)), {
          tags: { operation: 'cron_send_weekly' },
        })
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
      }
    }
  )
}
