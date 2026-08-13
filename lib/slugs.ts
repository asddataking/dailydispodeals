export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function uniqueSlug(base: string, existing: string[]): string {
  const root = slugify(base) || 'deal'
  if (!existing.includes(root)) return root
  let i = 2
  while (existing.includes(`${root}-${i}`)) i += 1
  return `${root}-${i}`
}
