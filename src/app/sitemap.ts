import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://dsf.example.com'

  const products = await prisma.product.findMany({
    where: { active: true },
    select: { id: true, updatedAt: true },
  })

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/products`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/auth/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/auth/register`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ]

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${base}/products/${p.id}`,
    lastModified: p.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [...staticRoutes, ...productRoutes]
}
