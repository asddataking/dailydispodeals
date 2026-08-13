'use client'

import { useState } from 'react'

interface FAQItem {
  question: string
  answer: string
}

const faqs: FAQItem[] = [
  {
    question: 'How does Daily Dispo Deals work?',
    answer:
      'Dispensaries submit their own active deals. We review dates and links, then publish them so cannabis shoppers can find current specials without opening ten menus. Browsing is free.',
  },
  {
    question: 'Do you scan every dispensary menu?',
    answer:
      'No. We do not claim to automatically scan every dispensary menu. Listings come from dispensary submissions and optional featured placements.',
  },
  {
    question: 'How is this different from Weedmaps?',
    answer:
      'We are not a full menu, ordering, or delivery app. Daily Dispo Deals answers one question: what is on deal near you today?',
  },
  {
    question: 'What areas do you cover?',
    answer:
      'We start with Michigan — Detroit, Ann Arbor, Port Huron, Grand Rapids, Lansing, Flint and other curated city pages. Shoppers can also browse statewide deals.',
  },
  {
    question: 'Does it cost anything for shoppers?',
    answer: 'No. Finding deals is 100% free. The optional email list is also free. There is no consumer subscription required.',
  },
  {
    question: 'How do dispensaries submit a deal?',
    answer:
      'Use Submit a Deal. Enter the promotion manually or upload a flyer. No account is required for the first submission. Standard listings are free.',
  },
  {
    question: 'Do deals expire?',
    answer:
      'Yes. Every deal needs an end date. Expired promotions are removed from active listings. Old pages may remain with a clear “this deal has ended” message.',
  },
  {
    question: 'What do the badges mean?',
    answer:
      'Featured or Sponsored means paid placement. Verified Dispensary means the shop has confirmed its profile. Submitted by Dispensary means the business sent the promotion.',
  },
]

export function FAQ({ items = faqs }: { items?: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className="px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-8 text-center font-display text-4xl uppercase text-cream sm:text-5xl">FAQ</h2>
        <div className="space-y-3">
          {items.map((faq, index) => (
            <div key={faq.question} className="panel overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="flex w-full items-center justify-between px-5 py-4 text-left"
                aria-expanded={openIndex === index}
              >
                <span className="pr-4 font-display text-lg uppercase text-cream">{faq.question}</span>
                <svg
                  className={`h-5 w-5 flex-shrink-0 text-mint transition-transform ${openIndex === index ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openIndex === index && <p className="px-5 pb-5 text-cream/75">{faq.answer}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
