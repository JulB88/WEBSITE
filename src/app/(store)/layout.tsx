import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { BrandService } from '@/lib/services'

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const brand = await BrandService.get().catch(() => BrandService.DEFAULTS)

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar logoUrl={brand.logoUrl} nameShort={brand.nameShort} />
      <main className="flex-1">
        {children}
      </main>
      <Footer logoUrl={brand.logoUrl} nameShort={brand.nameShort} nameLegal={brand.nameLegal} />
    </div>
  )
}
