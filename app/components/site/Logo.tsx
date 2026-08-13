import Link from 'next/link'

export function Logo({
  compact = false,
  href = '/',
}: {
  compact?: boolean
  href?: string
}) {
  const mark = (
    <div className="leading-none">
      <div
        className={`font-display uppercase tracking-tight text-cream ${
          compact ? 'text-[15px] leading-[0.9]' : 'text-2xl sm:text-3xl leading-[0.85]'
        }`}
      >
        <div>Daily</div>
        <div>Dispo</div>
        <div>Deals</div>
      </div>
      <p className={`font-marker text-mint ${compact ? 'text-[10px] mt-1' : 'text-sm mt-1.5'}`}>
        Today&apos;s Best. Every Day.
      </p>
    </div>
  )

  if (!href) return mark
  return (
    <Link href={href} className="block" aria-label="Daily Dispo Deals home">
      {mark}
    </Link>
  )
}
