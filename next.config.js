/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Business Central image CDN
      { protocol: 'https', hostname: '*.businesscentral.dynamics.com' },
      // Add your own product image hosts here — never use a wildcard (**)
      // which allows SSRF attacks through the image proxy
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },

  // Moved out of experimental in Next.js 15+
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://js.stripe.com https://cdn.tailwindcss.com",
              "frame-src https://js.stripe.com",
              "connect-src 'self' https://api.stripe.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https:",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
