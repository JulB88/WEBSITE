import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import ProductCard from '@/components/ProductCard'

async function getFeaturedProducts(businessCustomerId?: string | null) {
  const products = await prisma.product.findMany({
    where: { active: true },
    take: 8,
    orderBy: { createdAt: 'desc' },
  })

  if (!businessCustomerId) return products

  const businessCustomer = await prisma.businessCustomer.findUnique({
    where: { id: businessCustomerId },
    include: {
      priceList: {
        include: { priceListItems: true },
      },
    },
  })

  if (!businessCustomer) return products

  return products.map((product) => {
    const priceListItem = businessCustomer.priceList?.priceListItems.find(
      (item) => item.productId === product.id
    )
    const discount = businessCustomer.discountPercent
    const displayPrice = priceListItem?.overridePrice
      ? priceListItem.overridePrice
      : product.price * (1 - discount / 100)

    return { ...product, displayPrice }
  })
}

async function getCategories() {
  const products = await prisma.product.findMany({
    where: { active: true, category: { not: null } },
    select: { category: true },
    distinct: ['category'],
  })
  return products.map((p) => p.category).filter(Boolean) as string[]
}

export default async function HomePage() {
  const session = await getServerSession(authOptions)
  const products = await getFeaturedProducts(session?.user.businessCustomerId)
  const categories = await getCategories()

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 text-white py-20">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-balance">
              Professional B2B E-Commerce
            </h1>
            <p className="text-xl text-primary-100 mb-8 text-balance">
              Powered by Microsoft Business Central. Custom pricing for business customers, real-time inventory sync, and seamless ordering.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/products"
                className="bg-white text-primary-700 px-8 py-3 rounded-xl font-semibold hover:bg-primary-50 transition-colors"
              >
                Browse Products
              </Link>
              {!session && (
                <Link
                  href="/auth/register"
                  className="border-2 border-white text-white px-8 py-3 rounded-xl font-semibold hover:bg-white/10 transition-colors"
                >
                  Create Business Account
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Business customer banner */}
      {session?.user.businessCustomerId && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="container py-3">
            <p className="text-amber-800 text-sm font-medium text-center">
              Business pricing active — Your custom discounts are applied to all products below.
            </p>
          </div>
        </div>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <section className="py-12 bg-white border-b border-gray-100">
          <div className="container">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Shop by Category</h2>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/products"
                className="px-4 py-2 bg-primary-600 text-white rounded-full text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                All Products
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat}
                  href={`/products?category=${encodeURIComponent(cat)}`}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  {cat}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="py-16">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Featured Products</h2>
            <Link
              href="/products"
              className="text-primary-600 hover:text-primary-700 font-medium text-sm"
            >
              View all products →
            </Link>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product as any}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className="text-lg font-medium">No products yet</p>
              <p className="text-sm mt-1">Products will appear here once synced from Business Central</p>
            </div>
          )}
        </div>
      </section>

      {/* Features section */}
      <section className="py-16 bg-gray-50">
        <div className="container">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">Why Choose ShopBC?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: '💼',
                title: 'Business Pricing',
                desc: 'Custom price lists and negotiated discounts for verified business customers.',
              },
              {
                icon: '🔄',
                title: 'Real-time BC Sync',
                desc: 'Products, inventory, and orders synced directly with Microsoft Business Central.',
              },
              {
                icon: '🔒',
                title: 'Secure Payments',
                desc: 'Powered by Stripe with full PCI compliance. Multiple payment methods supported.',
              },
            ].map((feat) => (
              <div key={feat.title} className="bg-white rounded-xl p-6 border border-gray-200 text-center">
                <div className="text-4xl mb-4">{feat.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{feat.title}</h3>
                <p className="text-gray-600 text-sm">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
