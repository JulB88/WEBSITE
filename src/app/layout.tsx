import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import Navbar from '@/components/Navbar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ShopBC - Business E-Commerce',
  description: 'Professional B2B and B2C e-commerce platform powered by Business Central',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
            <footer className="bg-gray-900 text-gray-300 py-8 mt-16">
              <div className="container">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div>
                    <h3 className="text-white font-bold text-lg mb-3">ShopBC</h3>
                    <p className="text-sm">Professional e-commerce powered by Microsoft Business Central.</p>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-3">Quick Links</h4>
                    <ul className="space-y-2 text-sm">
                      <li><a href="/products" className="hover:text-white transition-colors">Products</a></li>
                      <li><a href="/account" className="hover:text-white transition-colors">My Account</a></li>
                      <li><a href="/cart" className="hover:text-white transition-colors">Cart</a></li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-3">Contact</h4>
                    <p className="text-sm">support@shopbc.example.com</p>
                  </div>
                </div>
                <div className="border-t border-gray-700 mt-8 pt-4 text-center text-sm">
                  <p>&copy; {new Date().getFullYear()} ShopBC. All rights reserved.</p>
                </div>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  )
}
