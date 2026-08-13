const BLOCKS = [
  {
    title: 'Free to List',
    body: 'Submitting standard deals costs nothing.',
  },
  {
    title: 'Local Shoppers',
    body: 'Reach people specifically searching for cannabis deals in your market.',
  },
  {
    title: 'Direct Traffic',
    body: 'Clicks go to your own menu or website.',
  },
  {
    title: 'Easy',
    body: 'Post manually or upload the promotional graphic you’re already using on social media.',
  },
]

export function WhySubmit() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <h2 className="font-display text-4xl uppercase text-cream sm:text-5xl">Why Submit?</h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {BLOCKS.map((block) => (
          <div key={block.title} className="border-[3px] border-gold bg-ink-3 p-6">
            <div className="mb-4 h-10 w-10 rotate-3 border-[3px] border-mint bg-mint" />
            <h3 className="font-display text-2xl uppercase text-cream">{block.title}</h3>
            <p className="mt-2 text-sm text-cream/70">{block.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
