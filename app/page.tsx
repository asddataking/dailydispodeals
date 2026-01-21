'use client'

import { useState } from 'react'
import { PlanSelectionModal } from './components/PlanSelectionModal'

export default function Home() {
  const [email, setEmail] = useState('')
  const [showPlanModal, setShowPlanModal] = useState(false)

  const handleGetDeals = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      setShowPlanModal(true)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Lake Background */}
      <section className="relative min-h-screen flex items-center px-6 md:px-12 py-20">
        {/* Lake background only in hero */}
        <div className="absolute inset-0 bg-[url('/lake-bg.jpg')] bg-cover bg-center bg-no-repeat opacity-100"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-white"></div>

        {/* Header */}
        <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 md:px-12 py-6">
          <div className="flex items-center gap-2">
            {/* Logo placeholder - you'll need to add the actual logo image */}
            <div className="w-8 h-8 bg-white rounded flex items-center justify-center shadow-sm">
              <span className="text-green-600 text-xl">🍃</span>
            </div>
            <span className="text-white font-bold text-xl drop-shadow-lg">DAILY DISPO DEALS</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-white drop-shadow-md">
            <a href="#how-it-works" className="hover:text-gray-200 transition">How it works</a>
            <a href="#pricing" className="hover:text-gray-200 transition">Pricing</a>
            <a href="#info" className="hover:text-gray-200 transition">Info</a>
          </nav>
          <button
            onClick={() => setShowPlanModal(true)}
            className="bg-lake-blue-700 text-white px-6 py-2 rounded-lg font-semibold hover:bg-lake-blue-800 transition shadow-lg"
          >
            Get Deals
          </button>
        </header>

        <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-8 lg:gap-12 items-start relative z-10 pt-20">
          {/* Hero Content - Left Side */}
          <div className="pt-12 lg:pt-20">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 text-lake-blue-900 leading-tight drop-shadow-sm">
              Daily cannabis deals. Zero searching.
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-lake-blue-900 leading-relaxed drop-shadow-sm">
              Tell us what you buy. We email you the best deals every day.
            </p>
            <form onSubmit={handleGetDeals} className="max-w-lg mb-4">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="flex-1 px-4 py-3 rounded-lg text-gray-900 bg-white/95 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-lake-blue-500 shadow-lg"
                />
                <button
                  type="submit"
                  className="bg-lake-blue-700 text-white px-8 py-3 rounded-lg font-semibold hover:bg-lake-blue-800 transition whitespace-nowrap shadow-lg"
                >
                  Get My Deals
                </button>
              </div>
            </form>
            <p className="text-sm text-lake-blue-800 drop-shadow-sm">
              No spam - Cancel anytime
            </p>
          </div>

          {/* Today's Picks - Right Side */}
          <div className="lg:pt-12">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-2xl border border-white/20">
              <h2 className="text-2xl font-bold text-lake-blue-900 mb-4">Today&apos;s Picks</h2>
              <div className="flex gap-2 mb-4 text-sm flex-wrap">
                <button className="px-3 py-1 bg-lake-blue-100 text-lake-blue-900 rounded-full font-medium">Flower Deals</button>
                <button className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-full">Vape Cart</button>
                <button className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-full">Specials</button>
              </div>
              
              {/* Deal Cards */}
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition bg-white/50">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-lake-blue-900 mb-1">Greenhouse Lapeer</h3>
                      <p className="text-lg font-semibold text-gray-900 mb-1">3/$60 Exotic Eighths</p>
                      <p className="text-sm text-gray-600">Sherbiato, Lemonatit, Gelonade - mix & match.</p>
                    </div>
                    <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0">
                      {/* Dispensary image placeholder */}
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition bg-white/50">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-lake-blue-900 mb-1">Gage Ferndale</h3>
                      <p className="text-lg font-semibold text-gray-900 mb-1">2/$60 Live Resin Carts 2g</p>
                      <p className="text-sm text-gray-600">ST/8Z, Element, GLTino - mix & match.</p>
                    </div>
                    <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0">
                      {/* Product image placeholder */}
                    </div>
                  </div>
                </div>
              </div>

              <a href="#" className="block text-center text-lake-blue-700 font-semibold mt-4 hover:text-lake-blue-800">
                View All Deals →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section - Clean with lake colors */}
      <section id="how-it-works" className="py-20 px-6 md:px-12 bg-gradient-to-b from-white to-lake-blue-50/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-lake-blue-900 text-center mb-12">
            How it works
          </h2>
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-lg border border-lake-blue-100 hover:shadow-xl transition">
              <div className="w-12 h-12 bg-lake-blue-700 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold text-lake-blue-900 mb-2">
                Set Your Preferences
              </h3>
              <p className="text-gray-700">
                Pick your products, brands, and how far you want to travel.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg border border-lake-blue-100 hover:shadow-xl transition">
              <div className="w-12 h-12 bg-lake-blue-700 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold text-lake-blue-900 mb-2">
                We Scan the Deals
              </h3>
              <p className="text-gray-700">
                Our system checks the latest dispensary deals every day.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg border border-lake-blue-100 hover:shadow-xl transition">
              <div className="w-12 h-12 bg-lake-blue-700 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold text-lake-blue-900 mb-2">
                Get Top Picks Daily
              </h3>
              <p className="text-gray-700">
                We email you the best local deals, personalized just for you.
              </p>
            </div>
          </div>
          <div className="text-center">
            <a href="#pricing" className="inline-block bg-lake-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-lake-blue-800 transition shadow-lg">
              See how it works →
            </a>
          </div>
        </div>
      </section>

      {/* Latest from Dank N' Devour Section */}
      <section className="py-20 px-6 md:px-12 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-lake-blue-900 mb-12">
            Latest from Dank N&apos; Devour
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition border border-lake-blue-100">
              <div className="h-64 bg-gradient-to-br from-lake-blue-100 to-lake-blue-200 relative">
                {/* Image placeholder for Teriyaki Wings */}
                <div className="absolute inset-0 flex items-center justify-center text-lake-blue-700">
                  Image: Teriyaki Cannabis Wings
                </div>
              </div>
              <div className="p-6">
                <div className="text-sm text-gray-500 mb-2 font-medium">CHRONIC COOKING</div>
                <h3 className="text-xl font-semibold mb-2 text-lake-blue-900">Teriyaki Cannabis Wings</h3>
                <p className="text-gray-700 text-sm mb-4">
                  How i&apos;a makes sticky, savory, cannabis infused teriyaki chicken wings.
                </p>
                <button className="text-lake-blue-700 font-semibold hover:text-lake-blue-800">
                  Watch Now →
                </button>
              </div>
            </div>
            <div className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition border border-lake-blue-100">
              <div className="h-64 bg-gradient-to-br from-lake-blue-100 to-lake-blue-200 relative">
                {/* Image placeholder for Gummies */}
                <div className="absolute inset-0 flex items-center justify-center text-lake-blue-700">
                  Image: The Highest Gummies Ever?
                </div>
              </div>
              <div className="p-6">
                <div className="text-sm text-gray-500 mb-2 font-medium">STRAIN REVIEWS</div>
                <h3 className="text-xl font-semibold mb-2 text-lake-blue-900">The Highest Gummies Ever?</h3>
                <p className="text-gray-700 text-sm mb-4">
                  We review and test the most potent looking gummies.
                </p>
                <button className="text-lake-blue-700 font-semibold hover:text-lake-blue-800">
                  Watch Now →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Affiliate Deal Section */}
      <section className="py-20 px-6 md:px-12 bg-gradient-to-b from-white to-lake-blue-50/30">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-xl p-8 md:p-12 shadow-xl border border-lake-blue-100">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="text-sm text-gray-500 mb-2 font-medium">AFFILIATE DEAL</div>
                <h2 className="text-3xl md:text-4xl font-bold text-lake-blue-900 mb-4">
                  20% Off Arizer XQ2 Vaporizers!
                </h2>
                <p className="text-gray-700 mb-6">
                  Use code DANK20 at checkout for 20% off the best dry herb vaporizer.
                </p>
                <button className="bg-lake-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-lake-blue-800 transition shadow-lg">
                  Shop Now →
                </button>
              </div>
              <div className="h-64 bg-gradient-to-br from-lake-blue-100 to-lake-blue-200 rounded-lg flex items-center justify-center">
                {/* Image placeholder for Vaporizer */}
                <div className="text-lake-blue-700">Image: Arizer XQ2 Vaporizer</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6 md:px-12 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-lake-blue-900 mb-12">
            Simple Pricing
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-lg border border-lake-blue-100 hover:shadow-xl transition">
              <h3 className="text-2xl font-bold mb-4 text-lake-blue-900">Monthly</h3>
              <div className="text-4xl font-bold text-lake-blue-700 mb-4">$4.20</div>
              <p className="text-gray-700 mb-6">per month</p>
              <button
                onClick={() => setShowPlanModal(true)}
                className="w-full bg-lake-blue-700 text-white py-3 rounded-lg font-semibold hover:bg-lake-blue-800 transition shadow-lg"
              >
                Get Started
              </button>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-lg border-2 border-lake-blue-700 hover:shadow-xl transition">
              <h3 className="text-2xl font-bold mb-4 text-lake-blue-900">Yearly</h3>
              <div className="text-4xl font-bold text-lake-blue-700 mb-4">$42</div>
              <p className="text-gray-700 mb-6">per year (Save $8.40)</p>
              <button
                onClick={() => setShowPlanModal(true)}
                className="w-full bg-lake-blue-700 text-white py-3 rounded-lg font-semibold hover:bg-lake-blue-800 transition shadow-lg"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-b from-lake-blue-900 to-lake-blue-950 text-white py-12 px-6 md:px-12">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-gray-300">
            © 2024 Daily Dispo Deals. All rights reserved.
          </p>
        </div>
      </footer>

      <PlanSelectionModal
        open={showPlanModal}
        onOpenChange={setShowPlanModal}
        initialEmail={email}
      />
    </div>
  )
}
