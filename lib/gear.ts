export const GEAR_CATEGORIES = [
  {
    slug: 'storage',
    headline: 'Keep It Fresh',
    name: 'Storage',
    description: 'Humidity-control products and storage that actually protect flower.',
  },
  {
    slug: 'grinders',
    headline: 'Grind It',
    name: 'Grinders',
    description: 'Grinders and preparation accessories worth buying once.',
  },
  {
    slug: 'humidity-control',
    headline: 'Keep It Fresh',
    name: 'Humidity Control',
    description: 'Two-way humidity packs for jars, not gimmicks.',
  },
  {
    slug: 'smell-proof-storage',
    headline: 'Stash It',
    name: 'Smell-Proof Storage',
    description: 'Smell-resistant bags, jars and cases for everyday carry.',
  },
  {
    slug: 'cleaning',
    headline: 'Keep It Clean',
    name: 'Cleaning',
    description: 'Glass and accessory cleaning products that cut resin.',
  },
  {
    slug: 'grow',
    headline: 'Grow Gear',
    name: 'Grow Gear',
    description: 'Lighting, environment and accessories where it makes sense.',
  },
] as const

export const GEAR_ARTICLES = [
  {
    slug: 'best-ways-to-keep-weed-fresh',
    title: 'Best Ways to Keep Weed Fresh',
    description: 'How to store flower so it does not dry out, get harsh, or lose terpenes in a Michigan apartment.',
    related: 'humidity-control',
    body: [
      'Fresh flower is a humidity problem more than a “secret strain” problem. Too dry and it burns hot. Too wet and you risk mold. The useful range for most cured cannabis is roughly 55–62% relative humidity.',
      'Use an airtight glass jar, not a leftover plastic bag from the dispensary. Bags are fine for the ride home. They are not storage. Fill the jar most of the way so there is less empty air, then add a two-way humidity pack sized for the jar.',
      'Keep the jar in a dark cabinet, not on a sunny windowsill and not in a hot car. Light and heat wreck terpenes faster than skipping a humidity pack. Do not refrigerate flower unless you know what you are doing with sealed, stable humidity — condensation is worse than a slightly warm cupboard.',
      'If the flower already feels like hay, a humidity pack can restore some pliability. It will not restore lost terpenes. Buy amounts you will actually smoke, and restock from a shop that stores product correctly.',
    ],
  },
  {
    slug: 'best-smell-proof-stash-bags',
    title: 'Best Smell-Proof Stash Bags',
    description: 'What actually contains odor versus what just looks tactical.',
    related: 'smell-proof-storage',
    body: [
      'Most “smell-proof” marketing is a zipper and a prayer. Real odor control is layers: a tight seal, a thick liner, and as little leftover plant matter in the corners as possible.',
      'Activated-carbon lined bags work better than thin nylon pouches. Look for a wide, overlapping zipper and a liner you can wipe. If the bag smells like last week after one eighth, it is not doing the job.',
      'Jars still beat bags for home storage. Bags win for travel, festivals, and keeping a daily amount separate from the main stash. Do not keep grinders full of kief in a bag you care about — grinders leak smell.',
      'Whatever you buy, empty it regularly. Residue is the smell. A “premium” bag packed with old flower and a dirty tool kit will lose to a cheap jar you actually clean.',
    ],
  },
  {
    slug: 'best-cannabis-storage-jars',
    title: 'Best Cannabis Storage Jars',
    description: 'Glass, UV, and lids that actually seal — without turning your kitchen into a lab.',
    related: 'storage',
    body: [
      'Start with glass. It does not hold odor the way cheap plastic does, and it will not leach into flower. A mason jar with a fresh lid is a better stash than a $40 “cannabis” container with a weak gasket.',
      'Ultraviolet glass can help if you cannot keep the jar in the dark. It is not magic. Darkness plus a real seal still matters more than the color of the glass.',
      'Size the jar to the amount. A gallon jar with a gram of flower is mostly air. Split larger amounts into smaller jars so you are not opening the whole stash every session.',
      'Skip anything with a built-in grinder lid unless you clean it constantly. The convenience is real. So is the leftover plant matter in the threads.',
    ],
  },
  {
    slug: 'best-humidity-packs-for-flower',
    title: 'Best Humidity Packs for Flower',
    description: 'Two-way packs, sizing, and when to throw one out.',
    related: 'humidity-control',
    body: [
      'Two-way humidity packs add or pull moisture to hold a target RH. One-way damp sponges and orange peels are how people grow mold. Do not do that.',
      'Match pack size to the container, not to optimism. A pack meant for an ounce in a tiny 2oz jar will overshoot. A tiny pack in a big jar will do nothing useful.',
      'Replace packs when they go rigid or when the jar no longer holds the feel you want. They are consumable, not a lifetime accessory. Keep used packs out of reach of pets.',
      'Humidity packs do not fix bad flower. They keep decent flower from getting worse. If a shop’s eighths are already crispy, shop somewhere that stores product like it matters.',
    ],
  },
] as const
