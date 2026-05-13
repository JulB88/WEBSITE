'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

type AccountType = 'personal' | 'business'
type AccountRequestType = 'new_request' | 'existing_unknown'

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
    customerNo: '',
  })
  // Whether the user checked "I don't have a customer number"
  const [noCustomerNo, setNoCustomerNo] = useState(false)
  // What the user wants to do when they have no customer number
  const [accountRequestType, setAccountRequestType] = useState<AccountRequestType>('new_request')

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
    if (accountType === 'business' && !form.companyName.trim()) {
      setError("Le nom de l'entreprise est requis pour les comptes entrepreneur.")
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
          customerNo: noCustomerNo ? '' : form.customerNo,
          accountRequestType: noCustomerNo ? accountRequestType : null,
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

  const s = {
    wrap: { minHeight: 'calc(100vh - 4rem)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', backgroundColor: '#f3f4f6' } as React.CSSProperties,
    card: { width: '100%', maxWidth: 520 } as React.CSSProperties,
    inner: { backgroundColor: '#fff', border: '1px solid #e5e7eb', borderTop: '4px solid #e51937', padding: '2.5rem' } as React.CSSProperties,
    label: { display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#374151', marginBottom: '0.5rem' },
  }

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.inner}>
          {/* Header */}
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
            {/* Account type selector */}
            <div>
              <label style={s.label}>{t('register_account_type')}</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {(['personal', 'business'] as AccountType[]).map((type) => {
                  const active = accountType === type
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setAccountType(type)}
                      aria-pressed={active}
                      style={{
                        padding: '0.75rem 1rem',
                        border: `2px solid ${active ? '#e51937' : '#d1d5db'}`,
                        backgroundColor: active ? '#fff5f6' : '#fff',
                        color: active ? '#e51937' : '#6b7280',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      <span style={{ fontSize: '1.25rem' }}>{type === 'personal' ? '👤' : '🏗️'}</span>
                      {type === 'personal' ? t('register_personal') : t('register_business')}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Common fields */}
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

            {/* Entrepreneur section */}
            {accountType === 'business' && (
              <div style={{ border: '1px solid #e0e7ff', backgroundColor: '#f5f7ff', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderRadius: '4px' }}>
                {/* Section title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1rem' }}>🏗️</span>
                  <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#3730a3', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Compte entrepreneur
                  </p>
                </div>

                {/* Company name */}
                <Input
                  label={t('register_company')}
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  placeholder="Construction Tremblay inc."
                  required
                />

                {/* VAT */}
                <Input
                  label={t('register_vat')}
                  value={form.vatNumber}
                  onChange={(e) => setForm({ ...form, vatNumber: e.target.value })}
                  placeholder="Ex. 123456789 RT0001"
                />

                {/* Customer number */}
                {!noCustomerNo && (
                  <Input
                    label={t('register_customer_no')}
                    value={form.customerNo}
                    onChange={(e) => setForm({ ...form, customerNo: e.target.value })}
                    placeholder="Ex. C-00123"
                    helperText={t('register_customer_no_hint')}
                  />
                )}

                {/* "I don't have a customer number" checkbox */}
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={noCustomerNo}
                    onChange={(e) => {
                      setNoCustomerNo(e.target.checked)
                      if (e.target.checked) setForm((f) => ({ ...f, customerNo: '' }))
                    }}
                    style={{ marginTop: '2px', accentColor: '#4338ca', width: '15px', height: '15px', flexShrink: 0 }}
                  />
                  <span style={{ fontSize: '0.82rem', color: '#4338ca', fontWeight: 600 }}>
                    {t('register_no_customer_no')}
                  </span>
                </label>

                {/* Account request options (shown only when checkbox is checked) */}
                {noCustomerNo && (
                  <div style={{ backgroundColor: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: '4px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#5b21b6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {t('register_account_request_label')}
                    </p>

                    {(['new_request', 'existing_unknown'] as AccountRequestType[]).map((opt) => {
                      const active = accountRequestType === opt
                      return (
                        <label
                          key={opt}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.75rem',
                            padding: '0.75rem',
                            border: `2px solid ${active ? '#7c3aed' : '#ddd6fe'}`,
                            backgroundColor: active ? '#fff' : 'transparent',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="radio"
                            name="accountRequestType"
                            value={opt}
                            checked={active}
                            onChange={() => setAccountRequestType(opt)}
                            style={{ marginTop: '2px', accentColor: '#7c3aed', flexShrink: 0 }}
                          />
                          <div>
                            <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#3b0764' }}>
                              {opt === 'new_request'
                                ? t('register_account_request_new')
                                : t('register_account_request_existing')}
                            </p>
                            <p style={{ fontSize: '0.75rem', color: '#6d28d9', marginTop: '0.15rem' }}>
                              {opt === 'new_request'
                                ? 'Notre équipe examinera votre demande et vous contactera.'
                                : 'Nous retrouverons votre compte existant et vous enverrons votre numéro.'}
                            </p>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '0.75rem', borderRadius: '4px' }} role="alert">
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
