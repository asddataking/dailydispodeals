/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [],
  },
  // Ensure API routes are not statically optimized
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Exclude Supabase Edge Functions from Next.js build (they're Deno files, not Node.js)
  webpack: (config, { isServer }) => {
    // Ignore Supabase Edge Functions during webpack compilation
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        ...(Array.isArray(config.watchOptions?.ignored) ? config.watchOptions.ignored : [config.watchOptions?.ignored].filter(Boolean)),
        '**/supabase/functions/**',
      ],
    }
    return config
  },
}

module.exports = nextConfig
