import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase/server'
import Stripe from 'stripe'
import * as Sentry from "@sentry/nextjs"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "Stripe Webhook",
    },
    async (span) => {
      const body = await request.text()
      const headersList = await headers()
      const signature = headersList.get('stripe-signature')

      if (!signature) {
        span.setAttribute("error", true);
        span.setAttribute("error_type", "missing_signature");
        return NextResponse.json(
          { error: 'No signature' },
          { status: 400 }
        )
      }

      let event: Stripe.Event

      try {
        event = stripe.webhooks.constructEvent(
          body,
          signature,
          process.env.STRIPE_WEBHOOK_SECRET!
        )
        
        span.setAttribute("event_type", event.type);
        span.setAttribute("event_id", event.id);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        
        span.setAttribute("error", true);
        span.setAttribute("error_type", "signature_verification_failed");

        const { logger } = Sentry;
        logger.error("Webhook signature verification failed", {
          error: errorMessage,
        });

        Sentry.captureException(err instanceof Error ? err : new Error(errorMessage), {
          tags: {
            operation: "stripe_webhook",
            step: "signature_verification",
          },
        });

        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 400 }
        )
      }

      try {
        if (event.type === 'checkout.session.completed') {
          const session = event.data.object as Stripe.Checkout.Session
          
          span.setAttribute("checkout_session_id", session.id);
          span.setAttribute("customer_id", session.customer as string || "unknown");
          
          if (!session.customer || !session.subscription) {
            const { logger } = Sentry;
            logger.warn("Missing customer or subscription in session", {
              session_id: session.id,
            });

            span.setAttribute("error", true);
            span.setAttribute("error_type", "missing_customer_or_subscription");
            return NextResponse.json({ received: true })
          }

          // Get customer email
          const customer = await stripe.customers.retrieve(session.customer as string)
          const email = typeof customer === 'object' && !customer.deleted ? customer.email : null

          if (!email) {
            const { logger } = Sentry;
            logger.warn("No email found for customer", {
              customer_id: session.customer as string,
            });

            span.setAttribute("error", true);
            span.setAttribute("error_type", "missing_email");
            return NextResponse.json({ received: true })
          }

          // Get subscription details
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
          const priceId = subscription.items.data[0]?.price.id
          const plan = priceId === process.env.STRIPE_MONTHLY_PRICE_ID ? 'monthly' : 'yearly'

          span.setAttribute("plan", plan);
          span.setAttribute("subscription_id", subscription.id);

          // Get auth_user_id from session metadata (created in create-checkout-session)
          const authUserId = session.metadata?.auth_user_id

          if (!authUserId) {
            const { logger } = Sentry;
            logger.error("No auth_user_id in session metadata", {
              session_id: session.id,
              customer_id: session.customer as string,
            });

            span.setAttribute("error", true);
            span.setAttribute("error_type", "missing_auth_user_id");
            
            Sentry.captureException(new Error("Missing auth_user_id in Stripe session metadata"), {
              tags: {
                operation: "stripe_webhook",
                event_type: "checkout.session.completed",
              },
              extra: {
                session_id: session.id,
                customer_id: session.customer as string,
              },
            });

            return NextResponse.json({ received: true })
          }

          // Upsert user with auth_user_id as the primary key
          const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .upsert(
              {
                id: authUserId,
                email,
              },
              { onConflict: 'id' }
            )
            .select('id')
            .single()

          if (userError || !user) {
            const { logger } = Sentry;
            logger.error("Failed to upsert user", {
              error: userError?.message,
              auth_user_id: authUserId,
              email,
            });

            span.setAttribute("error", true);
            Sentry.captureException(userError || new Error("Failed to upsert user"), {
              tags: {
                operation: "stripe_webhook",
                step: "upsert_user",
              },
              extra: {
                auth_user_id: authUserId,
                email,
              },
            });

            // Return error so Stripe retries
            return NextResponse.json(
              { error: 'Failed to create user' },
              { status: 500 }
            )
          }

          // Upsert subscription
          const { error: subscriptionError } = await supabaseAdmin
            .from('subscriptions')
            .upsert({
              user_id: user.id,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: subscription.id,
              plan,
              status: subscription.status,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'stripe_subscription_id',
            })

          if (subscriptionError) {
            const { logger } = Sentry;
            logger.error("Failed to upsert subscription", {
              error: subscriptionError.message,
              subscription_id: subscription.id,
              user_id: user.id,
            });

            span.setAttribute("error", true);
            Sentry.captureException(subscriptionError, {
              tags: {
                operation: "stripe_webhook",
                step: "upsert_subscription",
              },
              extra: {
                subscription_id: subscription.id,
                user_id: user.id,
              },
            });

            // Return error so Stripe retries
            return NextResponse.json(
              { error: 'Failed to create subscription' },
              { status: 500 }
            )
          }

          const { logger } = Sentry;
          logger.info("Checkout session completed successfully", {
            session_id: session.id,
            user_id: user.id,
            subscription_id: subscription.id,
            plan,
          });

        } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
          const subscription = event.data.object as Stripe.Subscription

          span.setAttribute("subscription_id", subscription.id);
          span.setAttribute("subscription_status", subscription.status);

          // Update subscription by stripe_subscription_id
          const { error: updateError } = await supabaseAdmin
            .from('subscriptions')
            .update({
              status: subscription.status,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', subscription.id)

          if (updateError) {
            const { logger } = Sentry;
            logger.error("Failed to update subscription", {
              error: updateError.message,
              subscription_id: subscription.id,
              status: subscription.status,
            });

            span.setAttribute("error", true);
            Sentry.captureException(updateError, {
              tags: {
                operation: "stripe_webhook",
                event_type: event.type,
                step: "update_subscription",
              },
              extra: {
                subscription_id: subscription.id,
                status: subscription.status,
              },
            });

            // Return error so Stripe retries
            return NextResponse.json(
              { error: 'Failed to update subscription' },
              { status: 500 }
            )
          }

          const { logger } = Sentry;
          logger.info("Subscription updated successfully", {
            subscription_id: subscription.id,
            status: subscription.status,
            event_type: event.type,
          });
        } else {
          const { logger } = Sentry;
          logger.info("Unhandled webhook event type", {
            event_type: event.type,
            event_id: event.id,
          });
        }

        return NextResponse.json({ received: true })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        span.setAttribute("error", true);
        span.setAttribute("error_message", errorMessage);

        const { logger } = Sentry;
        logger.error("Webhook handler error", {
          error: errorMessage,
          event_type: event.type,
          event_id: event.id,
        });

        Sentry.captureException(error instanceof Error ? error : new Error(errorMessage), {
          tags: {
            operation: "stripe_webhook",
            event_type: event.type,
          },
          extra: {
            event_id: event.id,
          },
        });

        // Return 500 so Stripe retries
        return NextResponse.json(
          { error: 'Webhook handler failed' },
          { status: 500 }
        )
      }
    }
  );
}
