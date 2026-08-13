'use client'

import { useEffect, useState } from 'react'
import { isSaved, toggleSaved } from '@/lib/saved-deals'

export function SaveDealButton({ dealId }: { dealId: string }) {
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setSaved(isSaved(dealId))
  }, [dealId])

  return (
    <button
      type="button"
      aria-label={saved ? 'Unsave deal' : 'Save deal'}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setSaved(toggleSaved(dealId))
      }}
      className="absolute right-2 top-2 min-h-[36px] min-w-[36px] border-[2px] border-cream bg-ink/80 px-2 font-display text-xs text-cream"
    >
      {saved ? 'SAVED' : 'SAVE'}
    </button>
  )
}
