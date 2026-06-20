import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '70vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '2rem',
      backgroundColor: '#fff',
    }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <span style={{
          display: 'inline-block',
          backgroundColor: 'var(--brand-primary)',
          color: '#fff',
          fontWeight: 900,
          fontSize: '4rem',
          lineHeight: 1,
          padding: '0.5rem 1.5rem',
          letterSpacing: '-0.02em',
        }}>404</span>
      </div>
      <h1 style={{
        fontSize: 'clamp(1.3rem, 3vw, 1.8rem)',
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'var(--brand-dark)',
        marginBottom: '0.75rem',
      }}>
        Page introuvable
      </h1>
      <div style={{ width: 56, height: 4, backgroundColor: 'var(--brand-primary)', margin: '0 auto 1.5rem' }} />
      <p style={{ fontSize: '0.95rem', fontWeight: 300, color: '#6b7280', maxWidth: 480, lineHeight: 1.8, marginBottom: '2rem' }}>
        La page que vous recherchez n&apos;existe pas ou a été déplacée.
        Vérifiez l&apos;URL ou retournez à l&apos;accueil.
      </p>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link
          href="/"
          style={{
            backgroundColor: 'var(--brand-primary)', color: '#fff',
            padding: '12px 32px', fontWeight: 700,
            fontSize: '0.78rem', textTransform: 'uppercase',
            letterSpacing: '0.08em', textDecoration: 'none',
          }}
        >
          Accueil
        </Link>
        <Link
          href="/products"
          style={{
            border: '2px solid var(--brand-dark)', color: 'var(--brand-dark)',
            padding: '10px 32px', fontWeight: 700,
            fontSize: '0.78rem', textTransform: 'uppercase',
            letterSpacing: '0.08em', textDecoration: 'none',
          }}
        >
          Nos produits
        </Link>
      </div>
    </div>
  )
}
