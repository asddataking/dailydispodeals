import { Metadata } from 'next'
import Link from 'next/link'

// Michigan cities for SEO pages
const CITY_NAMES: Record<string, string> = {
  'detroit': 'Detroit',
  'grand-rapids': 'Grand Rapids',
  'ann-arbor': 'Ann Arbor',
  'lansing': 'Lansing',
  'flint': 'Flint',
  'warren': 'Warren',
  'sterling-heights': 'Sterling Heights',
  'troy': 'Troy',
  'farmington-hills': 'Farmington Hills',
  'kalamazoo': 'Kalamazoo',
  'livonia': 'Livonia',
  'dearborn': 'Dearborn',
  'southfield': 'Southfield',
  'rochester-hills': 'Rochester Hills',
  'taylor': 'Taylor',
  'st-clair-shores': 'St. Clair Shores',
  'pontiac': 'Pontiac',
  'wyoming': 'Wyoming',
  'westland': 'Westland',
  'saginaw': 'Saginaw',
  'muskegon': 'Muskegon',
  'bay-city': 'Bay City',
  'midland': 'Midland',
  'holland': 'Holland',
  'mount-pleasant': 'Mount Pleasant',
  'battle-creek': 'Battle Creek',
  'jackson': 'Jackson',
  'portage': 'Portage',
  'east-lansing': 'East Lansing',
  'royal-oak': 'Royal Oak',
  'ferndale': 'Ferndale',
  'birmingham': 'Birmingham',
  'berkley': 'Berkley',
  'huntington-woods': 'Huntington Woods',
  'clawson': 'Clawson',
  'madison-heights': 'Madison Heights',
  'hazel-park': 'Hazel Park',
}

export async function generateStaticParams() {
  return Object.keys(CITY_NAMES).map((city) => ({
    city: city,
  }))
}

export async function generateMetadata({ params }: { params: { city: string } }): Promise<Metadata> {
  const cityName = CITY_NAMES[params.city] || params.city
  
  return {
    title: `Best Cannabis Deals in ${cityName}, Michigan | Daily Dispo Deals`,
    description: `Find the best daily cannabis deals in ${cityName}, Michigan. Get personalized dispensary deals on flower, vapes, edibles, and more delivered to your inbox. No searching required.`,
    keywords: [
      `cannabis deals ${cityName}`,
      `marijuana deals ${cityName}`,
      `dispensary deals ${cityName}`,
      `${cityName} cannabis`,
      `${cityName} dispensary deals`,
      `weed deals ${cityName}`,
      `cannabis ${cityName} Michigan`,
    ],
    openGraph: {
      title: `Best Cannabis Deals in ${cityName}, Michigan`,
      description: `Get personalized daily cannabis deals in ${cityName}, Michigan delivered to your inbox.`,
      type: 'website',
    },
    alternates: {
      canonical: `https://dailydispodeals.com/deals/${params.city}`,
    },
  }
}

export default function CityDealsPage({ params }: { params: { city: string } }) {
  const cityName = CITY_NAMES[params.city] || params.city

  // Structured data for local SEO
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: `Daily Dispo Deals - ${cityName}`,
    description: `Best daily cannabis deals in ${cityName}, Michigan. Personalized dispensary deals delivered via email.`,
    provider: {
      '@type': 'Organization',
      name: 'Daily Dispo Deals',
      url: 'https://dailydispodeals.com',
    },
    areaServed: {
      '@type': 'City',
      name: cityName,
      containedIn: {
        '@type': 'State',
        name: 'Michigan',
      },
    },
    serviceType: 'Cannabis Deal Aggregation',
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <h1 className="text-3xl sm:text-4xl font-bold text-lake-blue-900 mb-4">
            Best Cannabis Deals in {cityName}, Michigan
          </h1>
          <p className="text-lg text-gray-700 mb-8">
            Get personalized daily cannabis deals in {cityName} delivered directly to your inbox. 
            We scan dispensaries across {cityName} and find the best deals on flower, vapes, edibles, 
            concentrates, and more - so you don&apos;t have to.
          </p>

          <div className="bg-lake-blue-50 rounded-lg p-6 sm:p-8 mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-lake-blue-900 mb-4">
              Why Choose Daily Dispo Deals?
            </h2>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="text-lake-blue-700 mr-2">✓</span>
                <span><strong>Zero Searching:</strong> We do the work for you. No more checking multiple dispensary websites or apps.</span>
              </li>
              <li className="flex items-start">
                <span className="text-lake-blue-700 mr-2">✓</span>
                <span><strong>Personalized Deals:</strong> Get deals matched to your preferences - favorite products, brands, and price range.</span>
              </li>
              <li className="flex items-start">
                <span className="text-lake-blue-700 mr-2">✓</span>
                <span><strong>Daily Updates:</strong> Fresh deals every morning, so you never miss a great price.</span>
              </li>
              <li className="flex items-start">
                <span className="text-lake-blue-700 mr-2">✓</span>
                <span><strong>Price Comparison:</strong> See deals from multiple {cityName} dispensaries in one place.</span>
              </li>
              <li className="flex items-start">
                <span className="text-lake-blue-700 mr-2">✓</span>
                <span><strong>Better Than Weedmaps:</strong> While Weedmaps shows current deals, we find the BEST deals and deliver them to you daily.</span>
              </li>
            </ul>
          </div>

          <div className="bg-white border-2 border-lake-blue-200 rounded-lg p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-lake-blue-900 mb-4">
              Get Started Today
            </h2>
            <p className="text-gray-700 mb-6">
              Join thousands of Michigan cannabis consumers who get the best deals delivered daily. 
              Just $4.20/month or $42/year.
            </p>
            <Link
              href="/"
              className="inline-block bg-lake-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-lake-blue-800 transition shadow-lg min-h-[48px] flex items-center justify-center"
            >
              Get Daily Deals →
            </Link>
          </div>

          <div className="mt-8 text-sm text-gray-600">
            <p>
              <strong>Popular Categories:</strong> Flower Deals • Vape Cart Deals • Edible Deals • Concentrate Deals • Pre-Roll Deals
            </p>
            <p className="mt-2">
              <strong>Coverage:</strong> We monitor dispensaries across {cityName} and surrounding areas to bring you the best deals.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
