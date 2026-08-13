import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function DispensariesIndexPage() {
  const { data } = await supabaseAdmin
    .from('dispensaries')
    .select('id, name, slug, city, state, verified, active')
    .eq('active', true)
    .order('name')
    .limit(200)

  const shops = data || []

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-5xl uppercase text-cream">Dispensaries</h1>
      <p className="mt-3 text-cream/70">Shops with profiles on Daily Dispo Deals. Claim yours and submit today&apos;s special.</p>
      <ul className="mt-8 divide-y divide-cream/10 border-[3px] border-cream/15">
        {shops.map((shop) => (
          <li key={shop.id}>
            <Link href={`/dispensary/${shop.slug || shop.id}`} className="flex items-center justify-between px-4 py-4 hover:bg-ink-2">
              <span className="font-display uppercase text-cream">{shop.name}</span>
              <span className="text-sm text-cream/50">
                {shop.city}
                {shop.verified ? ' · Verified' : ''}
              </span>
            </Link>
          </li>
        ))}
        {!shops.length && <li className="p-6 text-cream/50">No dispensary profiles yet.</li>}
      </ul>
    </div>
  )
}
