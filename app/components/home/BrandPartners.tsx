import Link from 'next/link'

export function BrandPartners() {
  return (
    <section className="border-y-[3px] border-cream/10 bg-teal-deep py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="font-display text-4xl uppercase text-cream sm:text-5xl">For Cannabis Brands</h2>
        <p className="mt-3 max-w-2xl text-cream/75">
          Brands can promote statewide or regional campaigns — Wojo Wednesday, weekend drops, 25% off across Michigan.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {['Featured brand', 'Sponsored promotion', 'Brand deal page', 'Regional campaign', 'Drop announcement', 'Newsletter sponsorship'].map(
            (item) => (
              <span key={item} className="sticker">
                {item}
              </span>
            )
          )}
        </div>
        <Link href="/advertise#brands" className="btn-primary mt-8">
          Partner with Daily Dispo Deals →
        </Link>
      </div>
    </section>
  )
}
