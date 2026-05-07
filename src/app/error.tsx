'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

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
          backgroundColor: '#1f2232',
          color: '#fff',
          fontWeight: 900,
          fontSize: '4rem',
          lineHeight: 1,
          padding: '0.5rem 1.5rem',
          letterSpacing: '-0.02em',
        }}>500</span>
      </div>
      <h1 style={{
        fontSize: 'clamp(1.3rem, 3vw, 1.8rem)',
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: '#1f2232',
        marginBottom: '0.75rem',
      }}>
        Une erreur est survenue
      </h1>
      <div style={{ width: 56, height: 4, backgroundColor: '#e51937', margin: '0 auto 1.5rem' }} />
      <p style={{ fontSize: '0.95rem', fontWeight: 300, color: '#6b7280', maxWidth: 480, lineHeight: 1.8, marginBottom: '2rem' }}>
        Quelque chose s&apos;est mal passé. Notre équipe a été notifiée.
        Vous pouvez réessayer ou revenir à l&apos;accueil.
        {error.digest && (
          <span style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.75rem', color: '#9ca3af' }}>
            Réf. : {error.digest}
          </span>
        )}
      </p>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={reset}
          style={{
            backgroundColor: '#e51937', color: '#fff',
            padding: '12px 32px', fontWeight: 700,
            fontSize: '0.78rem', textTransform: 'uppercase',
            letterSpacing: '0.08em', border: 'none', cursor: 'pointer',
          }}
        >
          Réessayer
        </button>
        <a
          href="/"
          style={{
            border: '2px solid #1f2232', color: '#1f2232',
            padding: '10px 32px', fontWeight: 700,
            fontSize: '0.78rem', textTransform: 'uppercase',
            letterSpacing: '0.08em', textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Accueil
        </a>
      </div>
    </div>
  )
}
