import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import { BrandService } from '@/lib/services'

export async function generateMetadata(): Promise<Metadata> {
  const brand = await BrandService.get().catch(() => BrandService.DEFAULTS)
  return {
    title: `${brand.nameShort} - Distribution professionnelle`,
    description: `${brand.nameLegal} — plateforme B2B et B2C connectée à Microsoft Business Central`,
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Palette injectée depuis les réglages (surcharge les valeurs par défaut de globals.css)
  const brand = await BrandService.get().catch(() => BrandService.DEFAULTS)

  return (
    <html lang="fr">
      <head>
        <style dangerouslySetInnerHTML={{ __html: BrandService.cssVariables(brand) }} />
      </head>
      <body style={{ fontFamily: "'Montserrat', sans-serif" }}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
