import { ContactForm } from '@/app/components/site/ContactForm'

export const metadata = {
  title: 'Contact | Daily Dispo Deals',
  description: 'Contact Daily Dispo Deals for submissions, advertising, or support.',
}

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-5xl uppercase text-cream">Contact</h1>
      <p className="mt-3 text-cream/70">Shops, brands, press, problems. We read it.</p>
      <ContactForm />
    </div>
  )
}
