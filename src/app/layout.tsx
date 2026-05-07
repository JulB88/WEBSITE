import type { Metadata } from 'next'
import Image from 'next/image'
import './globals.css'
import { Providers } from './providers'
import Navbar from '@/components/Navbar'

export const metadata: Metadata = {
  title: 'DSF - Distribution professionnelle',
  description: 'Distribution Ste-Foy — plateforme B2B et B2C connectée à Microsoft Business Central',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body style={{ fontFamily: "'Montserrat', sans-serif" }}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">
              {children}
            </main>

            {/* Footer — dark navy, style DSF */}
            <footer style={{ backgroundColor: '#1f2232', color: '#9ca3af' }}>
              {/* Red top accent bar */}
              <div style={{ height: '6px', backgroundColor: '#e51937' }} />

              <div className="container py-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  {/* Brand */}
                  <div>
                    <div className="mb-4">
                      <Image src="/dsf-logo.png" alt="DSF" width={110} height={38} style={{ objectFit: 'contain' }} />
                    </div>
                    <p className="text-sm" style={{ fontWeight: 300 }}>
                      Distribution professionnelle connectée à Microsoft Business Central.
                    </p>
                  </div>

                  {/* Links */}
                  <div>
                    <h4 style={{ color: '#fff', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                      Navigation
                    </h4>
                    <ul className="space-y-2 text-sm" style={{ fontWeight: 300 }}>
                      <li><a href="/products" className="hover:text-white transition-colors" style={{ color: '#9ca3af' }}>Produits</a></li>
                      <li><a href="/account" className="hover:text-white transition-colors" style={{ color: '#9ca3af' }}>Mon compte</a></li>
                      <li><a href="/cart" className="hover:text-white transition-colors" style={{ color: '#9ca3af' }}>Panier</a></li>
                    </ul>
                  </div>

                  {/* Contact */}
                  <div>
                    <h4 style={{ color: '#fff', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                      Contact
                    </h4>
                    <p className="text-sm" style={{ fontWeight: 300 }}>support@dsf.example.com</p>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '2.5rem', paddingTop: '1.5rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: 300 }}>
                  <p>&copy; {new Date().getFullYear()} Distribution Ste-Foy (DSF). Tous droits réservés.</p>
                </div>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  )
}
