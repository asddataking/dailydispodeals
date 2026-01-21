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
  // Generate static pages for city-based SEO
  async generateStaticParams() {
    return []
  },
}

module.exports = nextConfig
