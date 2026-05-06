'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCartStore } from '@/lib/cart-store'
import type { Product } from '@/types'
import Badge from './ui/Badge'

interface ProductCardProps {
  product: Product
  discountPercent?: number
}

export default function ProductCard({ product, discountPercent = 0 }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem)

  const displayPrice =
    product.displayPrice !== undefined
      ? product.displayPrice
      : product.price * (1 - discountPercent / 100)

  const hasDiscount = displayPrice < product.price

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      displayPrice,
      imageUrl: product.imageUrl,
      bcItemNo: product.bcItemNo,
      category: product.category,
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
      {/* Image */}
      <Link href={`/products/${product.id}`} className="block">
        <div className="relative h-48 bg-gray-100 overflow-hidden">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          )}
          {product.stock === 0 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white font-semibold">Out of Stock</span>
            </div>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <Link href={`/products/${product.id}`} className="flex-1">
            <h3 className="font-semibold text-gray-900 text-sm leading-tight hover:text-primary-600 transition-colors line-clamp-2">
              {product.name}
            </h3>
          </Link>
          {product.category && (
            <Badge variant="secondary" className="shrink-0 text-xs">
              {product.category}
            </Badge>
          )}
        </div>

        {/* Price */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg font-bold text-gray-900">
            ${displayPrice.toFixed(2)}
          </span>
          {hasDiscount && (
            <span className="text-sm text-gray-400 line-through">
              ${product.price.toFixed(2)}
            </span>
          )}
          {hasDiscount && (
            <Badge variant="success" className="text-xs">
              -{Math.round(((product.price - displayPrice) / product.price) * 100)}%
            </Badge>
          )}
        </div>

        {/* Stock indicator */}
        <p className="text-xs text-gray-500 mb-3">
          {product.stock > 10
            ? 'In stock'
            : product.stock > 0
            ? `Only ${product.stock} left`
            : 'Out of stock'}
        </p>

        {/* Add to cart */}
        <button
          onClick={handleAddToCart}
          disabled={product.stock === 0}
          className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </div>
  )
}
