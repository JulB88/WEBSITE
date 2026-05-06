'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useCartStore } from '@/lib/cart-store'
import CartSidebar from './CartSidebar'

export default function Navbar() {
  const { data: session } = useSession()
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const items = useCartStore((state) => state.items)
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <>
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="container">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="bg-primary-600 text-white rounded-lg w-8 h-8 flex items-center justify-center font-bold text-sm">
                BC
              </div>
              <span className="font-bold text-xl text-gray-900">ShopBC</span>
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-6">
              <Link
                href="/"
                className="text-gray-600 hover:text-primary-600 font-medium transition-colors"
              >
                Home
              </Link>
              <Link
                href="/products"
                className="text-gray-600 hover:text-primary-600 font-medium transition-colors"
              >
                Products
              </Link>
              <Link
                href="/about"
                className="text-gray-600 hover:text-primary-600 font-medium transition-colors"
              >
                About
              </Link>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {/* Cart button */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Open cart"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </button>

              {/* Auth buttons */}
              {session ? (
                <div className="hidden md:flex items-center gap-3">
                  <Link
                    href="/account"
                    className="text-sm text-gray-700 hover:text-primary-600 font-medium transition-colors"
                  >
                    {session.user.name || session.user.email}
                  </Link>
                  {session.user.role === 'ADMIN' && (
                    <Link
                      href="/admin"
                      className="text-sm bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Admin
                    </Link>
                  )}
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="text-sm text-gray-600 hover:text-red-600 font-medium transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-2">
                  <Link
                    href="/auth/login"
                    className="text-sm text-gray-600 hover:text-primary-600 font-medium transition-colors px-3 py-1.5"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/auth/register"
                    className="text-sm bg-primary-600 text-white px-3 py-1.5 rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Register
                  </Link>
                </div>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-gray-100 py-4 space-y-2">
              <Link href="/" className="block px-3 py-2 text-gray-700 hover:text-primary-600 font-medium" onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
              <Link href="/products" className="block px-3 py-2 text-gray-700 hover:text-primary-600 font-medium" onClick={() => setIsMobileMenuOpen(false)}>Products</Link>
              <Link href="/about" className="block px-3 py-2 text-gray-700 hover:text-primary-600 font-medium" onClick={() => setIsMobileMenuOpen(false)}>About</Link>
              <div className="border-t border-gray-100 pt-2">
                {session ? (
                  <>
                    <Link href="/account" className="block px-3 py-2 text-gray-700 hover:text-primary-600 font-medium" onClick={() => setIsMobileMenuOpen(false)}>Account</Link>
                    {session.user.role === 'ADMIN' && (
                      <Link href="/admin" className="block px-3 py-2 text-gray-700 hover:text-primary-600 font-medium" onClick={() => setIsMobileMenuOpen(false)}>Admin</Link>
                    )}
                    <button onClick={() => { signOut({ callbackUrl: '/' }); setIsMobileMenuOpen(false) }} className="block w-full text-left px-3 py-2 text-red-600 font-medium">Sign out</button>
                  </>
                ) : (
                  <>
                    <Link href="/auth/login" className="block px-3 py-2 text-gray-700 hover:text-primary-600 font-medium" onClick={() => setIsMobileMenuOpen(false)}>Sign in</Link>
                    <Link href="/auth/register" className="block px-3 py-2 text-primary-600 font-medium" onClick={() => setIsMobileMenuOpen(false)}>Register</Link>
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
