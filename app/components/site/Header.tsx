'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from './Logo'

const NAV = [
  { href: '/deals', label: 'Deals' },
  { href: '/michigan', label: 'Cities' },
  { href: '/deals/flower', label: 'Categories' },
  { href: '/dispensaries', label: 'Dispensaries' },
  { href: '/brands', label: 'Brands' },
  { href: '/for-dispensaries', label: 'For Dispensaries' },
]

export function Header() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  if (pathname?.startsWith('/admin')) return null

  return (
    <header className="sticky top-0 z-40 border-b-[3px] border-cream/15 bg-ink/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Logo compact />
        <nav className="hidden items-center gap-5 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="font-display text-sm uppercase tracking-wide text-cream/80 transition hover:text-mint"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/submit" className="btn-primary !px-4 !py-2 !text-sm shadow-sticker">
            Submit a Deal
          </Link>
          <button
            type="button"
            className="border-[2.5px] border-cream/30 p-2 text-cream lg:hidden"
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t-[3px] border-cream/15 bg-ink-2 px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-3">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="font-display text-lg uppercase tracking-wide text-cream"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}
