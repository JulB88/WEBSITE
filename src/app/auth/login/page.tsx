'use client'

import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email: form.email,
        password: form.password,
      })

      if (result?.error) {
        setError('Courriel ou mot de passe invalide. Veuillez réessayer.')
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderTop: '4px solid #e51937', padding: '2.5rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1f2232' }}>
          Connexion
        </h1>
        <div style={{ width: 40, height: 3, backgroundColor: '#e51937', margin: '0.6rem auto 0.75rem' }} />
        <p style={{ fontSize: '0.85rem', fontWeight: 300, color: '#6b7280' }}>
          Accédez à votre espace client DSF
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Input
          label="Adresse courriel"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="vous@exemple.com"
          required
          autoComplete="email"
        />
        <Input
          label="Mot de passe"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />

        {error && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '0.75rem' }} role="alert">
            <p style={{ color: '#b91c1c', fontSize: '0.875rem' }}>{error}</p>
          </div>
        )}

        <Button type="submit" fullWidth size="lg" isLoading={loading}>
          {loading ? 'Connexion…' : 'Se connecter'}
        </Button>
      </form>

      <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: '#6b7280' }}>
        Pas encore de compte ?{' '}
        <Link href="/auth/register" style={{ color: '#e51937', fontWeight: 600, textDecoration: 'none' }}>
          Créer un compte
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div style={{ minHeight: 'calc(100vh - 4rem)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', backgroundColor: '#f3f4f6' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <Suspense fallback={
          <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', padding: '2.5rem', textAlign: 'center' }}>
            <div style={{ width: 40, height: 4, backgroundColor: '#e5e7eb', margin: '0 auto 1rem', borderRadius: 2 }} />
            <div style={{ height: 200, backgroundColor: '#f3f4f6' }} />
          </div>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
