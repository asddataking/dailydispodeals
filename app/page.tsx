'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
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
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="pt-8 sm:pt-12 lg:pt-20"
          >
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 text-white leading-tight drop-shadow-lg"
            >
              Daily Dispo Deals
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 text-white leading-tight drop-shadow-lg"
            >
              Zero Searching.
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="text-lg sm:text-xl md:text-2xl mb-6 sm:mb-8 text-white leading-relaxed drop-shadow-sm"
            >
              Tell us what you buy. We email you the best deals every day.
            </motion.p>
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              onSubmit={handleGetDeals}
              className="max-w-lg mb-4"
            >
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="flex-1 px-4 py-3 sm:py-3 rounded-lg text-gray-900 bg-white/95 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-lake-blue-500 shadow-lg text-base"
                />
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-lake-blue-700 text-white px-6 sm:px-8 py-3 rounded-lg font-semibold hover:bg-lake-blue-800 transition shadow-lg text-base min-h-[48px]"
                >
                  Get My Deals
                </motion.button>
              </div>
            </motion.form>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="text-sm text-white sm:text-lake-blue-800 drop-shadow-sm"
            >
              No spam - Cancel anytime
            </motion.p>
          </motion.div>

          {/* Today's Picks - Right Side */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 lg:mt-0 lg:pt-12"
          >
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white/95 backdrop-blur-md rounded-2xl p-4 sm:p-6 shadow-2xl border border-white/20"
            >
              <h2 className="text-xl sm:text-2xl font-bold text-lake-blue-900 mb-4 text-center">Today&apos;s Picks</h2>
              
              {/* Deal Cards */}
              <div className="space-y-3 sm:space-y-4">
                {[
                  {
                    dispensary: 'Greenhouse Lapeer',
                    deal: '3/$60 Exotic Eighths',
                    description: 'Sherbiato, Lemonatit, Gelonade - mix & match.',
                  },
                  {
                    dispensary: 'Gage Ferndale',
                    deal: '2/$60 Live Resin Carts 2g',
                    description: 'ST/8Z, Element, GLTino - mix & match.',
                  },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 + index * 0.1, ease: [0.16, 1, 0.3, 1] }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition bg-white/50"
                  >
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-lake-blue-900 mb-1 text-sm sm:text-base">{item.dispensary}</h3>
                        <p className="text-base sm:text-lg font-semibold text-gray-900 mb-1">{item.deal}</p>
                        <p className="text-xs sm:text-sm text-gray-600">{item.description}</p>
                      </div>
                      <div className="w-full sm:w-20 h-32 sm:h-20 bg-gray-200 rounded-lg flex-shrink-0">
                        {/* Dispensary image placeholder */}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.a
                href="#"
                whileHover={{ x: 4 }}
                className="block text-center text-lake-blue-700 font-semibold mt-4 hover:text-lake-blue-800 text-sm sm:text-base py-2"
              >
                View All Deals →
              </motion.a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section - Clean with lake colors */}
      <section id="how-it-works" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-12 bg-gradient-to-b from-white to-lake-blue-50/30">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-lake-blue-900 text-center mb-8 sm:mb-12"
          >
            How it works
          </motion.h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 mb-8">
            {[
              {
                number: '1',
                title: 'Set Your Preferences',
                description: 'Pick your products, brands, and how far you want to travel.',
              },
              {
                number: '2',
                title: 'We Scan the Deals',
                description: 'Our system checks the latest dispensary deals every day.',
              },
              {
                number: '3',
                title: 'Get Top Picks Daily',
                description: 'We email you the best local deals, personalized just for you.',
                colSpan: 'sm:col-span-2 md:col-span-1',
              },
            ].map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.6, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -4, scale: 1.02 }}
                className={`bg-white p-5 sm:p-6 rounded-xl shadow-lg border border-lake-blue-100 hover:shadow-xl transition ${step.colSpan || ''}`}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 + 0.2, type: 'spring' }}
                  className="w-12 h-12 bg-lake-blue-700 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4"
                >
                  {step.number}
                </motion.div>
                <h3 className="text-lg sm:text-xl font-semibold text-lake-blue-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-sm sm:text-base text-gray-700">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center"
          >
            <motion.a
              href="#pricing"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center justify-center bg-lake-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-lake-blue-800 transition shadow-lg min-h-[48px]"
            >
              See how it works →
            </motion.a>
          </motion.div>
        </div>
      </section>

      {/* Affiliate Deal Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-12 bg-gradient-to-b from-white to-lake-blue-50/30 relative overflow-hidden">
        {/* Palm Tree Background Outlines */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.08]">
          {/* Left side palm tree */}
          <svg className="absolute left-0 bottom-0 w-64 h-96 text-amber-300" viewBox="0 0 200 300" fill="none" stroke="currentColor" strokeWidth="2.5">
            {/* Trunk */}
            <line x1="100" y1="300" x2="100" y2="200" strokeLinecap="round"/>
            {/* Fronds - left side */}
            <path d="M100 200 Q70 180 50 150 Q35 125 25 100 Q18 80 15 60 Q12 40 10 20" strokeLinecap="round"/>
            <path d="M100 200 Q75 185 60 160 Q48 140 40 115 Q33 95 28 75 Q24 55 22 35" strokeLinecap="round"/>
            <path d="M100 200 Q80 190 70 170 Q60 150 52 130 Q45 110 40 90 Q36 70 34 50" strokeLinecap="round"/>
            {/* Fronds - right side */}
            <path d="M100 200 Q130 180 150 150 Q165 125 175 100 Q182 80 185 60 Q188 40 190 20" strokeLinecap="round"/>
            <path d="M100 200 Q125 185 140 160 Q152 140 160 115 Q167 95 172 75 Q176 55 178 35" strokeLinecap="round"/>
            <path d="M100 200 Q120 190 130 170 Q140 150 148 130 Q155 110 160 90 Q164 70 166 50" strokeLinecap="round"/>
            {/* Top fronds */}
            <path d="M100 200 Q90 190 85 175 Q80 160 78 145" strokeLinecap="round"/>
            <path d="M100 200 Q110 190 115 175 Q120 160 122 145" strokeLinecap="round"/>
          </svg>
          
          {/* Right side palm tree */}
          <svg className="absolute right-0 bottom-0 w-64 h-96 text-amber-300" viewBox="0 0 200 300" fill="none" stroke="currentColor" strokeWidth="2.5">
            {/* Trunk */}
            <line x1="100" y1="300" x2="100" y2="200" strokeLinecap="round"/>
            {/* Fronds - left side */}
            <path d="M100 200 Q70 180 50 150 Q35 125 25 100 Q18 80 15 60 Q12 40 10 20" strokeLinecap="round"/>
            <path d="M100 200 Q75 185 60 160 Q48 140 40 115 Q33 95 28 75 Q24 55 22 35" strokeLinecap="round"/>
            <path d="M100 200 Q80 190 70 170 Q60 150 52 130 Q45 110 40 90 Q36 70 34 50" strokeLinecap="round"/>
            {/* Fronds - right side */}
            <path d="M100 200 Q130 180 150 150 Q165 125 175 100 Q182 80 185 60 Q188 40 190 20" strokeLinecap="round"/>
            <path d="M100 200 Q125 185 140 160 Q152 140 160 115 Q167 95 172 75 Q176 55 178 35" strokeLinecap="round"/>
            <path d="M100 200 Q120 190 130 170 Q140 150 148 130 Q155 110 160 90 Q164 70 166 50" strokeLinecap="round"/>
            {/* Top fronds */}
            <path d="M100 200 Q90 190 85 175 Q80 160 78 145" strokeLinecap="round"/>
            <path d="M100 200 Q110 190 115 175 Q120 160 122 145" strokeLinecap="round"/>
          </svg>
          
          {/* Center background palm tree (smaller, more subtle) */}
          <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-72 text-amber-200" viewBox="0 0 150 220" fill="none" stroke="currentColor" strokeWidth="2">
            {/* Trunk */}
            <line x1="75" y1="220" x2="75" y2="150" strokeLinecap="round"/>
            {/* Fronds */}
            <path d="M75 150 Q55 135 40 110 Q28 90 20 70 Q14 55 12 40 Q10 25 9 15" strokeLinecap="round"/>
            <path d="M75 150 Q60 140 50 120 Q42 105 36 85 Q31 70 28 55 Q26 40 25 30" strokeLinecap="round"/>
            <path d="M75 150 Q95 135 110 110 Q122 90 130 70 Q136 55 138 40 Q140 25 141 15" strokeLinecap="round"/>
            <path d="M75 150 Q90 140 100 120 Q108 105 114 85 Q119 70 122 55 Q124 40 125 30" strokeLinecap="round"/>
            <path d="M75 150 Q70 145 68 130 Q66 115 65 100" strokeLinecap="round"/>
            <path d="M75 150 Q80 145 82 130 Q84 115 85 100" strokeLinecap="round"/>
          </svg>
        </div>
        
        <div className="max-w-6xl mx-auto relative z-10">
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

      {/* Latest from Dank N' Devour Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-12 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-lake-blue-900 mb-8 sm:mb-12 text-center sm:text-left"
          >
            Latest from Dank N&apos; Devour
          </motion.h2>

          {videosLoading && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {[0, 1, 2].map((i) => (
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
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {videos.slice(0, 3).map((video, index) => (
                <motion.a
                  key={video.id}
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.6, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition border border-lake-blue-100 group"
                >
                  <div className="h-48 sm:h-64 bg-gray-200 overflow-hidden">
                    {video.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <motion.img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        whileHover={{ scale: 1.1 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="w-full h-full object-cover"
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
                    <motion.button
                      whileHover={{ x: 4 }}
                      className="text-lake-blue-700 font-semibold hover:text-lake-blue-800 text-sm sm:text-base py-2 min-h-[44px]"
                    >
                      Watch Now →
                    </motion.button>
                  </div>
                </motion.a>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-12 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-lake-blue-900 mb-8 sm:mb-12"
          >
            Simple Pricing
          </motion.h2>
          <div className="grid sm:grid-cols-2 gap-6 sm:gap-8">
            {[
              { plan: 'Monthly', price: '$4.20', period: 'per month', featured: false },
              { plan: 'Yearly', price: '$42', period: 'per year (Save $8.40)', featured: true },
            ].map((pricing, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.6, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -8, scale: 1.02 }}
                className={`bg-white p-6 sm:p-8 rounded-xl shadow-lg ${
                  pricing.featured ? 'border-2 border-lake-blue-700' : 'border border-lake-blue-100'
                } hover:shadow-xl transition`}
              >
                <h3 className="text-xl sm:text-2xl font-bold mb-4 text-lake-blue-900">{pricing.plan}</h3>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
                  className="text-3xl sm:text-4xl font-bold text-lake-blue-700 mb-4"
                >
                  {pricing.price}
                </motion.div>
                <p className="text-sm sm:text-base text-gray-700 mb-6">{pricing.period}</p>
                <motion.button
                  onClick={() => setShowPlanModal(true)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-lake-blue-700 text-white py-3 rounded-lg font-semibold hover:bg-lake-blue-800 transition shadow-lg min-h-[48px]"
                >
                  Get Started
                </motion.button>
              </motion.div>
            ))}
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
