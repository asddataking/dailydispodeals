import { supabaseAdmin } from './supabase/server'

/**
 * Normalize brand name for matching (lowercase, trim, remove special chars)
 */
export function normalizeBrandName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '') // Remove special characters
}

/**
 * Extract brand name from product title
 * Common patterns: "BRAND Product", "BRAND - Product", "BRAND/Product"
 */
export function extractBrandFromTitle(title: string): { brand: string | null; productName: string } {
  const titleTrimmed = title.trim()
  
  // Common separators
  const separators = [' - ', ' / ', ' | ', ' – ', ' — ']
  
  for (const sep of separators) {
    const parts = titleTrimmed.split(sep)
    if (parts.length >= 2) {
      const potentialBrand = parts[0].trim()
      const productName = parts.slice(1).join(sep).trim()
      
      // If first part is short (likely brand) and second part is longer (product)
      if (potentialBrand.length <= 30 && productName.length > potentialBrand.length) {
        return { brand: potentialBrand, productName }
      }
    }
  }
  
  // Try to find brand at start (common pattern: "BRAND 1g carts")
  // Look for capitalized words at the start
  const words = titleTrimmed.split(/\s+/)
  if (words.length >= 2) {
    const firstWord = words[0]
    // If first word is all caps or starts with capital, likely brand
    if (firstWord === firstWord.toUpperCase() || /^[A-Z]/.test(firstWord)) {
      // Check if it's a known brand pattern (short, capitalized)
      if (firstWord.length <= 20 && firstWord.length >= 2) {
        const productName = words.slice(1).join(' ')
        return { brand: firstWord, productName }
      }
    }
  }
  
  // No brand found, return full title as product name
  return { brand: null, productName: titleTrimmed }
}

/**
 * Find or create a brand in the database
 */
export async function findOrCreateBrand(brandName: string): Promise<string | null> {
  if (!brandName || brandName.trim().length === 0) {
    return null
  }

  const normalized = normalizeBrandName(brandName)
  
  // First try exact match on normalized name
  const { data: existing } = await supabaseAdmin
    .from('brands')
    .select('id')
    .eq('normalized_name', normalized)
    .single()

  if (existing) {
    return existing.id
  }

  // Try case-insensitive match on name
  const { data: existingCaseInsensitive } = await supabaseAdmin
    .from('brands')
    .select('id')
    .ilike('name', brandName.trim())
    .single()

  if (existingCaseInsensitive) {
    return existingCaseInsensitive.id
  }

  // Create new brand
  const { data: newBrand, error } = await supabaseAdmin
    .from('brands')
    .insert({
      name: brandName.trim(),
      normalized_name: normalized,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating brand:', error)
    return null
  }

  return newBrand.id
}

/**
 * Get brand ID by name (case-insensitive)
 */
export async function getBrandId(brandName: string): Promise<string | null> {
  if (!brandName || brandName.trim().length === 0) {
    return null
  }

  const normalized = normalizeBrandName(brandName)
  
  const { data } = await supabaseAdmin
    .from('brands')
    .select('id')
    .eq('normalized_name', normalized)
    .single()

  return data?.id || null
}

/**
 * Get all brands (for preferences UI)
 */
export async function getAllBrands(): Promise<Array<{ id: string; name: string }>> {
  const { data, error } = await supabaseAdmin
    .from('brands')
    .select('id, name')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching brands:', error)
    return []
  }

  return data || []
}
