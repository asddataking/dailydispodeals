import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/server'
import { geocodeZip } from '@/lib/geocoding'
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

const dispensarySchema = z.object({
  name: z.string().min(1),
  city: z.string().optional(),
  zip: z.string().optional(),
  state: z.string().default('MI'),
  weedmaps_url: z.string().url().optional(),
  flyer_url: z.string().url().optional(),
  active: z.boolean().default(true),
})

const updateDispensarySchema = dispensarySchema.partial().extend({
  id: z.string().uuid(),
})

/**
 * GET /api/admin/dispensaries
 * List all dispensaries with stats
 */
export async function GET(request: NextRequest) {
  // Check admin session
  const session = await getAdminSession()
  if (!session.authenticated) {
    return unauthorized()
  }

  try {
    const { data: dispensaries, error } = await supabaseAdmin
      .from('dispensaries')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching dispensaries:', error)
      return serverError('Failed to fetch dispensaries', error)
    }

    // Get stats for each dispensary
    const dispensariesWithStats = await Promise.all(
      (dispensaries || []).map(async (disp) => {
        const { count: dealsCount } = await supabaseAdmin
          .from('deals')
          .select('id', { count: 'exact', head: true })
          .eq('dispensary_name', disp.name)
          .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

        return {
          ...disp,
          recent_deals_count: dealsCount || 0,
        }
      })
    )

    return success({ dispensaries: dispensariesWithStats })
  } catch (error) {
    console.error('Dispensaries API error:', error)
    return serverError('Internal server error')
  }
}

/**
 * POST /api/admin/dispensaries
 * Add a new dispensary
 */
export async function POST(request: NextRequest) {
  // Check admin session
  const session = await getAdminSession()
  if (!session.authenticated) {
    return unauthorized()
  }

  try {
    const body = await request.json()
    const validated = dispensarySchema.parse(body)

    // Geocode zip if provided
    let latitude: number | null = null
    let longitude: number | null = null

    if (validated.zip) {
      const location = await geocodeZip(validated.zip)
      if (location) {
        latitude = location.latitude
        longitude = location.longitude
      }
    }

    const { data, error } = await supabaseAdmin
      .from('dispensaries')
      .insert({
        name: validated.name,
        city: validated.city,
        zip: validated.zip,
        state: validated.state,
        weedmaps_url: validated.weedmaps_url,
        flyer_url: validated.flyer_url,
        active: validated.active,
        latitude,
        longitude,
      })
      .select()
      .single()

    if (error) {
      // Check if it's a duplicate
      if (error.code === '23505') {
        return validationError('Dispensary with this name already exists')
      }
      console.error('Error adding dispensary:', error)
      return serverError('Failed to add dispensary', error)
    }

    return success({ dispensary: data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError('Invalid input', error.errors)
    }
    console.error('Dispensaries API error:', error)
    return serverError('Internal server error')
  }
}

/**
 * PUT /api/admin/dispensaries
 * Update an existing dispensary
 */
export async function PUT(request: NextRequest) {
  // Check admin session
  const session = await getAdminSession()
  if (!session.authenticated) {
    return unauthorized()
  }

  try {
    const body = await request.json()
    const validated = updateDispensarySchema.parse(body)

    const { id, ...updates } = validated

    // Build update object with geocoding if zip is updated
    const updateData: Record<string, any> = {
      ...updates,
      updated_at: new Date().toISOString(),
    }

    // Geocode zip if it's being updated
    if (updates.zip) {
      const location = await geocodeZip(updates.zip)
      if (location) {
        updateData.latitude = location.latitude
        updateData.longitude = location.longitude
      }
    }

    const { data, error } = await supabaseAdmin
      .from('dispensaries')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating dispensary:', error)
      return serverError('Failed to update dispensary', error)
    }

    if (!data) {
      return notFound('Dispensary not found')
    }

    return success({ dispensary: data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError('Invalid input', error.errors)
    }
    console.error('Dispensaries API error:', error)
    return serverError('Internal server error')
  }
}

/**
 * DELETE /api/admin/dispensaries
 * Deactivate a dispensary (soft delete)
 */
export async function DELETE(request: NextRequest) {
  // Check admin session
  const session = await getAdminSession()
  if (!session.authenticated) {
    return unauthorized()
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return validationError('Dispensary ID required')
    }

    const { data, error } = await supabaseAdmin
      .from('dispensaries')
      .update({
        active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error deactivating dispensary:', error)
      return serverError('Failed to deactivate dispensary', error)
    }

    if (!data) {
      return notFound('Dispensary not found')
    }

    return success({ dispensary: data })
  } catch (error) {
    console.error('Dispensaries API error:', error)
    return serverError('Internal server error')
  }
}
