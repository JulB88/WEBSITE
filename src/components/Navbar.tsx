'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'
import { useCartStore } from '@/lib/cart-store'
import CartSidebar from './CartSidebar'

export default function Navbar() {
  const { data: session } = useSession()
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const items = useCartStore((state) => state.items)
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

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
      <div style={{ height: '4px', backgroundColor: '#e51937' }} />

      <nav style={{ backgroundColor: '#1f2232', position: 'sticky', top: 0, zIndex: 40 }}>
        <div className="container">
          <div className="flex items-center justify-between" style={{ height: '72px' }}>

            {/* Logo */}
            <Link href="/" className="flex items-center" style={{ textDecoration: 'none' }}>
              <Image src="/dsf-logo.png" alt="DSF" width={120} height={42} style={{ objectFit: 'contain' }} priority />
            </Link>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center">
              {[
                { href: '/',         label: 'Accueil' },
                { href: '/products', label: 'Produits' },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  style={linkStyle}
                  onMouseEnter={e => (e.currentTarget.style.color = '#e51937')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#fff')}
                >
                  {label}
                </Link>
              ))}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {/* Cart */}
              <button
                onClick={() => setIsCartOpen(true)}
                aria-label="Ouvrir le panier"
                style={{ position: 'relative', padding: '8px', color: '#fff', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#e51937')}
                onMouseLeave={e => (e.currentTarget.style.color = '#fff')}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {itemCount > 0 && (
                  <span style={{
                    position: 'absolute', top: 0, right: 0,
                    backgroundColor: '#e51937', color: '#fff',
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
                    <Link
                      href="/account"
                      style={{ ...linkStyle, fontSize: '0.75rem' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#e51937')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#fff')}
                    >
                      {session.user.name || session.user.email}
                    </Link>
                    {['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'CUSTOMER_SERVICE'].includes(session.user.role) && (
                      <Link
                        href="/dashboard"
                        style={{ backgroundColor: '#e51937', color: '#fff', padding: '6px 16px', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', textDecoration: 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#333')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#e51937')}
                      >
                        Dashboard
                      </Link>
                    )}
                    <button
                      onClick={() => signOut({ callbackUrl: '/' })}
                      style={{ ...linkStyle, background: 'none', border: 'none', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#e51937')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#fff')}
                    >
                      Déconnexion
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/auth/login"
                      style={linkStyle}
                      onMouseEnter={e => (e.currentTarget.style.color = '#e51937')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#fff')}
                    >
                      Connexion
                    </Link>
                    <Link
                      href="/auth/register"
                      style={{ backgroundColor: '#e51937', color: '#fff', padding: '8px 20px', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', textDecoration: 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#333')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#e51937')}
                    >
                      S'inscrire
                    </Link>
                  </>
                )}
              </div>

              {/* Mobile hamburger */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden"
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
                { href: '/',         label: 'Accueil' },
                { href: '/products', label: 'Produits' },
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
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                {session ? (
                  <>
                    <Link href="/account" onClick={() => setIsMobileMenuOpen(false)} style={{ display: 'block', padding: '8px 0', color: '#fff', fontSize: '0.85rem', textDecoration: 'none' }}>Mon compte</Link>
                    <button onClick={() => { signOut({ callbackUrl: '/' }); setIsMobileMenuOpen(false) }} style={{ display: 'block', padding: '8px 0', color: '#e51937', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}>Déconnexion</button>
                  </>
                ) : (
                  <>
                    <Link href="/auth/login"    onClick={() => setIsMobileMenuOpen(false)} style={{ display: 'block', padding: '8px 0', color: '#fff', fontSize: '0.85rem', textDecoration: 'none' }}>Connexion</Link>
                    <Link href="/auth/register" onClick={() => setIsMobileMenuOpen(false)} style={{ display: 'block', padding: '8px 0', color: '#e51937', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>S'inscrire</Link>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  )
}
