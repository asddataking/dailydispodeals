import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getAdminSession } from '@/lib/admin-auth'
import {
  success,
  unauthorized,
  validationError,
  notFound,
  serverError,
} from '@/lib/api-response'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const reviewActionSchema = z.object({
  review_id: z.string().uuid(),
  action: z.enum(['approve', 'reject', 'fix']),
  notes: z.string().optional(),
  reviewed_by: z.string().email().optional(),
})

/**
 * GET /api/admin/deals/review
 * List pending deal reviews
 */
export async function GET(request: NextRequest) {
  // Check admin session
  const session = await getAdminSession()
  if (!session.authenticated) {
    return unauthorized()
  }

  try {
    const { data: reviews, error } = await supabaseAdmin
      .from('deal_reviews')
      .select(`
        id,
        deal_id,
        reason,
        status,
        notes,
        created_at,
        deals (
          id,
          dispensary_name,
          city,
          date,
          category,
          title,
          price_text,
          confidence,
          source_url
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching reviews:', error)
      return serverError('Failed to fetch reviews', error)
    }

    return success({ reviews: reviews || [] })
  } catch (error) {
    console.error('Review API error:', error)
    return serverError('Internal server error')
  }
}

/**
 * POST /api/admin/deals/review
 * Approve, reject, or fix a deal review
 */
export async function POST(request: NextRequest) {
  // Check admin session
  const session = await getAdminSession()
  if (!session.authenticated) {
    return unauthorized()
  }

  try {
    const body = await request.json()
    const validated = reviewActionSchema.parse(body)

    // Get the review
    const { data: review, error: reviewError } = await supabaseAdmin
      .from('deal_reviews')
      .select('deal_id, status')
      .eq('id', validated.review_id)
      .eq('status', 'pending')
      .single()

    if (reviewError || !review) {
      return notFound('Review not found or already processed')
    }

    const reviewedBy = validated.reviewed_by || process.env.ADMIN_EMAIL || 'system'

    if (validated.action === 'approve') {
      // Approve the deal - remove review flag
      await supabaseAdmin
        .from('deals')
        .update({
          needs_review: false,
          reviewed_at: new Date().toISOString(),
          reviewed_by: reviewedBy,
        })
        .eq('id', review.deal_id)

      // Update review status
      await supabaseAdmin
        .from('deal_reviews')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: reviewedBy,
          notes: validated.notes,
        })
        .eq('id', validated.review_id)

      return success({ ok: true, action: 'approved' })
    } else if (validated.action === 'reject') {
      // Reject the deal - mark as reviewed but keep needs_review flag
      await supabaseAdmin
        .from('deals')
        .update({
          reviewed_at: new Date().toISOString(),
          reviewed_by: reviewedBy,
        })
        .eq('id', review.deal_id)

      // Update review status
      await supabaseAdmin
        .from('deal_reviews')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: reviewedBy,
          notes: validated.notes,
        })
        .eq('id', validated.review_id)

      return success({ ok: true, action: 'rejected' })
    } else if (validated.action === 'fix') {
      // Deal was fixed - remove review flag
      await supabaseAdmin
        .from('deals')
        .update({
          needs_review: false,
          reviewed_at: new Date().toISOString(),
          reviewed_by: reviewedBy,
        })
        .eq('id', review.deal_id)

      // Update review status
      await supabaseAdmin
        .from('deal_reviews')
        .update({
          status: 'fixed',
          reviewed_at: new Date().toISOString(),
          reviewed_by: reviewedBy,
          notes: validated.notes,
        })
        .eq('id', validated.review_id)

      return success({ ok: true, action: 'fixed' })
    }

    return validationError('Invalid action')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError('Invalid input', error.errors)
    }
    console.error('Review API error:', error)
    return serverError('Internal server error')
  }
}
