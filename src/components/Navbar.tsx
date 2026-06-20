'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'
import { useCartStore } from '@/lib/cart-store'
import { useI18n } from '@/lib/i18n'
import CartSidebar from './CartSidebar'

const STAFF_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CUSTOMER_SERVICE']

interface NavbarProps {
  logoUrl?: string
  nameShort?: string
}

export default function Navbar({ logoUrl = '/dsf-logo.png', nameShort = 'DSF' }: NavbarProps) {
  const { data: session } = useSession()
  const { t, lang, setLang } = useI18n()
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)
  const items = useCartStore((state) => state.items)
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const isStaff = session && STAFF_ROLES.includes(session.user.role)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setIsAccountOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const linkStyle: React.CSSProperties = {
    color: '#fff',
    fontWeight: 500,
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    padding: '0 14px',
    transition: 'color 0.2s ease',
    textDecoration: 'none',
  }

  return (
    <>
      {/* Top accent bar */}
      <div style={{ height: '4px', backgroundColor: 'var(--brand-primary)' }} />

      <nav style={{ backgroundColor: 'var(--brand-dark)', position: 'sticky', top: 0, zIndex: 40 }}>
        <div className="container">
          <div className="flex items-center justify-between" style={{ height: '72px' }}>

            {/* Logo */}
            <Link href="/" className="flex items-center" style={{ textDecoration: 'none' }}>
              <Image src={logoUrl} alt={nameShort} width={120} height={42} style={{ objectFit: 'contain' }} priority />
            </Link>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center">
              {[
                { href: '/', label: t('nav_home') },
                { href: '/products', label: t('nav_products') },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  style={linkStyle}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--brand-primary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#fff')}
                >
                  {label}
                </Link>
              ))}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">

              {/* Lang toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginRight: 4 }}>
                {(['fr', 'en'] as const).map((l, i) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: lang === l ? 'var(--brand-primary)' : 'rgba(255,255,255,0.55)',
                      fontWeight: lang === l ? 700 : 500,
                      fontSize: '0.72rem',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      padding: '2px 4px',
                      transition: 'color 0.2s',
                    }}
                    aria-label={`Langue ${l.toUpperCase()}`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Cart */}
              <button
                onClick={() => setIsCartOpen(true)}
                aria-label={t('cart_title')}
                style={{ position: 'relative', padding: '8px', color: '#fff', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--brand-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = '#fff')}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {itemCount > 0 && (
                  <span style={{
                    position: 'absolute', top: 0, right: 0,
                    backgroundColor: 'var(--brand-primary)', color: '#fff',
                    fontSize: '0.65rem', width: 18, height: 18,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700,
                  }}>
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </button>

              {/* Auth — desktop */}
              <div className="hidden md:flex items-center gap-2">
                {session ? (
                  <>
                    {isStaff && (
                      <Link
                        href="/dashboard"
                        style={{ backgroundColor: 'var(--brand-primary)', color: '#fff', padding: '6px 16px', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', textDecoration: 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--brand-primary-dark)')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--brand-primary)')}
                      >
                        {t('nav_dashboard')}
                      </Link>
                    )}

                    {/* Account dropdown */}
                    <div ref={accountRef} style={{ position: 'relative' }}>
                      <button
                        onClick={() => setIsAccountOpen(!isAccountOpen)}
                        aria-expanded={isAccountOpen}
                        aria-haspopup="true"
                        style={{
                          ...linkStyle,
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--brand-primary)')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#fff')}
                      >
                        <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {session.user.name?.split(' ')[0] || t('nav_account')}
                        </span>
                        <svg style={{ width: 12, height: 12, transition: 'transform 0.2s', transform: isAccountOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {isAccountOpen && (
                        <div style={{
                          position: 'absolute', top: '100%', right: 0,
                          backgroundColor: '#fff', border: '1px solid #e5e7eb',
                          borderTop: '3px solid var(--brand-primary)',
                          minWidth: 200, zIndex: 50,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        }}>
                          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--brand-bg)' }}>
                            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-dark)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                              {session.user.name}
                            </p>
                            <p style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 2 }}>{session.user.email}</p>
                          </div>
                          {[
                            { href: '/account', label: t('nav_account') },
                            { href: '/account/orders', label: t('nav_orders') },
                          ].map(({ href, label }) => (
                            <Link
                              key={href}
                              href={href}
                              onClick={() => setIsAccountOpen(false)}
                              style={{ display: 'block', padding: '0.65rem 1rem', fontSize: '0.82rem', fontWeight: 500, color: '#374151', textDecoration: 'none', transition: 'background 0.15s' }}
                              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f9fafb'; e.currentTarget.style.color = 'var(--brand-primary)' }}
                              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#374151' }}
                            >
                              {label}
                            </Link>
                          ))}
                          <div style={{ borderTop: '1px solid var(--brand-bg)' }}>
                            <button
                              onClick={() => { signOut({ callbackUrl: '/' }); setIsAccountOpen(false) }}
                              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.65rem 1rem', fontSize: '0.82rem', fontWeight: 500, color: 'var(--brand-primary)', background: 'none', border: 'none', cursor: 'pointer', transition: 'background 0.15s' }}
                              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              {t('nav_logout')}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <Link
                      href="/auth/login"
                      style={linkStyle}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--brand-primary)')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#fff')}
                    >
                      {t('nav_login')}
                    </Link>
                    <Link
                      href="/auth/register"
                      style={{ backgroundColor: 'var(--brand-primary)', color: '#fff', padding: '8px 20px', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', textDecoration: 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--brand-primary-dark)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--brand-primary)')}
                    >
                      {t('nav_register')}
                    </Link>
                  </>
                )}
              </div>

              {/* Mobile hamburger */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden"
                aria-label={isMobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
                aria-expanded={isMobileMenuOpen}
                style={{ padding: '8px', color: '#fff', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMobileMenuOpen
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {isMobileMenuOpen && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
              {[
                { href: '/', label: t('nav_home') },
                { href: '/products', label: t('nav_products') },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{ display: 'block', padding: '10px 0', color: '#fff', fontWeight: 500, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em', textDecoration: 'none' }}
                >
                  {label}
                </Link>
              ))}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.75rem', marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {session ? (
                  <>
                    <Link href="/account" onClick={() => setIsMobileMenuOpen(false)} style={{ display: 'block', padding: '8px 0', color: '#fff', fontSize: '0.85rem', textDecoration: 'none' }}>{t('nav_account')}</Link>
                    <Link href="/account/orders" onClick={() => setIsMobileMenuOpen(false)} style={{ display: 'block', padding: '8px 0', color: '#fff', fontSize: '0.85rem', textDecoration: 'none' }}>{t('nav_orders')}</Link>
                    {isStaff && (
                      <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)} style={{ display: 'block', padding: '8px 0', color: 'var(--brand-primary)', fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none' }}>{t('nav_dashboard')}</Link>
                    )}
                    <button onClick={() => { signOut({ callbackUrl: '/' }); setIsMobileMenuOpen(false) }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 0', color: 'var(--brand-primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}>{t('nav_logout')}</button>
                  </>
                ) : (
                  <>
                    <Link href="/auth/login"    onClick={() => setIsMobileMenuOpen(false)} style={{ display: 'block', padding: '8px 0', color: '#fff', fontSize: '0.85rem', textDecoration: 'none' }}>{t('nav_login')}</Link>
                    <Link href="/auth/register" onClick={() => setIsMobileMenuOpen(false)} style={{ display: 'block', padding: '8px 0', color: 'var(--brand-primary)', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>{t('nav_register')}</Link>
                  </>
                )}
                {/* Mobile lang toggle */}
                <div style={{ display: 'flex', gap: 8, paddingTop: 8 }}>
                  {(['fr', 'en'] as const).map(l => (
                    <button
                      key={l}
                      onClick={() => setLang(l)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: lang === l ? 'var(--brand-primary)' : 'rgba(255,255,255,0.55)', fontWeight: lang === l ? 700 : 500, fontSize: '0.8rem', textTransform: 'uppercase', padding: '4px 0' }}
                    >
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  )
}
