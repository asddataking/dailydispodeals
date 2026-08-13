import Link from 'next/link'

export function AudienceSplit() {
  return (
    <section className="mx-auto grid max-w-7xl gap-0 px-4 py-12 sm:px-6 lg:grid-cols-2">
      <div className="border-[3px] border-mint bg-teal-deep p-8 sm:p-10">
        <p className="font-marker text-mint">For shoppers</p>
        <h2 className="mt-2 font-display text-4xl uppercase leading-none text-cream">Find Deals</h2>
        <ul className="mt-8 space-y-6">
          <li>
            <h3 className="font-display text-xl uppercase text-gold">Find Deals</h3>
            <p className="text-cream/80">Search today&apos;s active cannabis promotions nearby.</p>
          </li>
          <li>
            <h3 className="font-display text-xl uppercase text-gold">Compare</h3>
            <p className="text-cream/80">Quickly see what different dispensaries are offering.</p>
          </li>
          <li>
            <h3 className="font-display text-xl uppercase text-gold">Save Money</h3>
            <p className="text-cream/80">Click directly through to the dispensary&apos;s menu or website.</p>
          </li>
        </ul>
        <Link href="/deals" className="btn-primary mt-8">
          Browse Deals
        </Link>
        <p className="mt-3 font-marker text-mint">100% free for shoppers.</p>
      </div>
      <div className="border-[3px] border-coral bg-ink-2 p-8 sm:p-10">
        <p className="font-marker text-coral">For dispensaries</p>
        <h2 className="mt-2 font-display text-4xl uppercase leading-none text-cream">Get Seen</h2>
        <ul className="mt-8 space-y-6">
          <li>
            <h3 className="font-display text-xl uppercase text-gold">Submit Your Deal</h3>
            <p className="text-cream/80">Send us today&apos;s or this week&apos;s promotion.</p>
          </li>
          <li>
            <h3 className="font-display text-xl uppercase text-gold">Get Seen</h3>
            <p className="text-cream/80">Reach cannabis shoppers actively looking for specials.</p>
          </li>
          <li>
            <h3 className="font-display text-xl uppercase text-gold">Drive Traffic</h3>
            <p className="text-cream/80">Every deal links directly back to your menu or website.</p>
          </li>
        </ul>
        <Link href="/submit" className="btn-coral mt-8">
          Submit a Deal — Free
        </Link>
        <p className="mt-3 text-sm text-cream/70">
          No contracts. No commission. No account required to submit your first deal.
        </p>
      </div>
    </section>
  )
}
