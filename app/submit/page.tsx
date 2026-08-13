import { SubmitDealForm } from '@/app/components/submit/SubmitDealForm'

export const metadata = {
  title: 'Submit a Deal | Daily Dispo Deals',
  description: 'Submit today’s dispensary promotion for free. Manual entry or flyer upload. No account required.',
}

export default function SubmitPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="section-kicker">Free to list</p>
      <h1 className="font-display text-5xl uppercase leading-none text-cream">Submit a Deal</h1>
      <p className="mt-3 text-cream/70">
        About one minute. We review dates and links, then it goes live on city, category and Today&apos;s Deals pages.
      </p>
      <div className="mt-8">
        <SubmitDealForm />
      </div>
    </div>
  )
}
