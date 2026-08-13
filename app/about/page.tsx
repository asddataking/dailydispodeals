import { FAQ } from '@/app/components/FAQ'

export const metadata = {
  title: 'About | Daily Dispo Deals',
  description: "Today's best dispo deals. No hunting. A simple Michigan destination for current dispensary specials.",
}

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-5xl uppercase text-cream">About</h1>
      <div className="mt-6 space-y-4 text-cream/80">
        <p>
          Daily Dispo Deals is a simple destination where cannabis shoppers can find current local dispensary specials
          without opening ten different menus.
        </p>
        <p>
          Dispensaries submit their own active deals directly. Shoppers browse those deals for free. We monetize through
          optional featured placements, dispensary and brand advertising, sponsorships, and cannabis-adjacent affiliate
          products — not a paid consumer subscription.
        </p>
        <p>
          We are not trying to become Weedmaps. No full menus, no ordering, no delivery. One question: what&apos;s on deal
          near me today?
        </p>
      </div>
      <FAQ />
    </div>
  )
}
