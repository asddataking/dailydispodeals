import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.APP_URL || 'https://dailydispodeals.com'
  
  // Main pages
  const routes = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/#how-it-works`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/#pricing`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
  ]

  // Add location-based pages for SEO (Michigan cities)
  const michiganCities = [
    'detroit', 'grand-rapids', 'ann-arbor', 'lansing', 'flint', 'warren',
    'sterling-heights', 'troy', 'farmington-hills', 'kalamazoo', 'livonia',
    'dearborn', 'southfield', 'rochester-hills', 'taylor', 'st-clair-shores',
    'pontiac', 'wyoming', 'westland', 'saginaw', 'muskegon', 'bay-city',
    'midland', 'holland', 'mount-pleasant', 'battle-creek', 'jackson',
    'portage', 'east-lansing', 'royal-oak', 'ferndale', 'birmingham',
    'berkley', 'huntington-woods', 'clawson', 'madison-heights', 'hazel-park'
  ]

  const locationPages = michiganCities.map(city => ({
    url: `${baseUrl}/deals/${city}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }))

  return [...routes, ...locationPages]
}
