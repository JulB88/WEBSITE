'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { useCartStore } from '@/lib/cart-store'
import type { Product } from '@/types'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

export default function ProductDetailPage() {
  const params = useParams()
  const { data: session } = useSession()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const addItem = useCartStore((state) => state.addItem)

  useEffect(() => {
    async function fetchProduct() {
      try {
        const res = await fetch(`/api/products/${params.id}`)
        if (res.ok) {
          const data = await res.json()
          setProduct(data)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchProduct()
  }, [params.id])

  const handleAddToCart = () => {
    if (!product) return
    for (let i = 0; i < quantity; i++) {
      addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        displayPrice: product.displayPrice ?? product.price,
        imageUrl: product.imageUrl,
        bcItemNo: product.bcItemNo,
        category: product.category,
      })
    }
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  if (loading) {
    return (
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 animate-pulse">
          <div className="h-96 bg-gray-200 rounded-xl" />
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/4" />
            <div className="h-6 bg-gray-200 rounded w-1/3" />
            <div className="h-32 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="container py-12 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Product not found</h2>
        <Link href="/products" className="text-primary-600 hover:text-primary-700">
          Back to products
        </Link>
      </div>
    )
  }

  const displayPrice = product.displayPrice ?? product.price
  const hasDiscount = displayPrice < product.price
  const savings = product.price - displayPrice

  return (
    <div className="container py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
        <Link href="/" className="hover:text-primary-600">Home</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-primary-600">Products</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium truncate">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Image */}
        <div className="relative h-96 md:h-auto md:min-h-[480px] bg-gray-100 rounded-xl overflow-hidden">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col">
          {product.category && (
            <Badge variant="secondary" className="self-start mb-3">
              {product.category}
            </Badge>
          )}

          <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
          <p className="text-sm text-gray-500 mb-4">Item No: {product.bcItemNo}</p>

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-3xl font-bold text-gray-900">${displayPrice.toFixed(2)}</span>
            {hasDiscount && (
              <>
                <span className="text-xl text-gray-400 line-through">${product.price.toFixed(2)}</span>
                <Badge variant="success">
                  Save ${savings.toFixed(2)}
                </Badge>
              </>
            )}
          </div>

          {/* Stock */}
          <div className="flex items-center gap-2 mb-6">
            {product.stock > 10 ? (
              <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                In stock ({product.stock} available)
              </span>
            ) : product.stock > 0 ? (
              <span className="flex items-center gap-1 text-amber-600 text-sm font-medium">
                <span className="w-2 h-2 bg-amber-500 rounded-full" />
                Low stock — only {product.stock} left
              </span>
            ) : (
              <span className="flex items-center gap-1 text-red-600 text-sm font-medium">
                <span className="w-2 h-2 bg-red-500 rounded-full" />
                Out of stock
              </span>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <div className="mb-8">
              <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-600 leading-relaxed">{product.description}</p>
            </div>
          )}

          {/* Quantity selector */}
          {product.stock > 0 && (
            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm font-medium text-gray-700">Quantity:</span>
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-2 hover:bg-gray-100 transition-colors border-r border-gray-300"
                >
                  -
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(product.stock, parseInt(e.target.value) || 1))
                    setQuantity(val)
                  }}
                  className="w-16 text-center py-2 text-sm font-medium border-none outline-none"
                  min={1}
                  max={product.stock}
                />
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="px-3 py-2 hover:bg-gray-100 transition-colors border-l border-gray-300"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* Add to cart button */}
          <Button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            size="lg"
            fullWidth
            className="mb-4"
          >
            {added ? '✓ Added to Cart!' : product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
          </Button>

          <Link
            href="/checkout"
            className="block text-center text-sm text-gray-600 hover:text-primary-600 transition-colors"
          >
            Proceed to checkout →
          </Link>

          {/* Business pricing note */}
          {session?.user.businessCustomerId && hasDiscount && (
            <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-amber-800 text-sm">
                Business customer pricing applied. You save ${savings.toFixed(2)} on this item.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
