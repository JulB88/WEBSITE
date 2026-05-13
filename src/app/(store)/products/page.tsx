'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import ProductCard from '@/components/ProductCard'
import { useI18n } from '@/lib/i18n'
import type { Product } from '@/types'

const sortApiMap: Record<string, string> = {
  newest: 'createdAt_desc',
  'price-asc': 'price_asc',
  'price-desc': 'price_desc',
  name: 'name_asc',
}

function ProductsContent() {
  const { data: session } = useSession()
  const { t, lang } = useI18n()
  const searchParams = useSearchParams()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<{ name: string; nameEn: string | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [category, setCategory] = useState(searchParams.get('category') || '')
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest')

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (category) params.set('category', category)
    params.set('sort', sortApiMap[sortBy] || 'createdAt_desc')
    params.set('limit', '100')

    try {
      const res = await fetch(`/api/products?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setProducts(data.products || [])
      }
    } catch (e) {
      console.error('Failed to fetch products', e)
    } finally {
      setLoading(false)
    }
  }, [search, category, sortBy])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((data: { name: string; nameEn: string | null }[]) => setCategories(data))
      .catch(() => {})
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchProducts()
  }

  return (
    <div style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      <div className="container">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#1f2232', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.25rem' }}>
            {t('products_title')}
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>{t('products_sub')}</p>
        </div>

        {/* Filters */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderTop: '3px solid #e51937', padding: '1rem', marginBottom: '2rem' }}>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <form onSubmit={handleSearch} style={{ flex: 1 }}>
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#9ca3af' }}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('products_search')}
                  style={{ width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10, border: '1px solid #e5e7eb', fontSize: '0.85rem', outline: 'none' }}
                />
              </div>
            </form>

            {/* Category filter */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ padding: '10px 12px', border: '1px solid #e5e7eb', fontSize: '0.85rem', minWidth: 160, background: '#fff' }}
            >
              <option value="">{t('products_all_cats')}</option>
              {categories.map((cat) => (
                <option key={cat.name} value={cat.name}>
                  {lang === 'en' && cat.nameEn ? cat.nameEn : cat.name}
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ padding: '10px 12px', border: '1px solid #e5e7eb', fontSize: '0.85rem', minWidth: 160, background: '#fff' }}
            >
              <option value="newest">{t('products_sort_newest')}</option>
              <option value="price-asc">{t('products_sort_price_asc')}</option>
              <option value="price-desc">{t('products_sort_price_desc')}</option>
              <option value="name">{t('products_sort_name')}</option>
            </select>
          </div>
        </div>

        {/* Business pricing notice */}
        {session?.user.businessCustomerId && (
          <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fcd34d', padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: '#92400e', fontWeight: 500 }}>
            {t('home_b2b_sub')}
          </div>
        )}

        {/* Results count */}
        {!loading && (
          <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '1rem' }}>
            {t('cart_items', { n: products.length })}
          </p>
        )}

        {/* Product Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: '#9ca3af', fontSize: '1rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {t('products_loading')}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: '#9ca3af' }}>
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p style={{ fontSize: '1rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('products_none')}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ProductsPageSkeleton() {
  return (
    <div style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      <div className="container">
        <div className="h-8 bg-gray-200 rounded w-48 mb-2 animate-pulse" />
        <div className="h-4 bg-gray-200 rounded w-64 mb-8 animate-pulse" />
        <div className="h-16 bg-white border border-gray-200 mb-8 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 overflow-hidden animate-pulse">
              <div className="h-48 bg-gray-200" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-8 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductsPageSkeleton />}>
      <ProductsContent />
    </Suspense>
  )
}
