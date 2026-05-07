import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import HomeClient from './HomeClient'
import type { Product } from '@/types'

async function getFeaturedProducts(businessCustomerId?: string | null): Promise<Product[]> {
  const products = await prisma.product.findMany({
    where: { active: true },
    take: 8,
    orderBy: { createdAt: 'desc' },
  })

  if (!businessCustomerId) return products as unknown as Product[]

  const businessCustomer = await prisma.businessCustomer.findUnique({
    where: { id: businessCustomerId },
    include: { priceList: { include: { priceListItems: true } } },
  })

  if (!businessCustomer) return products as unknown as Product[]

  return products.map((product) => {
    const priceListItem = businessCustomer.priceList?.priceListItems.find(
      (item) => item.productId === product.id
    )
    const discount = businessCustomer.discountPercent
    const displayPrice = priceListItem?.overridePrice
      ? priceListItem.overridePrice
      : product.price * (1 - discount / 100)
    return { ...product, displayPrice } as unknown as Product
  })
}

export type CategoryBilingual = { id: string; name: string; nameEn: string | null; slug: string }

async function getCategories(): Promise<CategoryBilingual[]> {
  return prisma.category.findMany({
    select: { id: true, name: true, nameEn: true, slug: true },
    orderBy: { name: 'asc' },
  })
}

export default async function HomePage() {
  const session = await getServerSession(authOptions)
  const products = await getFeaturedProducts(session?.user.businessCustomerId)
  const categories = await getCategories()

  return (
    <HomeClient
      products={products}
      categories={categories}
      isLoggedIn={!!session}
      isB2B={!!session?.user.businessCustomerId}
    />
  )
}
