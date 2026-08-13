import { MetadataRoute } from 'next'
import { CURATED_CITIES } from '@/lib/cities'
import { DEAL_CATEGORIES } from '@/lib/categories'
import { GEAR_ARTICLES, GEAR_CATEGORIES } from '@/lib/gear'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.APP_URL || 'https://dailydispodeals.com'
  const now = new Date()

  const staticRoutes = [
    '',
    '/deals',
    '/michigan',
    '/dispensaries',
    '/brands',
    '/submit',
    '/for-dispensaries',
    '/advertise',
    '/gear',
    '/about',
    '/contact',
    '/terms',
    '/privacy',
    '/affiliate-disclosure',
  ].map((path) => ({
    url: `${baseUrl}${path || '/'}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: path === '' ? 1 : 0.8,
  }))

  const cities = CURATED_CITIES.map((c) => ({
    url: `${baseUrl}/michigan/${c.slug}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  const categories = DEAL_CATEGORIES.map((c) => ({
    url: `${baseUrl}/deals/${c.slug}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }))

  const gear = [...GEAR_CATEGORIES, ...GEAR_ARTICLES].map((g) => ({
    url: `${baseUrl}/gear/${g.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  return [...staticRoutes, ...cities, ...categories, ...gear]
}
