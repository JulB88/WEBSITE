/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Business Central image CDN
      { protocol: 'https', hostname: '*.businesscentral.dynamics.com' },
      // Product image hosting — add your own CDN here if needed
      { protocol: 'https', hostname: 'cdn.dsf.example.com' },
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
              // 'unsafe-eval' is required by React in development mode only (stack trace reconstruction)
              `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''} https://js.stripe.com https://cdn.tailwindcss.com`,
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
