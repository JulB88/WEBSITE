'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { useCartStore } from '@/lib/cart-store'
import { useI18n } from '@/lib/i18n'
import type { Product } from '@/types'

interface ProductCardProps {
  product: Product
  discountPercent?: number
}

export default function ProductCard({ product, discountPercent = 0 }: ProductCardProps) {
  const { t, lang } = useI18n()
  const addItem = useCartStore((state) => state.addItem)
  const [added, setAdded] = useState(false)

  const displayPrice =
    product.displayPrice !== undefined
      ? product.displayPrice
      : product.price * (1 - discountPercent / 100)

  const hasDiscount = displayPrice < product.price

  const displayName = (lang === 'en' && product.nameEn) ? product.nameEn : product.name

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
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  const stockLabel = product.stock === 0
    ? t('out_of_stock')
    : product.stock <= 10
      ? t('low_stock', { n: product.stock })
      : t('in_stock')

  return (
    <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', overflow: 'hidden', transition: 'box-shadow 0.2s' }}
         className="group hover:shadow-lg">
      {/* Image */}
      <Link href={`/products/${product.id}`} className="block">
        <div style={{ position: 'relative', height: 200, backgroundColor: '#f3f4f6', overflow: 'hidden' }}>
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={displayName}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          )}
          {/* Red top accent bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: '#e51937' }} />
          {product.stock === 0 && (
            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.1em' }}>{t('out_of_stock')}</span>
            </div>
          )}
          {hasDiscount && (
            <div style={{ position: 'absolute', top: 12, right: 0, backgroundColor: '#e51937', color: '#fff', padding: '3px 10px', fontSize: '0.7rem', fontWeight: 700 }}>
              -{Math.round(((product.price - displayPrice) / product.price) * 100)}%
            </div>
          )}
        </div>
      </Link>

      {/* Content */}
      <div style={{ padding: '1rem' }}>
        {product.category && (
          <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#e51937', marginBottom: '0.35rem' }}>
            {product.category}
          </p>
        )}

        <Link href={`/products/${product.id}`} style={{ textDecoration: 'none' }}>
          <h3 style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1f2232', lineHeight: 1.3, marginBottom: '0.6rem', textTransform: 'uppercase' }}
              className="line-clamp-2 hover:text-[#e51937] transition-colors">
            {displayName}
          </h3>
        </Link>

        {/* Price */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#1f2232' }}>
            {displayPrice.toFixed(2)} $
          </span>
          {hasDiscount && (
            <span style={{ fontSize: '0.8rem', color: '#9ca3af', textDecoration: 'line-through' }}>
              {product.price.toFixed(2)} $
            </span>
          )}
        </div>

        {/* Stock */}
        <p style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: '0.75rem', fontWeight: 500 }}>
          {stockLabel}
        </p>

        {/* Add to cart */}
        <button
          onClick={handleAddToCart}
          disabled={product.stock === 0}
          style={{
            width: '100%',
            backgroundColor: product.stock === 0 ? '#e5e7eb' : added ? '#16a34a' : '#e51937',
            color: product.stock === 0 ? '#9ca3af' : '#fff',
            padding: '10px 16px',
            fontWeight: 700,
            fontSize: '0.72rem',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            border: 'none',
            cursor: product.stock === 0 ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={e => { if (product.stock > 0 && !added) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#333' }}
          onMouseLeave={e => { if (product.stock > 0 && !added) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#e51937' }}
        >
          {product.stock === 0 ? t('out_of_stock') : added ? t('added_to_cart') : t('add_to_cart')}
        </button>
      </div>
    </div>
  )
}
