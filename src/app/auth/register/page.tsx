'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

type AccountType = 'personal' | 'business'

export default function RegisterPage() {
  const router = useRouter()

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
      setError('Passwords do not match.')
      return
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (accountType === 'business' && !form.companyName) {
      setError('Company name is required for business accounts.')
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

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed')
      }

      // Auto sign in after registration
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
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Créer un compte</h1>
            <p className="text-gray-500 mt-1 text-sm">Rejoignez DSF aujourd'hui</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Account type selector */}
            <div>
              <label className="form-label block mb-2">Account Type</label>
              <div className="grid grid-cols-2 gap-3">
                {(['personal', 'business'] as AccountType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setAccountType(type)}
                    className={`py-2.5 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${
                      accountType === type
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {type === 'personal' ? '👤 Personal' : '🏢 Business'}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Full Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="John Doe"
              required
            />

            <Input
              label="Email Address"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Minimum 8 characters"
              required
              autoComplete="new-password"
              helperText="Must be at least 8 characters"
            />

            <Input
              label="Confirm Password"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              placeholder="Repeat your password"
              required
              autoComplete="new-password"
            />

            {/* Business-specific fields */}
            {accountType === 'business' && (
              <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-amber-800">Business Information</p>
                <Input
                  label="Company Name"
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  placeholder="Acme Corporation"
                  required={accountType === 'business'}
                />
                <Input
                  label="VAT Number (optional)"
                  value={form.vatNumber}
                  onChange={(e) => setForm({ ...form, vatNumber: e.target.value })}
                  placeholder="GB123456789"
                />
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <Button type="submit" fullWidth size="lg" isLoading={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-primary-600 hover:text-primary-700 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
