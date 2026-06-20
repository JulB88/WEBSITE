export default function Loading() {
  return (
    <div style={{
      minHeight: '70vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 48, height: 48,
          border: '4px solid #e5e7eb',
          borderTopColor: 'var(--brand-primary)',
          borderRadius: '50%',
          margin: '0 auto 1rem',
          animation: 'spin 0.7s linear infinite',
        }} />
        <p style={{
          fontSize: '0.72rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: '#9ca3af',
        }}>
          Chargement…
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )
}
