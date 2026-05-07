import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import ProductCard from '@/components/ProductCard'

async function getFeaturedProducts(businessCustomerId?: string | null) {
  const products = await prisma.product.findMany({
    where: { active: true },
    take: 8,
    orderBy: { createdAt: 'desc' },
  })

  if (!businessCustomerId) return products

  const businessCustomer = await prisma.businessCustomer.findUnique({
    where: { id: businessCustomerId },
    include: { priceList: { include: { priceListItems: true } } },
  })

  if (!businessCustomer) return products

  return products.map((product) => {
    const priceListItem = businessCustomer.priceList?.priceListItems.find(
      (item) => item.productId === product.id
    )
    const discount = businessCustomer.discountPercent
    const displayPrice = priceListItem?.overridePrice
      ? priceListItem.overridePrice
      : product.price * (1 - discount / 100)
    return { ...product, displayPrice }
  })
}

async function getCategories() {
  const products = await prisma.product.findMany({
    where: { active: true, category: { not: null } },
    select: { category: true },
    distinct: ['category'],
  })
  return products.map((p) => p.category).filter(Boolean) as string[]
}

export default async function HomePage() {
  const session = await getServerSession(authOptions)
  const products = await getFeaturedProducts(session?.user.businessCustomerId)
  const categories = await getCategories()

  return (
    <div>
      {/* ── Hero ── dark navy + red accent, style DSF */}
      <section style={{ backgroundColor: '#1f2232', color: '#fff', borderBottom: '6px solid #e51937' }}>
        <div className="container" style={{ paddingTop: '6rem', paddingBottom: '6rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: '1.5rem', color: '#fff', position: 'relative', display: 'inline-block' }}>
            Distribution professionnelle
          </h1>
          {/* Red underline accent */}
          <div style={{ width: 80, height: 6, backgroundColor: '#e51937', margin: '0 auto 2rem' }} />
          <p style={{ fontSize: '1.1rem', fontWeight: 300, color: 'rgba(255,255,255,0.75)', maxWidth: 680, margin: '0 auto 2.5rem', lineHeight: 1.8 }}>
            Connecté à Microsoft Business Central — tarification personnalisée pour les clients B2B, inventaire en temps réel et commande simplifiée.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/products"
              style={{ backgroundColor: '#e51937', color: '#fff', padding: '16px 40px', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', textDecoration: 'none', transition: 'background-color 0.2s' }}
              onMouseEnter={undefined}
            >
              Nos produits
            </Link>
            {!session && (
              <Link
                href="/auth/register"
                style={{ border: '2px solid #e51937', color: '#fff', padding: '14px 40px', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', textDecoration: 'none' }}
              >
                Créer un compte B2B
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── Business pricing banner ── */}
      {session?.user.businessCustomerId && (
        <div style={{ backgroundColor: '#e51937', borderBottom: '2px solid #c0112e' }}>
          <div className="container" style={{ paddingTop: '0.6rem', paddingBottom: '0.6rem' }}>
            <p style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 600, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Tarification B2B active — vos rabais personnalisés sont appliqués sur tous les produits.
            </p>
          </div>
        </div>
      )}

      {/* ── Categories ── */}
      {categories.length > 0 && (
        <section style={{ backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb', paddingTop: '3rem', paddingBottom: '3rem' }}>
          <div className="container">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#1f2232', marginBottom: '1.5rem' }}>
              Nos catégories
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <Link
                href="/products"
                style={{ backgroundColor: '#e51937', color: '#fff', padding: '8px 20px', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none' }}
              >
                Tous les produits
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat}
                  href={`/products?category=${encodeURIComponent(cat)}`}
                  style={{ backgroundColor: '#f3f4f6', color: '#1f2232', padding: '8px 20px', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none', border: '1px solid #e5e7eb' }}
                >
                  {cat}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Featured Products ── */}
      <section style={{ paddingTop: '4rem', paddingBottom: '4rem', backgroundColor: '#fff' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2.5rem', paddingBottom: '1rem', borderBottom: '3px solid #e51937' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1f2232', margin: 0 }}>
              Produits vedettes
            </h2>
            <Link
              href="/products"
              style={{ color: '#e51937', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none' }}
            >
              Voir tout →
            </Link>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product as any} />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: '#9ca3af' }}>
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p style={{ fontSize: '1rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Aucun produit pour l'instant</p>
              <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Les produits apparaîtront ici après la synchronisation avec Business Central.</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Features ── dark section avec bordures rouges, style DSF */}
      <section style={{ backgroundColor: '#1f2232', borderTop: '6px solid #e51937', borderBottom: '6px solid #e51937', paddingTop: '4rem', paddingBottom: '4rem' }}>
        <div className="container">
          <h2 style={{ fontSize: '1.3rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#fff', textAlign: 'center', marginBottom: '0.75rem' }}>
            Pourquoi choisir ShopBC ?
          </h2>
          <div style={{ width: 60, height: 5, backgroundColor: '#e51937', margin: '0 auto 3rem' }} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: '💼', title: 'Tarification B2B', desc: 'Listes de prix et rabais négociés pour les clients professionnels vérifiés.' },
              { icon: '🔄', title: 'Synchro BC temps réel', desc: 'Produits, inventaire et commandes synchronisés avec Microsoft Business Central.' },
              { icon: '🔒', title: 'Paiement sécurisé', desc: 'Propulsé par Stripe avec conformité PCI complète. Plusieurs modes de paiement.' },
            ].map((feat) => (
              <div key={feat.title} style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderTop: '3px solid #e51937', padding: '2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{feat.icon}</div>
                <h3 style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.08em', color: '#fff', marginBottom: '0.75rem' }}>{feat.title}</h3>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', fontWeight: 300, lineHeight: 1.7 }}>{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
