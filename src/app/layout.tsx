import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import Navbar from '@/components/Navbar'

export const metadata: Metadata = {
  title: 'ShopBC - Distribution professionnelle',
  description: 'Plateforme B2B et B2C connectée à Microsoft Business Central',
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
                    <div className="flex items-center gap-3 mb-4">
                      <div style={{ backgroundColor: '#e51937', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#fff', fontWeight: 900, fontSize: '0.85rem', letterSpacing: '0.05em' }}>BC</span>
                      </div>
                      <span style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ShopBC</span>
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
                    <p className="text-sm" style={{ fontWeight: 300 }}>support@shopbc.example.com</p>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '2.5rem', paddingTop: '1.5rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: 300 }}>
                  <p>&copy; {new Date().getFullYear()} ShopBC. Tous droits réservés.</p>
                </div>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  )
}
