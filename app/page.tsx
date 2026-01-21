'use client'

import { useEffect, useState } from 'react'
import { PlanSelectionModal } from './components/PlanSelectionModal'
import { StructuredData } from './components/StructuredData'
import { FAQ } from './components/FAQ'
import { ManagePreferencesModal } from './components/ManagePreferencesModal'

export default function Home() {
  const [email, setEmail] = useState('')
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [managePrefsOpen, setManagePrefsOpen] = useState(false)
  const [videos, setVideos] = useState<
    Array<{
      id: string
      title: string
      description: string
      thumbnailUrl: string
      url: string
    }>
  >([])
  const [videosLoading, setVideosLoading] = useState(true)
  const [videosError, setVideosError] = useState<string | null>(null)

  // Structured data for SEO
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Daily Dispo Deals',
    description: 'Daily personalized cannabis deals delivered via email. Zero searching required.',
    provider: {
      '@type': 'Organization',
      name: 'Daily Dispo Deals',
      url: typeof window !== 'undefined' ? window.location.origin : 'https://dailydispodeals.com',
    },
    areaServed: {
      '@type': 'State',
      name: 'Michigan',
    },
    serviceType: 'Cannabis Deal Aggregation',
    offers: {
      '@type': 'Offer',
      price: '4.20',
      priceCurrency: 'USD',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: '4.20',
        priceCurrency: 'USD',
        billingDuration: 'P1M',
      },
    },
  }

  const handleGetDeals = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      setShowPlanModal(true)
    }
  }

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await fetch('/api/youtube/videos')
        if (!res.ok) {
          throw new Error(`Failed to load videos: ${res.status}`)
        }
        const data = await res.json()
        setVideos(data.videos || [])
      } catch (error) {
        console.error(error)
        setVideosError('Unable to load latest videos right now.')
      } finally {
        setVideosLoading(false)
      }
    }

    fetchVideos()
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <StructuredData data={structuredData} />
      {/* Hero Section with Lake Background */}
      <section className="relative min-h-screen flex items-center px-4 sm:px-6 md:px-12 py-16 sm:py-20">
        {/* Michigan Lake background - using local lake.jpg */}
        <div className="absolute inset-0 bg-[url('/lake.jpg')] bg-cover bg-center bg-no-repeat opacity-100"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-white"></div>

        {/* Header */}
        <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 sm:px-6 md:px-12 py-4 md:py-6">
          <div className="flex items-center">
            <span className="text-white font-bold text-lg sm:text-xl drop-shadow-lg">DAILY DISPO DEALS</span>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-white drop-shadow-md">
            <a href="#how-it-works" className="hover:text-gray-200 transition">How it works</a>
            <a href="#pricing" className="hover:text-gray-200 transition">Pricing</a>
            <a href="#info" className="hover:text-gray-200 transition">Info</a>
          </nav>
          
          {/* Mobile Menu Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPlanModal(true)}
              className="hidden sm:block bg-lake-blue-700 text-white px-4 sm:px-6 py-2 rounded-lg font-semibold hover:bg-lake-blue-800 transition shadow-lg text-sm sm:text-base"
            >
              Get Deals
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-white p-2 hover:bg-white/10 rounded-lg transition"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
          
          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="absolute top-full left-0 right-0 bg-lake-blue-900/95 backdrop-blur-md md:hidden z-30 shadow-xl">
              <nav className="flex flex-col px-4 py-4 space-y-3">
                <a 
                  href="#how-it-works" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-white py-3 px-4 hover:bg-white/10 rounded-lg transition"
                >
                  How it works
                </a>
                <a 
                  href="#pricing" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-white py-3 px-4 hover:bg-white/10 rounded-lg transition"
                >
                  Pricing
                </a>
                <a 
                  href="#info" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-white py-3 px-4 hover:bg-white/10 rounded-lg transition"
                >
                  Info
                </a>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    setShowPlanModal(true)
                  }}
                  className="bg-lake-blue-700 text-white px-4 py-3 rounded-lg font-semibold hover:bg-lake-blue-800 transition shadow-lg text-center mt-2"
                >
                  Get Deals
                </button>
              </nav>
            </div>
          )}
        </header>

        <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-6 md:gap-8 lg:gap-12 items-start relative z-10 pt-16 sm:pt-20">
          {/* Hero Content - Left Side */}
          <div className="pt-8 sm:pt-12 lg:pt-20">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 text-white leading-tight drop-shadow-lg">
              Daily Dispo Deals
            </h1>
            <p className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 text-white leading-tight drop-shadow-lg">
              Zero Searching.
            </p>
            <p className="text-lg sm:text-xl md:text-2xl mb-6 sm:mb-8 text-white leading-relaxed drop-shadow-sm">
              Tell us what you buy. We email you the best deals every day.
            </p>
            <form onSubmit={handleGetDeals} className="max-w-lg mb-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="flex-1 px-4 py-3 sm:py-3 rounded-lg text-gray-900 bg-white/95 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-lake-blue-500 shadow-lg text-base"
                />
                <button
                  type="submit"
                  className="bg-lake-blue-700 text-white px-6 sm:px-8 py-3 rounded-lg font-semibold hover:bg-lake-blue-800 transition shadow-lg text-base min-h-[48px]"
                >
                  Get My Deals
                </button>
              </div>
            </form>
            <p className="text-sm text-white sm:text-lake-blue-800 drop-shadow-sm">
              No spam - Cancel anytime
            </p>
          </div>

          {/* Today's Picks - Right Side */}
          <div className="mt-8 lg:mt-0 lg:pt-12">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 sm:p-6 shadow-2xl border border-white/20">
              <h2 className="text-xl sm:text-2xl font-bold text-lake-blue-900 mb-4">Today&apos;s Picks</h2>
              <div className="flex gap-2 mb-4 text-xs sm:text-sm flex-wrap">
                <button className="px-3 py-1.5 sm:py-1 bg-lake-blue-100 text-lake-blue-900 rounded-full font-medium min-h-[32px]">Flower Deals</button>
                <button className="px-3 py-1.5 sm:py-1 text-gray-600 hover:bg-gray-100 rounded-full min-h-[32px]">Vape Cart</button>
                <button className="px-3 py-1.5 sm:py-1 text-gray-600 hover:bg-gray-100 rounded-full min-h-[32px]">Specials</button>
              </div>
              
              {/* Deal Cards */}
              <div className="space-y-3 sm:space-y-4">
                <div className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition bg-white/50">
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-lake-blue-900 mb-1 text-sm sm:text-base">Greenhouse Lapeer</h3>
                      <p className="text-base sm:text-lg font-semibold text-gray-900 mb-1">3/$60 Exotic Eighths</p>
                      <p className="text-xs sm:text-sm text-gray-600">Sherbiato, Lemonatit, Gelonade - mix & match.</p>
                    </div>
                    <div className="w-full sm:w-20 h-32 sm:h-20 bg-gray-200 rounded-lg flex-shrink-0">
                      {/* Dispensary image placeholder */}
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition bg-white/50">
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-lake-blue-900 mb-1 text-sm sm:text-base">Gage Ferndale</h3>
                      <p className="text-base sm:text-lg font-semibold text-gray-900 mb-1">2/$60 Live Resin Carts 2g</p>
                      <p className="text-xs sm:text-sm text-gray-600">ST/8Z, Element, GLTino - mix & match.</p>
                    </div>
                    <div className="w-full sm:w-20 h-32 sm:h-20 bg-gray-200 rounded-lg flex-shrink-0">
                      {/* Product image placeholder */}
                    </div>
                  </div>
                </div>
              </div>

              <a href="#" className="block text-center text-lake-blue-700 font-semibold mt-4 hover:text-lake-blue-800 text-sm sm:text-base py-2">
                View All Deals →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section - Clean with lake colors */}
      <section id="how-it-works" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-12 bg-gradient-to-b from-white to-lake-blue-50/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-lake-blue-900 text-center mb-8 sm:mb-12">
            How it works
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 mb-8">
            <div className="bg-white p-5 sm:p-6 rounded-xl shadow-lg border border-lake-blue-100 hover:shadow-xl transition">
              <div className="w-12 h-12 bg-lake-blue-700 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                1
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-lake-blue-900 mb-2">
                Set Your Preferences
              </h3>
              <p className="text-sm sm:text-base text-gray-700">
                Pick your products, brands, and how far you want to travel.
              </p>
            </div>
            <div className="bg-white p-5 sm:p-6 rounded-xl shadow-lg border border-lake-blue-100 hover:shadow-xl transition">
              <div className="w-12 h-12 bg-lake-blue-700 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                2
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-lake-blue-900 mb-2">
                We Scan the Deals
              </h3>
              <p className="text-sm sm:text-base text-gray-700">
                Our system checks the latest dispensary deals every day.
              </p>
            </div>
            <div className="bg-white p-5 sm:p-6 rounded-xl shadow-lg border border-lake-blue-100 hover:shadow-xl transition sm:col-span-2 md:col-span-1">
              <div className="w-12 h-12 bg-lake-blue-700 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                3
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-lake-blue-900 mb-2">
                Get Top Picks Daily
              </h3>
              <p className="text-sm sm:text-base text-gray-700">
                We email you the best local deals, personalized just for you.
              </p>
            </div>
          </div>
          <div className="text-center">
            <a href="#pricing" className="inline-block bg-lake-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-lake-blue-800 transition shadow-lg min-h-[48px] flex items-center justify-center">
              See how it works →
            </a>
          </div>
        </div>
      </section>

      {/* Latest from Dank N' Devour Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-12 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-lake-blue-900 mb-8 sm:mb-12 text-center sm:text-left">
            Latest from Dank N&apos; Devour
          </h2>

          {videosLoading && (
            <div className="grid sm:grid-cols-2 gap-6 sm:gap-8">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl overflow-hidden shadow-lg border border-lake-blue-100 animate-pulse"
                >
                  <div className="h-48 sm:h-64 bg-lake-blue-100" />
                  <div className="p-4 sm:p-6 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-24" />
                    <div className="h-5 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-full" />
                    <div className="h-10 bg-gray-200 rounded w-32" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!videosLoading && videosError && (
            <div className="text-sm sm:text-base text-gray-600">
              {videosError}
            </div>
          )}

          {!videosLoading && !videosError && videos.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-6 sm:gap-8">
              {videos.map((video) => (
                <a
                  key={video.id}
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition border border-lake-blue-100 group"
                >
                  <div className="h-48 sm:h-64 bg-gray-200 overflow-hidden">
                    {video.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lake-blue-700 text-sm sm:text-base px-4 text-center bg-gradient-to-br from-lake-blue-100 to-lake-blue-200">
                        Video thumbnail
                      </div>
                    )}
                  </div>
                  <div className="p-4 sm:p-6">
                    <div className="text-xs sm:text-sm text-gray-500 mb-2 font-medium">
                      DANK N&apos; DEVOUR
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold mb-2 text-lake-blue-900 line-clamp-2">
                      {video.title}
                    </h3>
                    <p className="text-gray-700 text-xs sm:text-sm mb-4 line-clamp-3">
                      {video.description}
                    </p>
                    <button className="text-lake-blue-700 font-semibold hover:text-lake-blue-800 text-sm sm:text-base py-2 min-h-[44px]">
                      Watch Now →
                    </button>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Affiliate Deal Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-12 bg-gradient-to-b from-white to-lake-blue-50/30">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-xl p-6 sm:p-8 md:p-12 shadow-xl border border-lake-blue-100">
            <div className="grid md:grid-cols-2 gap-6 sm:gap-8 items-center">
              <div>
                <div className="text-xs sm:text-sm text-gray-500 mb-2 font-medium">AFFILIATE DEAL</div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-lake-blue-900 mb-4">
                  20% Off Arizer XQ2 Vaporizers!
                </h2>
                <p className="text-sm sm:text-base text-gray-700 mb-6">
                  Use code DANK20 at checkout for 20% off the best dry herb vaporizer.
                </p>
                <button className="bg-lake-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-lake-blue-800 transition shadow-lg min-h-[48px] w-full sm:w-auto">
                  Shop Now →
                </button>
              </div>
              <div className="h-48 sm:h-64 bg-gradient-to-br from-lake-blue-100 to-lake-blue-200 rounded-lg flex items-center justify-center">
                {/* Image placeholder for Vaporizer */}
                <div className="text-lake-blue-700 text-sm sm:text-base px-4 text-center">Image: Arizer XQ2 Vaporizer</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-12 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-lake-blue-900 mb-8 sm:mb-12">
            Simple Pricing
          </h2>
          <div className="grid sm:grid-cols-2 gap-6 sm:gap-8">
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-lake-blue-100 hover:shadow-xl transition">
              <h3 className="text-xl sm:text-2xl font-bold mb-4 text-lake-blue-900">Monthly</h3>
              <div className="text-3xl sm:text-4xl font-bold text-lake-blue-700 mb-4">$4.20</div>
              <p className="text-sm sm:text-base text-gray-700 mb-6">per month</p>
              <button
                onClick={() => setShowPlanModal(true)}
                className="w-full bg-lake-blue-700 text-white py-3 rounded-lg font-semibold hover:bg-lake-blue-800 transition shadow-lg min-h-[48px]"
              >
                Get Started
              </button>
            </div>
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border-2 border-lake-blue-700 hover:shadow-xl transition">
              <h3 className="text-xl sm:text-2xl font-bold mb-4 text-lake-blue-900">Yearly</h3>
              <div className="text-3xl sm:text-4xl font-bold text-lake-blue-700 mb-4">$42</div>
              <p className="text-sm sm:text-base text-gray-700 mb-6">per year (Save $8.40)</p>
              <button
                onClick={() => setShowPlanModal(true)}
                className="w-full bg-lake-blue-700 text-white py-3 rounded-lg font-semibold hover:bg-lake-blue-800 transition shadow-lg min-h-[48px]"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <FAQ />

      {/* Footer */}
      <footer className="bg-gradient-to-b from-lake-blue-900 to-lake-blue-950 text-white py-8 sm:py-12 px-4 sm:px-6 md:px-12">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm sm:text-base text-gray-300 text-center sm:text-left">
            © 2024 Daily Dispo Deals. All rights reserved.
          </p>
          <button
            type="button"
            onClick={() => setManagePrefsOpen(true)}
            className="text-xs sm:text-sm text-gray-200 hover:text-white underline-offset-2 hover:underline"
          >
            Manage preferences
          </button>
        </div>
      </footer>

      <PlanSelectionModal
        open={showPlanModal}
        onOpenChange={setShowPlanModal}
        initialEmail={email}
      />

      <ManagePreferencesModal
        open={managePrefsOpen}
        onOpenChange={setManagePrefsOpen}
      />
    </div>
  )
}
