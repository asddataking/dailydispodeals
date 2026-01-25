import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase/server'
import { resend } from '@/lib/resend'
import {
  renderDailyDealsEmail,
  renderWelcomeEmail,
  buildDealsTemplateVariables,
  getDealsEmailSubject,
} from '@/lib/email/render'
import * as Sentry from "@sentry/nextjs"
import {
  getDispensariesInUserZones,
  addDistancesToDeals,
  rankDealsWithDistance,
} from '@/lib/zone-deals'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BATCH_SIZE = 10 // Process 10 emails in parallel
const MAX_RETRIES = 3

export async function GET(request: NextRequest) {
  return Sentry.startSpan(
    {
      op: "cron",
      name: "Daily Email Sending",
    },
    async (span) => {
      span.setAttribute("cron.schedule", "0 9 * * *");
      span.setAttribute("cron.type", "send-daily");

      // Verify cron secret
      const headersList = await headers()
      const authHeader = headersList.get('authorization')
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        span.setAttribute("error", true);
        span.setAttribute("error_type", "unauthorized");
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }

      const token = authHeader.substring(7)
      if (token !== process.env.CRON_SECRET) {
        span.setAttribute("error", true);
        span.setAttribute("error_type", "unauthorized");
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }

      try {
        const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

        // Process notifications_outbox queue for WELCOME and DEALS_READY
        // Only process PENDING notifications that haven't exceeded retry limit
        const { data: pendingNotifications, error: queueError } = await supabaseAdmin
          .from('notifications_outbox')
          .select(`
            id,
            email,
            zone_id,
            type,
            retry_count,
            zones!inner(zip)
          `)
          .in('type', ['WELCOME', 'DEALS_READY'])
          .eq('status', 'PENDING')
          .lt('retry_count', MAX_RETRIES)
          .order('created_at', { ascending: true })
          .limit(100) // Process up to 100 notifications per run

        if (queueError) {
          const { logger } = Sentry;
          logger.error("Failed to fetch notification queue", {
            error: queueError.message,
          });

          span.setAttribute("error", true);
          Sentry.captureException(queueError, {
            tags: {
              operation: "cron_send",
              step: "fetch_notifications",
            },
          });

          return NextResponse.json(
            { error: 'Failed to fetch notification queue' },
            { status: 500 }
          )
        }

        span.setAttribute("pending_notifications", pendingNotifications?.length || 0);

        if (!pendingNotifications || pendingNotifications.length === 0) {
          const { logger } = Sentry;
          logger.info("No pending notifications", {
            date: today,
          });

          return NextResponse.json({ sent: 0, failed: 0, skipped: 0, message: 'No pending notifications' })
        }

        let sent = 0
        let failed = 0
        let skipped = 0

        // Process notifications in batches
        for (let i = 0; i < pendingNotifications.length; i += BATCH_SIZE) {
          const batch = pendingNotifications.slice(i, i + BATCH_SIZE)
          
          // Process batch in parallel
          await Promise.all(batch.map(async (notification) => {
            const zone = notification.zones as any
            const email = notification.email
            const notifType = (notification as { type?: string }).type || 'DEALS_READY'

            try {
              // WELCOME: send simple welcome email (no user/preferences/deals checks)
              if (notifType === 'WELCOME') {
                const appUrl = process.env.APP_URL || 'https://dailydispodeals.com'
                const { subject, html } = renderWelcomeEmail(email, appUrl)
                await resend.emails.send({
                  from: 'Daily Dispo Deals <deals@dailydispodeals.com>',
                  to: email,
                  subject,
                  html,
                })
                await supabaseAdmin
                  .from('notifications_outbox')
                  .update({
                    status: 'SENT',
                    sent_at: new Date().toISOString(),
                    last_attempted_at: new Date().toISOString(),
                  })
                  .eq('id', notification.id)
                sent++
                return
              }

              // DEALS_READY: Find user by email
              const { data: user, error: userError } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq('email', email)
                .single()

              if (userError || !user) {
                // Mark as failed - user doesn't exist
                await supabaseAdmin
                  .from('notifications_outbox')
                  .update({
                    status: 'FAILED',
                    error_message: 'User not found',
                    last_attempted_at: new Date().toISOString(),
                  })
                  .eq('id', notification.id)
                failed++
                return
              }

              // Check if user has email enabled
              const { data: preferences } = await supabaseAdmin
                .from('preferences')
                .select('categories, brands, zip, radius, email_enabled')
                .eq('user_id', user.id)
                .single()

              if (!preferences || preferences.email_enabled === false) {
                // User unsubscribed or no preferences
                await supabaseAdmin
                  .from('notifications_outbox')
                  .update({
                    status: 'FAILED',
                    error_message: 'User unsubscribed or no preferences',
                    last_attempted_at: new Date().toISOString(),
                  })
                  .eq('id', notification.id)
                skipped++
                return
              }

              // Check if email already sent today (via email_logs)
              const { data: existingLog } = await supabaseAdmin
                .from('email_logs')
                .select('id')
                .eq('user_id', user.id)
                .eq('date', today)
                .eq('status', 'sent')
                .single()

              if (existingLog) {
                // Already sent, mark notification as sent
                await supabaseAdmin
                  .from('notifications_outbox')
                  .update({
                    status: 'SENT',
                    sent_at: new Date().toISOString(),
                    last_attempted_at: new Date().toISOString(),
                  })
                  .eq('id', notification.id)
                skipped++
                return
              }

              // Get matching deals
              if (!preferences.categories || preferences.categories.length === 0) {
                skipped++
                return
              }

              // Filter deals by zone: only show deals from dispensaries in user's zones
              const dispensariesInZones = await getDispensariesInUserZones(email)
              if (dispensariesInZones.length === 0) {
                skipped++
                return
              }

              // Filter out stale deals (older than 2 days)
              const twoDaysAgo = new Date(today)
              twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
              const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0]

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
                .gte('date', twoDaysAgoStr) // Only show deals from last 2 days
                .in('category', preferences.categories)
                .in('dispensary_name', dispensariesInZones)
                .eq('needs_review', false) // Only show approved deals
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
                  return
                }
              }

              const { data: deals } = await dealsQuery

              if (!deals || deals.length === 0) {
                skipped++
                return
              }

              // Add distances for ranking (if user has ZIP)
              const dealsWithDistances = await addDistancesToDeals(
                deals,
                preferences.zip || null
              )

              // Rank deals: group duplicates and rank by distance
              const rankedDeals = rankDealsWithDistance(dealsWithDistances)
              const appUrl = process.env.APP_URL || 'https://dailydispodeals.com'
              const zoneZip = (zone as { zip?: string } | null)?.zip ?? preferences.zip ?? ''

              const templateId = process.env.RESEND_DEALS_TEMPLATE_ID
              if (templateId) {
                // Use Resend template (lib/email/deals-template.html). Resend API supports template; SDK types require html|react|text so we cast.
                const variables = buildDealsTemplateVariables(
                  rankedDeals,
                  zoneZip,
                  email,
                  appUrl,
                  today
                )
                // Resend API supports template; SDK CreateEmailOptions types omit it.
                await resend.emails.send({
                  from: 'Daily Dispo Deals <deals@dailydispodeals.com>',
                  to: email,
                  subject: getDealsEmailSubject(rankedDeals.length),
                  template: { id: templateId, variables },
                } as any)
              } else {
                // Fallback: inline HTML
                const { subject, html } = renderDailyDealsEmail(rankedDeals, email, appUrl)
                await resend.emails.send({
                  from: 'Daily Dispo Deals <deals@dailydispodeals.com>',
                  to: email,
                  subject,
                  html,
                })
              }

              // Log success
              await supabaseAdmin
                .from('email_logs')
                .insert({
                  user_id: user.id,
                  date: today,
                  status: 'sent',
                })

              // Mark notification as sent
              await supabaseAdmin
                .from('notifications_outbox')
                .update({
                  status: 'SENT',
                  sent_at: new Date().toISOString(),
                  last_attempted_at: new Date().toISOString(),
                })
                .eq('id', notification.id)

              sent++
            } catch (emailError) {
              const { logger } = Sentry;
              logger.error(`Failed to send email to ${email}`, {
                error: emailError instanceof Error ? emailError.message : 'Unknown error',
                notification_id: notification.id,
              });
              
              // Increment retry count
              const newRetryCount = notification.retry_count + 1
              const shouldRetry = newRetryCount < MAX_RETRIES

              await supabaseAdmin
                .from('notifications_outbox')
                .update({
                  retry_count: newRetryCount,
                  last_attempted_at: new Date().toISOString(),
                  error_message: emailError instanceof Error ? emailError.message.substring(0, 500) : 'Unknown error',
                  status: shouldRetry ? 'PENDING' : 'FAILED',
                })
                .eq('id', notification.id)

              // Log failure if this was the last retry
              if (!shouldRetry) {
                const { data: user } = await supabaseAdmin
                  .from('users')
                  .select('id')
                  .eq('email', email)
                  .single()

                if (user) {
                  await supabaseAdmin
                    .from('email_logs')
                    .insert({
                      user_id: user.id,
                      date: today,
                      status: 'failed',
                      error: emailError instanceof Error ? emailError.message : 'Unknown error',
                    })
                }
              }

              failed++

              // Capture email errors in Sentry
              Sentry.captureException(emailError instanceof Error ? emailError : new Error(String(emailError)), {
                tags: {
                  operation: "cron_send_email",
                  email: email,
                  retry_count: newRetryCount,
                },
                extra: {
                  notification_id: notification.id,
                  should_retry: shouldRetry,
                },
              });
            }
          }))
        }

        span.setAttribute("sent", sent);
        span.setAttribute("failed", failed);
        span.setAttribute("skipped", skipped);

        const { logger } = Sentry;
        logger.info("Daily email sending completed", {
          date: today,
          sent,
          failed,
          skipped,
          processed: pendingNotifications.length,
        });

        return NextResponse.json({ sent, failed, skipped, processed: pendingNotifications.length })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        span.setAttribute("error", true);
        span.setAttribute("error_message", errorMessage);

        const { logger } = Sentry;
        logger.error("Daily email sending failed", {
          error: errorMessage,
        });

        Sentry.captureException(error, {
          tags: {
            operation: "cron_send",
            cron_type: "send-daily",
          },
        });

        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        )
      }
    }
  );
}
