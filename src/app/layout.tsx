import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

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

            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  )
}
