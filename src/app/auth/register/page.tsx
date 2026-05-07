'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

type AccountType = 'personal' | 'business'

export default function RegisterPage() {
  const router = useRouter()
  const { t } = useI18n()

  const [accountType, setAccountType] = useState<AccountType>('personal')
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    vatNumber: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (form.password !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    if (form.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (accountType === 'business' && !form.companyName) {
      setError("Le nom de l'entreprise est requis pour les comptes B2B.")
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          accountType,
          companyName: form.companyName,
          vatNumber: form.vatNumber,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Inscription échouée.')

      const signInResult = await signIn('credentials', {
        redirect: false,
        email: form.email,
        password: form.password,
      })

      if (signInResult?.ok) {
        router.push('/account')
        router.refresh()
      } else {
        router.push('/auth/login')
      }
    } catch (err: any) {
      setError(err.message || 'Inscription échouée. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 4rem)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', backgroundColor: '#f3f4f6' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderTop: '4px solid #e51937', padding: '2.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1f2232' }}>
              {t('register_title')}
            </h1>
            <div style={{ width: 40, height: 3, backgroundColor: '#e51937', margin: '0.6rem auto 0.75rem' }} />
            <p style={{ fontSize: '0.85rem', fontWeight: 300, color: '#6b7280' }}>
              {t('register_sub')}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Account type */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#374151', marginBottom: '0.5rem' }}>
                {t('register_account_type')}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {(['personal', 'business'] as AccountType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setAccountType(type)}
                    aria-pressed={accountType === type}
                    style={{
                      padding: '0.65rem 1rem',
                      border: `2px solid ${accountType === type ? '#e51937' : '#d1d5db'}`,
                      backgroundColor: accountType === type ? '#fff5f6' : '#fff',
                      color: accountType === type ? '#e51937' : '#6b7280',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      cursor: 'pointer',
                    }}
                  >
                    {type === 'personal' ? t('register_personal') : t('register_business')}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label={t('register_name')}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Jean Tremblay"
              required
              autoComplete="name"
            />
            <Input
              label={t('register_email')}
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="vous@exemple.com"
              required
              autoComplete="email"
            />
            <Input
              label={t('register_password')}
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Minimum 8 caractères"
              required
              autoComplete="new-password"
              helperText={t('register_password_hint')}
            />
            <Input
              label={t('register_confirm')}
              type="password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              placeholder="Répétez votre mot de passe"
              required
              autoComplete="new-password"
            />

            {accountType === 'business' && (
              <div style={{ border: '1px solid #fde68a', backgroundColor: '#fffbeb', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {t('account_business')}
                </p>
                <Input
                  label={t('register_company')}
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  placeholder="Construction Tremblay inc."
                  required={accountType === 'business'}
                />
                <Input
                  label={t('register_vat')}
                  value={form.vatNumber}
                  onChange={(e) => setForm({ ...form, vatNumber: e.target.value })}
                  placeholder="Ex. 123456789 RT0001"
                />
              </div>
            )}

            {error && (
              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '0.75rem' }} role="alert">
                <p style={{ color: '#b91c1c', fontSize: '0.875rem' }}>{error}</p>
              </div>
            )}

            <Button type="submit" fullWidth size="lg" isLoading={loading}>
              {loading ? t('register_submitting') : t('register_submit')}
            </Button>
          </form>

          <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: '#6b7280' }}>
            {t('register_has_account')}{' '}
            <Link href="/auth/login" style={{ color: '#e51937', fontWeight: 600, textDecoration: 'none' }}>
              {t('register_login')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
