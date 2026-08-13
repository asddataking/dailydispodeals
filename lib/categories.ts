export const DEAL_CATEGORIES = [
  { slug: 'flower', label: 'Flower', aliases: ['flower'] },
  { slug: 'vapes', label: 'Vapes', aliases: ['vapes', 'vape', 'carts'] },
  { slug: 'concentrates', label: 'Concentrates', aliases: ['concentrates'] },
  { slug: 'edibles', label: 'Edibles', aliases: ['edibles'] },
  { slug: 'pre-rolls', label: 'Pre-Rolls', aliases: ['pre-rolls', 'prerolls'] },
  { slug: 'ounces', label: 'Ounces', aliases: ['ounces', 'oz'] },
] as const

export type DealCategorySlug = (typeof DEAL_CATEGORIES)[number]['slug']

export const NEWSLETTER_CATEGORIES = [
  { slug: 'flower', label: 'Flower' },
  { slug: 'vapes', label: 'Vapes' },
  { slug: 'concentrates', label: 'Concentrates' },
  { slug: 'edibles', label: 'Edibles' },
  { slug: 'pre-rolls', label: 'Pre-Rolls' },
] as const

export function categoryLabel(slug: string): string {
  return DEAL_CATEGORIES.find((c) => c.slug === slug)?.label || slug.replace(/-/g, ' ')
}

export function isDealCategory(slug: string): slug is DealCategorySlug {
  return DEAL_CATEGORIES.some((c) => c.slug === slug)
}
