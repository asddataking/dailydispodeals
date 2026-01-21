'use client'

import { useState } from 'react'

interface FAQItem {
  question: string
  answer: string
}

const faqs: FAQItem[] = [
  {
    question: 'How does Daily Dispo Deals work?',
    answer: 'We scan dispensaries across Michigan every day to find the best deals. You tell us what products and brands you like, and we email you personalized deals every morning. No searching required.',
  },
  {
    question: 'How is this different from Weedmaps?',
    answer: 'While Weedmaps shows current deals, we find the BEST deals across multiple dispensaries and deliver them directly to your inbox. We also personalize deals based on your preferences, so you only see what you actually want to buy.',
  },
  {
    question: 'What areas do you cover?',
    answer: 'We cover dispensaries across Michigan, including Detroit, Grand Rapids, Ann Arbor, Lansing, and many more cities. We find deals near you based on your zip code preferences.',
  },
  {
    question: 'How much does it cost?',
    answer: 'Just $4.20/month or $42/year. That\'s less than a cup of coffee per month for personalized daily deals delivered to your inbox.',
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Yes! You can cancel your subscription at any time. No questions asked, no commitments.',
  },
  {
    question: 'What types of deals do you send?',
    answer: 'We send deals on flower, vapes, edibles, concentrates, pre-rolls, drinks, topicals, CBD/THCA products, and accessories. You choose which categories you want to see.',
  },
  {
    question: 'How often do I get deals?',
    answer: 'You\'ll receive a personalized email every morning with the best deals matching your preferences. We only send deals when we find great prices, so you won\'t get spam.',
  },
  {
    question: 'Do you work with all dispensaries?',
    answer: 'We monitor deals from dispensaries across Michigan. Our system automatically discovers new dispensaries and tracks their deals daily to bring you the best prices.',
  },
]

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-12 bg-white">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-lake-blue-900 text-center mb-8 sm:mb-12">
          Frequently Asked Questions
        </h2>
        <div className="space-y-3 sm:space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border border-lake-blue-200 rounded-lg overflow-hidden bg-white hover:shadow-md transition"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-4 sm:px-6 py-4 sm:py-5 text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-lake-blue-500 rounded-lg min-h-[60px]"
                aria-expanded={openIndex === index}
              >
                <span className="text-base sm:text-lg font-semibold text-lake-blue-900 pr-4 flex-1">
                  {faq.question}
                </span>
                <svg
                  className={`w-5 h-5 text-lake-blue-700 flex-shrink-0 transition-transform ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openIndex === index && (
                <div className="px-4 sm:px-6 pb-4 sm:pb-5">
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
