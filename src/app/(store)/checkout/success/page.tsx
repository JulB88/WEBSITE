import Link from 'next/link'

export default function CheckoutSuccessPage() {
  return (
    <div className="container" style={{ paddingTop: '5rem', paddingBottom: '5rem' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
        {/* Checkmark */}
        <div style={{
          width: 80, height: 80,
          backgroundColor: '#f0fdf4',
          border: '3px solid #22c55e',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 2rem',
        }}>
          <svg style={{ width: 40, height: 40, color: '#16a34a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 style={{
          fontSize: 'clamp(1.4rem, 3vw, 1.9rem)',
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--brand-dark)',
          marginBottom: '0.6rem',
        }}>
          Commande confirmée !
        </h1>
        <div style={{ width: 56, height: 4, backgroundColor: 'var(--brand-primary)', margin: '0 auto 1.5rem' }} />

        <p style={{ fontSize: '0.95rem', fontWeight: 300, color: '#4b5563', lineHeight: 1.8, marginBottom: '0.75rem' }}>
          Merci pour votre commande. Votre paiement a été reçu et votre commande est en cours de traitement.
        </p>
        <p style={{ fontSize: '0.85rem', fontWeight: 300, color: '#6b7280', marginBottom: '2.5rem' }}>
          Un courriel de confirmation vous sera envoyé sous peu avec les détails de votre commande.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Link
            href="/account/orders"
            style={{
              display: 'block',
              backgroundColor: 'var(--brand-primary)', color: '#fff',
              padding: '14px 24px', fontWeight: 700,
              fontSize: '0.78rem', textTransform: 'uppercase',
              letterSpacing: '0.08em', textDecoration: 'none',
            }}
          >
            Voir mes commandes
          </Link>
          <Link
            href="/products"
            style={{
              display: 'block',
              border: '2px solid var(--brand-dark)', color: 'var(--brand-dark)',
              padding: '12px 24px', fontWeight: 700,
              fontSize: '0.78rem', textTransform: 'uppercase',
              letterSpacing: '0.08em', textDecoration: 'none',
            }}
          >
            Continuer mes achats
          </Link>
        </div>
      </div>
    </div>
  )
}
