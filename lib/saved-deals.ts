const KEY = 'ddd-saved-deals'

export function getSavedIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export function isSaved(id: string): boolean {
  return getSavedIds().includes(id)
}

export function toggleSaved(id: string): boolean {
  const current = getSavedIds()
  const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
  localStorage.setItem(KEY, JSON.stringify(next))
  window.dispatchEvent(new Event('ddd-saved-change'))
  return next.includes(id)
}
