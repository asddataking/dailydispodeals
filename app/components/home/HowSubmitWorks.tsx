import Link from 'next/link'

const STEPS = [
  {
    n: '01',
    title: 'Submit Your Deal',
    body: 'Enter it manually or upload the flyer you already posted. You review anything we extract before it goes live.',
  },
  {
    n: '02',
    title: 'We Review It',
    body: 'We check basic formatting, expiration dates and links. Clean submissions get approved in minutes.',
  },
  {
    n: '03',
    title: 'It Goes Live',
    body: 'The promotion appears on city pages, category pages, your dispensary profile, brand pages and Today’s Deals.',
  },
  {
    n: '04',
    title: 'Customers Click Through',
    body: 'Every deal sends shoppers directly back to your menu or website. We never take the sale.',
  },
]

export function HowSubmitWorks() {
  return (
    <section className="border-y-[3px] border-cream/10 bg-ink-2 py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <p className="section-kicker">Got a deal?</p>
        <h2 className="mt-2 max-w-3xl font-display text-4xl uppercase leading-[0.9] text-cream sm:text-6xl">
          Put it in front of people looking for one.
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <div key={step.n} className="panel p-5">
              <p className="font-display text-4xl text-mint">{step.n}</p>
              <h3 className="mt-3 font-display text-xl uppercase text-cream">{step.title}</h3>
              <p className="mt-2 text-sm text-cream/70">{step.body}</p>
            </div>
          ))}
        </div>
        <Link href="/submit" className="btn-primary mt-8">
          Submit Today&apos;s Deal →
        </Link>
      </div>
    </section>
  )
}
