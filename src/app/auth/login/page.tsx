'use client'

import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

// useSearchParams must be inside a Suspense boundary in Next.js 14
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
        setError('Invalid email or password. Please try again.')
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="bg-primary-600 text-white rounded-xl w-12 h-12 flex items-center justify-center font-bold text-lg mx-auto mb-3">
          BC
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Sign in to ShopBC</h1>
        <p className="text-gray-500 mt-1 text-sm">Enter your credentials to access your account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email address"
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
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <Button type="submit" fullWidth size="lg" isLoading={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="text-primary-600 hover:text-primary-700 font-medium">
            Register here
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <Suspense fallback={
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 animate-pulse">
            <div className="h-12 w-12 bg-gray-200 rounded-xl mx-auto mb-4" />
            <div className="h-6 bg-gray-200 rounded w-3/4 mx-auto mb-8" />
            <div className="space-y-4">
              <div className="h-10 bg-gray-200 rounded" />
              <div className="h-10 bg-gray-200 rounded" />
              <div className="h-12 bg-gray-200 rounded" />
            </div>
          </div>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
