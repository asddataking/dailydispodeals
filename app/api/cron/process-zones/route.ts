import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase/server'
import { geocodeZip } from '@/lib/geocoding'
import { searchDispensariesNearLocation, getPlaceDetails } from '@/lib/places'
import * as Sentry from "@sentry/nextjs"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DEFAULT_BATCH_SIZE = 10
const DEFAULT_TTL_MINUTES = 360 // 6 hours
const LOCK_DURATION_MINUTES = 10
const DEFAULT_RADIUS_MILES = 25

/**
 * GET /api/cron/process-zones
 * Processes queued zones: discovers dispensaries via Google Places, links them to zones
 * Uses atomic locking to prevent concurrent processing of same zones
 */
export async function GET(request: NextRequest) {
  return Sentry.startSpan(
    {
      op: "cron",
      name: "Process Zones",
    },
    async (span) => {
      span.setAttribute("cron.schedule", "0 7 * * *");
      span.setAttribute("cron.type", "process-zones");

      // Verify cron secret
      const headersList = await headers()
      const authHeader = headersList.get('authorization')

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        span.setAttribute("error", true);
        span.setAttribute("error_type", "unauthorized");
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const token = authHeader.substring(7)
      if (token !== process.env.INGESTION_CRON_SECRET) {
        span.setAttribute("error", true);
        span.setAttribute("error_type", "unauthorized");
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const batchSize = Math.min(
        parseInt(request.nextUrl.searchParams.get('batchSize') || String(DEFAULT_BATCH_SIZE)),
        50
      )

      span.setAttribute("batch_size", batchSize);

      let claimed = 0
      let processed = 0
      let failed = 0
      let skipped = 0

      try {
        // Step 1: Atomically claim zones to process
        const lockToken = `lock_${Date.now()}_${Math.random().toString(36).substring(7)}`
        const lockExpiresAt = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000).toISOString()

        // Atomic claim: update zones that are ready and not locked
        const { data: claimedZones, error: claimError } = await supabaseAdmin
          .from('zones')
          .update({
            processing_lock: lockToken,
            processing_lock_expires_at: lockExpiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq('status', 'ACTIVE')
          .lte('next_process_at', new Date().toISOString())
          .or(`processing_lock.is.null,processing_lock_expires_at.lt.${new Date().toISOString()}`)
          .order('next_process_at', { ascending: true, nullsFirst: true })
          .limit(batchSize)
          .select('*')

        if (claimError) {
          const { logger } = Sentry;
          logger.error("Error claiming zones", {
            error: claimError.message,
          });

          span.setAttribute("error", true);
          Sentry.captureException(claimError, {
            tags: {
              operation: "cron_process_zones",
              step: "claim_zones",
            },
          });

          return NextResponse.json({ error: 'Failed to claim zones' }, { status: 500 })
        }

        if (!claimedZones || claimedZones.length === 0) {
          const { logger } = Sentry;
          logger.info("No zones ready for processing");

          return NextResponse.json({
            ok: true,
            claimed: 0,
            processed: 0,
            failed: 0,
            skipped: 0,
            message: 'No zones ready for processing',
          })
        }

        claimed = claimedZones.length
        span.setAttribute("zones_claimed", claimed);

        // Step 2: Process each claimed zone
        for (const zone of claimedZones) {
          try {
            // Geocode ZIP
            const zipLocation = await geocodeZip(zone.zip)
            if (!zipLocation) {
              const { logger } = Sentry;
              logger.warn("Could not geocode zip", {
                zip: zone.zip,
                zone_id: zone.id,
              });
              // Schedule retry with backoff
              await supabaseAdmin
                .from('zones')
                .update({
                  next_process_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
                  processing_lock: null,
                  processing_lock_expires_at: null,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', zone.id)
              skipped++
              continue
            }

            // Discover dispensaries via Google Places
            const radiusMeters = DEFAULT_RADIUS_MILES * 1609.34 // Convert miles to meters
            const places = await searchDispensariesNearLocation(
              zipLocation.latitude,
              zipLocation.longitude,
              radiusMeters,
              20
            )

            if (places.length === 0) {
              // No dispensaries found - update zone and continue
              await supabaseAdmin
                .from('zones')
                .update({
                  last_processed_at: new Date().toISOString(),
                  next_process_at: new Date(Date.now() + zone.ttl_minutes * 60 * 1000).toISOString(),
                  processing_lock: null,
                  processing_lock_expires_at: null,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', zone.id)
              processed++
              continue
            }

            // Upsert dispensaries and link to zone
            let dispensariesLinked = 0
            for (const place of places) {
              // Get additional details if needed (website, phone)
              let placeDetails = place
              if (!place.website || !place.phone) {
                const details = await getPlaceDetails(place.place_id)
                if (details) {
                  placeDetails = { ...place, ...details }
                }
              }

              // Upsert dispensary by place_id
              const { data: existingDisp } = await supabaseAdmin
                .from('dispensaries')
                .select('id')
                .eq('place_id', placeDetails.place_id)
                .single()

              let dispensaryId: string

              if (existingDisp) {
                // Update existing
                const { data: updated } = await supabaseAdmin
                  .from('dispensaries')
                  .update({
                    name: placeDetails.name,
                    address: placeDetails.address || null,
                    latitude: placeDetails.latitude,
                    longitude: placeDetails.longitude,
                    phone: placeDetails.phone || null,
                    website: placeDetails.website || null,
                    city: zipLocation.city || null,
                    zip: zone.zip,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', existingDisp.id)
                  .select('id')
                  .single()

                if (updated) {
                  dispensaryId = updated.id
                } else {
                  continue
                }
              } else {
                // Insert new
                const { data: newDisp, error: insertError } = await supabaseAdmin
                  .from('dispensaries')
                  .insert({
                    place_id: placeDetails.place_id,
                    name: placeDetails.name,
                    address: placeDetails.address || null,
                    latitude: placeDetails.latitude,
                    longitude: placeDetails.longitude,
                    phone: placeDetails.phone || null,
                    website: placeDetails.website || null,
                    city: zipLocation.city || null,
                    zip: zone.zip,
                    state: zipLocation.state || 'MI',
                    active: true,
                  })
                  .select('id')
                  .single()

                if (insertError || !newDisp) {
                  const { logger } = Sentry;
                  logger.error("Failed to insert dispensary", {
                    error: insertError?.message,
                    dispensary_name: placeDetails.name,
                    zone_id: zone.id,
                    zip: zone.zip,
                  });

                  Sentry.captureException(insertError || new Error("Failed to insert dispensary"), {
                    tags: {
                      operation: "process_zones",
                      step: "insert_dispensary",
                    },
                    extra: {
                      dispensary_name: placeDetails.name,
                      zone_id: zone.id,
                    },
                  });

                  continue
                }

                dispensaryId = newDisp.id
              }

              // Link dispensary to zone
              await supabaseAdmin
                .from('zone_dispensaries')
                .upsert(
                  {
                    zone_id: zone.id,
                    dispensary_id: dispensaryId,
                    last_seen_at: new Date().toISOString(),
                  },
                  {
                    onConflict: 'zone_id,dispensary_id',
                  }
                )
              
              dispensariesLinked++
            }

            // Create DEALS_READY notifications for all users subscribed to this zone
            const { data: subscriptions } = await supabaseAdmin
              .from('user_subscriptions')
              .select('email')
              .eq('zone_id', zone.id)
              .limit(1000) // Prevent unbounded queries - reasonable limit per zone

            if (subscriptions && subscriptions.length > 0) {
              const notifications = subscriptions.map((sub) => ({
                email: sub.email,
                zone_id: zone.id,
                type: 'DEALS_READY' as const,
                status: 'PENDING' as const,
              }))

              // Upsert notifications (idempotent)
              await supabaseAdmin
                .from('notifications_outbox')
                .upsert(notifications, {
                  onConflict: 'email,zone_id,type',
                  ignoreDuplicates: true,
                })
            }

            // Update zone freshness and release lock
            await supabaseAdmin
              .from('zones')
              .update({
                last_processed_at: new Date().toISOString(),
                next_process_at: new Date(Date.now() + zone.ttl_minutes * 60 * 1000).toISOString(),
                processing_lock: null,
                processing_lock_expires_at: null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', zone.id)

            processed++
          } catch (error) {
            const { logger } = Sentry;
            logger.error(`Error processing zone ${zone.id} (${zone.zip})`, {
              error: error instanceof Error ? error.message : 'Unknown error',
              zone_id: zone.id,
              zip: zone.zip,
            });

            Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
              tags: {
                operation: "cron_process_zones",
                zone_id: zone.id,
                zone_zip: zone.zip,
              },
            });

            // Schedule retry with backoff
            const backoffMinutes = 15 // Simple backoff
            await supabaseAdmin
              .from('zones')
              .update({
                next_process_at: new Date(Date.now() + backoffMinutes * 60 * 1000).toISOString(),
                processing_lock: null,
                processing_lock_expires_at: null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', zone.id)

            failed++
          }
        }

        span.setAttribute("claimed", claimed);
        span.setAttribute("processed", processed);
        span.setAttribute("failed", failed);
        span.setAttribute("skipped", skipped);

        const { logger } = Sentry;
        logger.info("Zone processing completed", {
          claimed,
          processed,
          failed,
          skipped,
        });

        return NextResponse.json({
          ok: true,
          claimed,
          processed,
          failed,
          skipped,
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        span.setAttribute("error", true);
        span.setAttribute("error_message", errorMessage);

        const { logger } = Sentry;
        logger.error("Process zones cron failed", {
          error: errorMessage,
        });

        Sentry.captureException(error, {
          tags: {
            operation: "cron_process_zones",
            cron_type: "process-zones",
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
