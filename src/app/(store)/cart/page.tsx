'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useCartStore } from '@/lib/cart-store'
import { useI18n } from '@/lib/i18n'
import Button from '@/components/ui/Button'

export default function CartPage() {
  const { t } = useI18n()
  const items = useCartStore((state) => state.items)
  const removeItem = useCartStore((state) => state.removeItem)
  const updateQuantity = useCartStore((state) => state.updateQuantity)
  const clearCart = useCartStore((state) => state.clearCart)

  const subtotal = items.reduce((sum, item) => sum + item.displayPrice * item.quantity, 0)
  const totalQty = items.reduce((s, i) => s + i.quantity, 0)

  if (items.length === 0) {
    return (
      <div style={{ paddingTop: '4rem', paddingBottom: '4rem', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: 480, margin: '0 auto' }}>
          <svg className="w-20 h-20 mx-auto mb-6" style={{ color: '#d1d5db' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--brand-dark)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            {t('cart_empty_title')}
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '2rem', fontSize: '0.9rem' }}>{t('cart_empty_sub')}</p>
          <Link href="/products">
            <Button size="lg">{t('cart_browse')}</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--brand-dark)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {t('cart_title')}
        </h1>
        <button
          onClick={clearCart}
          style={{ fontSize: '0.82rem', color: 'var(--brand-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
        >
          {t('cart_clear')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart items */}
        <div className="lg:col-span-2" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Header row */}
          <div className="hidden md:grid grid-cols-12 gap-4" style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', padding: '0 1rem 0.5rem', borderBottom: '1px solid #e5e7eb' }}>
            <div className="col-span-6">{t('cart_product')}</div>
            <div className="col-span-2 text-center">{t('cart_price')}</div>
            <div className="col-span-2 text-center">{t('cart_qty')}</div>
            <div className="col-span-2 text-right">{t('cart_subtotal')}</div>
          </div>

          {items.map((item) => (
            <div
              key={item.id}
              style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', padding: '1rem' }}
              className="grid grid-cols-12 gap-4 items-center"
            >
              {/* Image + name */}
              <div className="col-span-12 md:col-span-6 flex items-center gap-4">
                <div style={{ width: 64, height: 64, backgroundColor: 'var(--brand-bg)', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
                  {item.imageUrl ? (
                    <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="64px" />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d1d5db' }}>
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  )}
                </div>
                <div>
                  <Link href={`/products/${item.id}`} style={{ fontWeight: 600, color: 'var(--brand-dark)', fontSize: '0.85rem', textDecoration: 'none', textTransform: 'uppercase' }}>
                    {item.name}
                  </Link>
                  {item.category && (
                    <p style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: 2 }}>{item.category}</p>
                  )}
                  <button
                    onClick={() => removeItem(item.id)}
                    style={{ fontSize: '0.72rem', color: 'var(--brand-primary)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4, padding: 0 }}
                  >
                    {t('cart_remove')}
                  </button>
                </div>
              </div>

              {/* Unit price */}
              <div className="col-span-4 md:col-span-2 text-center">
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--brand-dark)' }}>{item.displayPrice.toFixed(2)} $</span>
                {item.displayPrice < item.price && (
                  <p style={{ fontSize: '0.72rem', color: '#9ca3af', textDecoration: 'line-through' }}>{item.price.toFixed(2)} $</p>
                )}
              </div>

              {/* Quantity */}
              <div className="col-span-4 md:col-span-2 flex justify-center">
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e5e7eb' }}>
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)} style={{ padding: '6px 10px', background: 'none', border: 'none', cursor: 'pointer', borderRight: '1px solid #e5e7eb' }}>-</button>
                  <span style={{ padding: '6px 12px', fontSize: '0.85rem', fontWeight: 600 }}>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)} style={{ padding: '6px 10px', background: 'none', border: 'none', cursor: 'pointer', borderLeft: '1px solid #e5e7eb' }}>+</button>
                </div>
              </div>

              {/* Subtotal */}
              <div className="col-span-4 md:col-span-2 text-right">
                <span style={{ fontWeight: 700, color: 'var(--brand-dark)' }}>{(item.displayPrice * item.quantity).toFixed(2)} $</span>
              </div>
            </div>
          ))}
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderTop: '3px solid var(--brand-primary)', padding: '1.5rem', position: 'sticky', top: '6rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--brand-dark)', marginBottom: '1.25rem' }}>
              {t('cart_summary')}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#6b7280' }}>{t('cart_items', { n: totalQty })}</span>
                <span style={{ fontWeight: 600 }}>{subtotal.toFixed(2)} $</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#6b7280' }}>{t('cart_shipping')}</span>
                <span style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.78rem' }}>{t('cart_shipping_note')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e5e7eb', paddingTop: '0.75rem' }}>
                <span style={{ fontWeight: 700, color: 'var(--brand-dark)' }}>{t('cart_total')}</span>
                <span style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--brand-dark)' }}>{subtotal.toFixed(2)} $</span>
              </div>
            </div>

            <Link href="/checkout">
              <Button size="lg" fullWidth>{t('cart_checkout')}</Button>
            </Link>

            <Link
              href="/products"
              style={{ display: 'block', textAlign: 'center', fontSize: '0.8rem', color: '#6b7280', marginTop: '0.75rem', textDecoration: 'none' }}
            >
              {t('cart_continue')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
