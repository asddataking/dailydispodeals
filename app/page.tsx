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
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-b from-lake-blue-900 via-lake-blue-800 to-lake-blue-700 text-white">
        <div className="absolute inset-0 bg-[url('/lake-bg.jpg')] bg-cover bg-center opacity-20"></div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Daily cannabis deals. Zero searching.
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-gray-200">
            Tell us what you buy. We email you the best deals every day.
          </p>
          <form onSubmit={handleGetDeals} className="max-w-md mx-auto flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="flex-1 px-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-white"
            />
            <button
              type="submit"
              className="bg-white text-lake-blue-900 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              Get My Deals
            </button>
          </form>
          <p className="text-sm text-gray-300 mt-4">
            No spam - Cancel anytime
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-lake-blue-900 text-center mb-12">
            How it works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="w-12 h-12 bg-lake-blue-700 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold text-lake-blue-900 mb-2">
                Set Your Preferences
              </h3>
              <p className="text-gray-600">
                Pick your products, brands, and how far you want to travel.
              </p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="w-12 h-12 bg-lake-blue-700 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold text-lake-blue-900 mb-2">
                We Scan the Deals
              </h3>
              <p className="text-gray-600">
                Our system checks the latest dispensary deals every day.
              </p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="w-12 h-12 bg-lake-blue-700 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold text-lake-blue-900 mb-2">
                Get Top Picks Daily
              </h3>
              <p className="text-gray-600">
                We email you the best local deals, personalized just for you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-lake-blue-900 mb-8">
            Simple Pricing
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <h3 className="text-2xl font-bold mb-4">Monthly</h3>
              <div className="text-4xl font-bold text-lake-blue-700 mb-4">$4.20</div>
              <p className="text-gray-600 mb-6">per month</p>
              <button
                onClick={() => {
                  setShowPlanModal(true)
                }}
                className="w-full bg-lake-blue-700 text-white py-3 rounded-lg font-semibold hover:bg-lake-blue-800"
              >
                Get Started
              </button>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-lg border-2 border-lake-blue-700">
              <h3 className="text-2xl font-bold mb-4">Yearly</h3>
              <div className="text-4xl font-bold text-lake-blue-700 mb-4">$42</div>
              <p className="text-gray-600 mb-6">per year (Save $8.40)</p>
              <button
                onClick={() => {
                  setShowPlanModal(true)
                }}
                className="w-full bg-lake-blue-700 text-white py-3 rounded-lg font-semibold hover:bg-lake-blue-800"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Latest from Dank N' Devour */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-lake-blue-900 mb-12">
            Latest from Dank N&apos; Devour
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-50 rounded-lg overflow-hidden">
              <div className="h-48 bg-gray-200"></div>
              <div className="p-6">
                <div className="text-sm text-gray-500 mb-2">CHRONIC COOKING</div>
                <h3 className="text-xl font-semibold mb-2">Teriyaki Cannabis Wings</h3>
                <p className="text-gray-600 text-sm mb-4">
                  How to make sticky, savory, cannabis-infused teriyaki chicken wings.
                </p>
                <a href="#" className="text-lake-blue-700 font-semibold">Watch Now →</a>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg overflow-hidden">
              <div className="h-48 bg-gray-200"></div>
              <div className="p-6">
                <div className="text-sm text-gray-500 mb-2">STRAIN REVIEWS</div>
                <h3 className="text-xl font-semibold mb-2">The Highest Gummies Ever?</h3>
                <p className="text-gray-600 text-sm mb-4">
                  We review and test the most potent looking gummies.
                </p>
                <a href="#" className="text-lake-blue-700 font-semibold">Watch Now →</a>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg overflow-hidden">
              <div className="h-48 bg-gray-200"></div>
              <div className="p-6">
                <div className="text-sm text-gray-500 mb-2">AFFILIATE DEAL</div>
                <h3 className="text-xl font-semibold mb-2">20% Off Arizer XQ2 Vaporizers!</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Use code DANK20 at checkout for 20% off the best dry herb vaporizer.
                </p>
                <a href="#" className="text-lake-blue-700 font-semibold">Shop Now →</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-lake-blue-900 text-white py-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
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
