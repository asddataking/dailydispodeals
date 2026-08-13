'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from './Logo'

const COLUMNS = [
  {
    title: 'Browse',
    links: [
      { href: '/deals', label: 'Deals' },
      { href: '/michigan', label: 'Cities' },
      { href: '/deals/flower', label: 'Categories' },
      { href: '/dispensaries', label: 'Dispensaries' },
      { href: '/brands', label: 'Brands' },
      { href: '/gear', label: 'Stash Essentials' },
    ],
  },
  {
    title: 'Dispensaries',
    links: [
      { href: '/submit', label: 'Submit a Deal' },
      { href: '/for-dispensaries', label: 'For Dispensaries' },
      { href: '/advertise', label: 'Advertise' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '/contact', label: 'Contact' },
      { href: '/terms', label: 'Terms' },
      { href: '/privacy', label: 'Privacy' },
      { href: '/affiliate-disclosure', label: 'Affiliate Disclosure' },
    ],
  },
]

export function Footer() {
  const pathname = usePathname()
  if (pathname?.startsWith('/admin')) return null

  return (
    <footer className="mt-16 border-t-[3px] border-cream/15 bg-ink-2 pb-24 md:pb-10">
      <div className="halftone mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-cream/70">
            Today&apos;s best dispo deals. No hunting. Michigan cannabis specials submitted by dispensaries, free for shoppers.
          </p>
          <div className="mt-5 flex gap-3 font-display text-xs uppercase tracking-widest text-mint">
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-cream">
              Instagram
            </a>
            <a href="https://facebook.com" target="_blank" rel="noreferrer" className="hover:text-cream">
              Facebook
            </a>
            <a href="https://tiktok.com" target="_blank" rel="noreferrer" className="hover:text-cream">
              TikTok
            </a>
          </div>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h3 className="font-display text-sm uppercase tracking-widest text-gold">{col.title}</h3>
            <ul className="mt-4 space-y-2">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-cream/75 hover:text-mint">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-cream/10 px-4 py-4 text-center text-xs text-cream/50">
        21+ only. Consume responsibly. Some links may be affiliate links.
      </div>
    </footer>
  )
}
