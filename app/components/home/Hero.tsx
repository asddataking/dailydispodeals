import Image from 'next/image'
import { LocationSearch } from './LocationSearch'

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b-[3px] border-cream/15">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:py-16">
        <div>
          <p className="section-kicker">No hunting.</p>
          <h1 className="mt-2 font-display text-5xl uppercase leading-[0.85] text-cream sm:text-7xl">
            The Best
            <br />
            Dispensary Deals.
            <br />
            Every Day.
          </h1>
          <p className="mt-5 max-w-md text-lg text-cream/75">
            Find today&apos;s cannabis deals near you without digging through dispensary menus.
          </p>
          <div className="mt-8">
            <LocationSearch />
          </div>
        </div>
        <div className="relative">
          <div className="relative aspect-[4/3] overflow-hidden border-[3px] border-mint shadow-sticker">
            <Image
              src="/hero-city.png"
              alt="Original illustrated Michigan cannabis city night scene"
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/50 to-transparent" />
          </div>
          <div className="absolute -bottom-4 -left-2 rotate-[-6deg] border-[3px] border-ink bg-mint px-4 py-2 shadow-sticker-coral sm:-left-6">
            <p className="font-marker text-2xl leading-none text-ink sm:text-3xl">FIND FIRE.</p>
            <p className="font-marker text-2xl leading-none text-ink sm:text-3xl">SAVE GREEN.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
