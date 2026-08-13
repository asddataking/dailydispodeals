const { withSentryConfig } = require("@sentry/nextjs");

const curatedCities = [
  'detroit',
  'ann-arbor',
  'port-huron',
  'grand-rapids',
  'lansing',
  'flint',
  'kalamazoo',
  'royal-oak',
  'ferndale',
  'saginaw',
]

const oldCitySlugs = [
  'detroit',
  'grand-rapids',
  'ann-arbor',
  'lansing',
  'flint',
  'warren',
  'sterling-heights',
  'troy',
  'farmington-hills',
  'kalamazoo',
  'livonia',
  'dearborn',
  'southfield',
  'rochester-hills',
  'taylor',
  'st-clair-shores',
  'pontiac',
  'wyoming',
  'westland',
  'saginaw',
  'muskegon',
  'bay-city',
  'midland',
  'holland',
  'mount-pleasant',
  'battle-creek',
  'jackson',
  'portage',
  'east-lansing',
  'royal-oak',
  'ferndale',
  'birmingham',
  'berkley',
  'huntington-woods',
  'clawson',
  'madison-heights',
  'hazel-park',
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '8mb',
    },
  },
  async redirects() {
    return oldCitySlugs.map((slug) => ({
      source: `/deals/${slug}`,
      destination: curatedCities.includes(slug) ? `/michigan/${slug}` : '/michigan',
      permanent: true,
    }))
  },
}

module.exports = withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: "dan-richmond",
  project: "dailydispodeals",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  // Hides source maps from generated client bundles
  hideSourceMaps: true,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
});
