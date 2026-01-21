import { createHash } from 'crypto'
import { supabaseAdmin } from './supabase/server'
import type { Deal } from './ai-parser'

interface DealWithMetadata extends Deal {
  dispensary_name: string
  date: string
  city?: string
}

interface QualityCheckResult {
  isValid: boolean
  needsReview: boolean
  reviewReason?: string
  duplicateFound?: boolean
}

/**
 * Calculate a hash for duplicate detection
 * Based on dispensary_name + title + price_text + date
 */
export function calculateDealHash(deal: DealWithMetadata): string {
  const hashString = `${deal.dispensary_name}|${deal.title}|${deal.price_text}|${deal.date}`
  return createHash('sha256').update(hashString.toLowerCase().trim()).digest('hex')
}

/**
 * Check if a similar deal already exists
 */
export async function checkForDuplicates(
  deal: DealWithMetadata,
  dealHash: string
): Promise<boolean> {
  // Check for exact hash match (same dispensary, title, price, date)
  const { data: exactMatch } = await supabaseAdmin
    .from('deals')
    .select('id')
    .eq('dispensary_name', deal.dispensary_name)
    .eq('date', deal.date)
    .eq('deal_hash', dealHash)
    .limit(1)
    .single()

  if (exactMatch) {
    return true
  }

  // Check for similar deals (same dispensary, similar title/price within 7 days)
  const sevenDaysAgo = new Date(deal.date)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

  const { data: similarDeals } = await supabaseAdmin
    .from('deals')
    .select('id, title, price_text')
    .eq('dispensary_name', deal.dispensary_name)
    .gte('date', sevenDaysAgoStr)
    .lte('date', deal.date)

  if (!similarDeals || similarDeals.length === 0) {
    return false
  }

  // Check for similar titles (fuzzy match)
  const normalizedTitle = deal.title.toLowerCase().trim()
  for (const existing of similarDeals) {
    const normalizedExisting = existing.title.toLowerCase().trim()
    
    // Check if titles are very similar (simple approach)
    if (normalizedTitle === normalizedExisting) {
      // Same title, check if price is similar
      const priceMatch = extractPrice(deal.price_text) === extractPrice(existing.price_text)
      if (priceMatch) {
        return true
      }
    }
  }

  return false
}

/**
 * Extract numeric price from price text for comparison
 */
function extractPrice(priceText: string): number | null {
  // Try to extract first number
  const match = priceText.match(/(\d+(?:\.\d+)?)/)
  return match ? parseFloat(match[1]) : null
}

/**
 * Validate deal quality and determine if it needs review
 */
export async function validateDealQuality(
  deal: DealWithMetadata
): Promise<QualityCheckResult> {
  const dealHash = calculateDealHash(deal)
  const reasons: string[] = []

  // Check confidence threshold
  const confidenceThreshold = parseFloat(process.env.DEAL_CONFIDENCE_THRESHOLD || '0.7')
  const reviewThreshold = parseFloat(process.env.DEAL_REVIEW_THRESHOLD || '0.5')
  
  const confidence = deal.confidence ?? 1.0

  if (confidence < reviewThreshold) {
    reasons.push('low_confidence')
  }

  // Check for duplicates
  const isDuplicate = await checkForDuplicates(deal, dealHash)
  if (isDuplicate) {
    return {
      isValid: false,
      needsReview: false,
      duplicateFound: true,
    }
  }

  // Validate price reasonableness
  const price = extractPrice(deal.price_text)
  if (price !== null) {
    // Flag unusually high prices (>$200) or suspiciously low (<$1)
    if (price > 200) {
      reasons.push('unusual_price_high')
    } else if (price < 1 && price > 0) {
      reasons.push('unusual_price_low')
    }
  }

  // Validate category matches title keywords
  const categoryMismatch = checkCategoryMismatch(deal.category, deal.title)
  if (categoryMismatch) {
    reasons.push('category_mismatch')
  }

  // If confidence is below threshold but above review threshold, needs review
  const needsReview = confidence < confidenceThreshold || reasons.length > 0

  return {
    isValid: true,
    needsReview,
    reviewReason: reasons.length > 0 ? reasons.join(', ') : undefined,
    duplicateFound: false,
  }
}

/**
 * Check if category matches title keywords
 */
function checkCategoryMismatch(category: string, title: string): boolean {
  const titleLower = title.toLowerCase()
  
  const categoryKeywords: Record<string, string[]> = {
    'flower': ['flower', 'bud', 'eighth', 'ounce', 'oz', 'gram', 'g'],
    'pre-rolls': ['pre-roll', 'preroll', 'joint', 'blunt'],
    'vapes': ['vape', 'cart', 'cartridge', 'pen', 'disposable'],
    'concentrates': ['concentrate', 'wax', 'shatter', 'live resin', 'rosin', 'dab'],
    'edibles': ['edible', 'gummy', 'gummies', 'chocolate', 'cookie', 'brownie'],
    'drinks': ['drink', 'beverage', 'soda', 'tea'],
    'topicals': ['topical', 'cream', 'lotion', 'balm'],
    'cbd/thca': ['cbd', 'thca', 'hemp'],
    'accessories': ['accessory', 'grinder', 'pipe', 'bong', 'vaporizer'],
  }

  const keywords = categoryKeywords[category] || []
  if (keywords.length === 0) return false

  // Check if any keyword appears in title
  const hasKeyword = keywords.some(keyword => titleLower.includes(keyword))
  
  // If category doesn't match, flag for review
  return !hasKeyword
}

/**
 * Flag a deal for manual review
 */
export async function flagForReview(
  dealId: string,
  reason: string,
  notes?: string
): Promise<void> {
  // Update deal
  await supabaseAdmin
    .from('deals')
    .update({
      needs_review: true,
    })
    .eq('id', dealId)

  // Create review queue entry
  await supabaseAdmin
    .from('deal_reviews')
    .insert({
      deal_id: dealId,
      reason,
      notes,
      status: 'pending',
    })
}
