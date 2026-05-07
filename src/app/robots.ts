import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://dsf.example.com'
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/products', '/products/'],
        disallow: ['/account', '/checkout', '/dashboard', '/admin', '/api/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
