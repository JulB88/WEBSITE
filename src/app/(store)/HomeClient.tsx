'use client'

import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import ProductCard from '@/components/ProductCard'
import type { Product } from '@/types'
import type { CategoryBilingual } from './page'

interface Props {
  products: Product[]
  categories: CategoryBilingual[]
  isLoggedIn: boolean
  isB2B: boolean
}

export default function HomeClient({ products, categories, isLoggedIn, isB2B }: Props) {
  const { t, lang } = useI18n()

  return (
    <div>
      {/* ── Hero ── */}
      <section style={{ backgroundColor: 'var(--brand-dark)', color: '#fff', borderBottom: '6px solid var(--brand-primary)' }}>
        <div className="container" style={{ paddingTop: '6rem', paddingBottom: '6rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: '1.5rem', color: '#fff' }}>
            {t('home_hero_title')}
          </h1>
          <div style={{ width: 80, height: 6, backgroundColor: 'var(--brand-primary)', margin: '0 auto 2rem' }} />
          <p style={{ fontSize: '1.1rem', fontWeight: 300, color: 'rgba(255,255,255,0.75)', maxWidth: 680, margin: '0 auto 2.5rem', lineHeight: 1.8 }}>
            {t('home_hero_sub')}
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/products"
              style={{ backgroundColor: 'var(--brand-primary)', color: '#fff', padding: '16px 40px', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', textDecoration: 'none' }}
            >
              {t('home_hero_cta')}
            </Link>
            {!isLoggedIn && (
              <Link
                href="/auth/register"
                style={{ border: '2px solid var(--brand-primary)', color: '#fff', padding: '14px 40px', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', textDecoration: 'none' }}
              >
                {t('home_hero_cta2')}
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── B2B banner ── */}
      {isB2B && (
        <div style={{ backgroundColor: 'var(--brand-primary)', borderBottom: '2px solid #c0112e' }}>
          <div className="container" style={{ paddingTop: '0.6rem', paddingBottom: '0.6rem' }}>
            <p style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 600, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {t('home_b2b_sub')}
            </p>
          </div>
        </div>
      )}

      {/* ── Stats ── */}
      <section style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', paddingTop: '2rem', paddingBottom: '2rem' }}>
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: t('home_stats_skus'), value: '10 000+' },
              { label: t('home_stats_delivery'), value: '24–48h' },
              { label: t('home_stats_bc'), value: 'BC' },
              { label: t('home_stats_b2b'), value: 'B2B' },
            ].map(({ label, value }) => (
              <div key={label} style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#fff', border: '1px solid #e5e7eb', borderTop: '3px solid var(--brand-primary)' }}>
                <p style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--brand-dark)', marginBottom: '0.25rem' }}>{value}</p>
                <p style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories ── */}
      {categories.length > 0 && (
        <section style={{ backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb', paddingTop: '3rem', paddingBottom: '3rem' }}>
          <div className="container">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--brand-dark)', marginBottom: '1.5rem' }}>
              {t('home_categories')}
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <Link
                href="/products"
                style={{ backgroundColor: 'var(--brand-primary)', color: '#fff', padding: '8px 20px', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none' }}
              >
                {t('home_cat_all')}
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/products?category=${encodeURIComponent(cat.name)}`}
                  style={{ backgroundColor: 'var(--brand-bg)', color: 'var(--brand-dark)', padding: '8px 20px', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none', border: '1px solid #e5e7eb' }}
                >
                  {lang === 'en' && cat.nameEn ? cat.nameEn : cat.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Featured Products ── */}
      <section style={{ paddingTop: '4rem', paddingBottom: '4rem', backgroundColor: '#fff' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2.5rem', paddingBottom: '1rem', borderBottom: '3px solid var(--brand-primary)' }}>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--brand-dark)', margin: 0 }}>
                {t('home_featured')}
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 4 }}>{t('home_featured_sub')}</p>
            </div>
            <Link
              href="/products"
              style={{ color: 'var(--brand-primary)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none' }}
            >
              {t('account_view_all')} →
            </Link>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: '#9ca3af' }}>
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p style={{ fontSize: '1rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('products_none')}</p>
            </div>
          )}
        </div>
      </section>

      {/* ── B2B Solutions ── */}
      {!isB2B && (
        <section style={{ backgroundColor: 'var(--brand-dark)', borderTop: '6px solid var(--brand-primary)', borderBottom: '6px solid var(--brand-primary)', paddingTop: '4rem', paddingBottom: '4rem' }}>
          <div className="container" style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#fff', marginBottom: '1rem' }}>
              {t('home_b2b_title')}
            </h2>
            <div style={{ width: 60, height: 5, backgroundColor: 'var(--brand-primary)', margin: '0 auto 1.5rem' }} />
            <p style={{ color: 'rgba(255,255,255,0.7)', maxWidth: 560, margin: '0 auto 2rem', lineHeight: 1.8, fontSize: '0.95rem' }}>
              {t('home_b2b_sub')}
            </p>
            <Link
              href="/auth/register"
              style={{ backgroundColor: 'var(--brand-primary)', color: '#fff', padding: '14px 36px', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', textDecoration: 'none' }}
            >
              {t('home_b2b_cta')}
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}
