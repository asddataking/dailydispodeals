export type CityRecord = {
  slug: string
  name: string
  state: string
  intro: string
  nearby: string[]
  faq: { question: string; answer: string }[]
}

export const CURATED_CITIES: CityRecord[] = [
  {
    slug: 'detroit',
    name: 'Detroit',
    state: 'MI',
    intro:
      'Detroit shoppers should not have to open ten menus to find out what is actually on special tonight. Daily Dispo Deals collects current dispensary promotions submitted by shops across the city so you can scan flower, carts, edibles and ounces in one place.',
    nearby: ['ann-arbor', 'flint', 'lansing'],
    faq: [
      {
        question: 'Where do Detroit dispensary deals come from?',
        answer: 'Dispensaries submit their own active promotions. We review formatting, dates and links, then publish them on this city page.',
      },
      {
        question: 'Are these deals free to browse?',
        answer: 'Yes. Shoppers browse Detroit deals for free. Every listing links back to the dispensary menu or website.',
      },
    ],
  },
  {
    slug: 'ann-arbor',
    name: 'Ann Arbor',
    state: 'MI',
    intro:
      'Ann Arbor has plenty of dispensaries and not enough time to hunt through every board. This page is a live roundup of submitted specials near campus, downtown and the surrounding townships.',
    nearby: ['detroit', 'lansing', 'jackson'],
    faq: [
      {
        question: 'How current are Ann Arbor deals?',
        answer: 'Every deal has an expiration date. Expired promotions are pulled from active listings automatically.',
      },
    ],
  },
  {
    slug: 'port-huron',
    name: 'Port Huron',
    state: 'MI',
    intro:
      'Port Huron cannabis shoppers can check today’s flower, cart and edible specials without driving menu to menu. Local dispensaries post their own deals here so the Blue Water area has one simple destination.',
    nearby: ['detroit', 'flint', 'lansing'],
    faq: [
      {
        question: 'Can Port Huron dispensaries submit for free?',
        answer: 'Yes. Standard deal submissions are free. Optional featured placements are available if a shop wants extra visibility.',
      },
    ],
  },
  {
    slug: 'grand-rapids',
    name: 'Grand Rapids',
    state: 'MI',
    intro:
      'West Michigan deals, minus the scavenger hunt. Grand Rapids dispensaries submit active specials — BOGOs, percent-off days, ounce drops — and we put them in front of people already looking.',
    nearby: ['lansing', 'holland', 'kalamazoo'],
    faq: [
      {
        question: 'Do you cover the greater Grand Rapids area?',
        answer: 'Listings are tagged to Grand Rapids and nearby cities. Use the statewide deals page if you want a wider look.',
      },
    ],
  },
  {
    slug: 'lansing',
    name: 'Lansing',
    state: 'MI',
    intro:
      'Capital-region shoppers can compare today’s dispensary specials in Lansing and East Lansing without bouncing between apps. Shops submit the promotion; we put it on this page until it expires.',
    nearby: ['ann-arbor', 'grand-rapids', 'flint'],
    faq: [
      {
        question: 'How do I get Lansing deals in my inbox?',
        answer: 'Join the free newsletter with your ZIP and optional category preferences. No payment required.',
      },
    ],
  },
  {
    slug: 'flint',
    name: 'Flint',
    state: 'MI',
    intro:
      'Flint and Genesee County specials belong in one feed, not ten Instagram stories. Dispensaries submit current deals; shoppers browse flower, vapes, concentrates and more for free.',
    nearby: ['detroit', 'lansing', 'saginaw'],
    faq: [
      {
        question: 'Is Daily Dispo Deals a menu or ordering app?',
        answer: 'No. We only list current promotions and send you to the dispensary’s own menu or website.',
      },
    ],
  },
  {
    slug: 'kalamazoo',
    name: 'Kalamazoo',
    state: 'MI',
    intro:
      'Kalamazoo shoppers can skip the menu crawl. This page highlights submitted dispensary specials around town — from weekday percent-offs to weekend drops.',
    nearby: ['grand-rapids', 'lansing', 'jackson'],
    faq: [
      {
        question: 'Can brands run Kalamazoo promotions here?',
        answer: 'Statewide and regional brand campaigns can be featured. Standard shop deals stay free to submit.',
      },
    ],
  },
  {
    slug: 'royal-oak',
    name: 'Royal Oak',
    state: 'MI',
    intro:
      'Royal Oak and the greater Woodward corridor have no shortage of shops. This page collects the specials those dispensaries actually want people to see today.',
    nearby: ['detroit', 'ferndale', 'ann-arbor'],
    faq: [
      {
        question: 'What does a verified dispensary mean?',
        answer: 'A verified badge means the shop has claimed or confirmed its profile. Submitted-by-dispensary still means the promotion came from the business.',
      },
    ],
  },
  {
    slug: 'ferndale',
    name: 'Ferndale',
    state: 'MI',
    intro:
      'Ferndale’s compact dispensary scene makes comparison easy — if the deals are in one place. Shops submit current specials; we keep expired ones off the active list.',
    nearby: ['royal-oak', 'detroit', 'ann-arbor'],
    faq: [
      {
        question: 'How fast can a Ferndale shop post a deal?',
        answer: 'The public submit form takes about a minute. We review formatting, dates and links, then publish.',
      },
    ],
  },
  {
    slug: 'saginaw',
    name: 'Saginaw',
    state: 'MI',
    intro:
      'Saginaw-area cannabis deals should not live only on a flyer in the window. Dispensaries can post today’s specials here so local shoppers can find them before they expire.',
    nearby: ['flint', 'lansing', 'bay-city'],
    faq: [
      {
        question: 'Do expired Saginaw deals stay up?',
        answer: 'Expired deals are removed from active listings. Old deal pages may remain for history and clearly say the deal has ended.',
      },
    ],
  },
]

export const POPULAR_CITIES = [
  'detroit',
  'ann-arbor',
  'port-huron',
  'grand-rapids',
  'lansing',
  'flint',
] as const

export const OLD_CITY_SLUGS = [
  'detroit',
  'grand-rapids',
  'ann-arbor',
  'lansing',
  'flint',
  'warren',
  'sterling-heights',
  'troy',
  'farmington-hills',
  'kalamazoo',
  'livonia',
  'dearborn',
  'southfield',
  'rochester-hills',
  'taylor',
  'st-clair-shores',
  'pontiac',
  'wyoming',
  'westland',
  'saginaw',
  'muskegon',
  'bay-city',
  'midland',
  'holland',
  'mount-pleasant',
  'battle-creek',
  'jackson',
  'portage',
  'east-lansing',
  'royal-oak',
  'ferndale',
  'birmingham',
  'berkley',
  'huntington-woods',
  'clawson',
  'madison-heights',
  'hazel-park',
] as const

export function getCity(slug: string): CityRecord | undefined {
  return CURATED_CITIES.find((c) => c.slug === slug)
}

export function cityName(slug: string): string {
  return getCity(slug)?.name || slug.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
}

export function matchCityQuery(query: string): CityRecord | undefined {
  const q = query.trim().toLowerCase()
  if (!q) return undefined
  const zipOnly = /^\d{5}$/.test(q)
  if (zipOnly) return undefined
  return CURATED_CITIES.find(
    (c) => c.slug === q || c.name.toLowerCase() === q || c.slug.replace(/-/g, ' ') === q
  )
}
