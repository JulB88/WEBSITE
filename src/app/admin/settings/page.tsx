'use client'

import { useEffect, useState } from 'react'

interface Settings {
  // Stripe
  stripe_publishable_key?: string
  stripe_secret_key?: string
  stripe_webhook_secret?: string
  // Business Central
  bc_tenant_id?: string
  bc_client_id?: string
  bc_client_secret?: string
  bc_environment?: string
  bc_company_id?: string
  // General
  store_name?: string
  store_currency?: string
  store_email?: string
}

type TestStatus = 'idle' | 'loading' | 'ok' | 'error'

function Field({
  label, name, value, onChange, type = 'text', placeholder = '', hint = '',
}: {
  label: string
  name: string
  value: string
  onChange: (name: string, value: string) => void
  type?: string
  placeholder?: string
  hint?: string
}) {
  const [show, setShow] = useState(false)
  const isSecret = type === 'password'

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <input
          type={isSecret && !show ? 'password' : 'text'}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(name, e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-16 font-mono"
        />
        {isSecret && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
          >
            {show ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

function StatusBadge({ status, message }: { status: TestStatus; message: string }) {
  if (status === 'idle') return null
  if (status === 'loading') return (
    <span className="text-xs text-gray-500 flex items-center gap-1">
      <span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      Testing…
    </span>
  )
  if (status === 'ok') return <span className="text-xs text-green-600 font-medium">✓ {message}</span>
  return <span className="text-xs text-red-600 font-medium">✗ {message}</span>
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    stripe_publishable_key: '', stripe_secret_key: '', stripe_webhook_secret: '',
    bc_tenant_id: '', bc_client_id: '', bc_client_secret: '', bc_environment: 'production', bc_company_id: '',
    store_name: 'ShopBC', store_currency: 'EUR', store_email: '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [stripeStatus, setStripeStatus] = useState<TestStatus>('idle')
  const [stripeMsg, setStripeMsg] = useState('')
  const [bcStatus, setBcStatus] = useState<TestStatus>('idle')
  const [bcMsg, setBcMsg] = useState('')

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((data) => setSettings((prev) => ({ ...prev, ...data })))
  }, [])

  function handleChange(name: string, value: string) {
    setSettings((prev) => ({ ...prev, [name]: value }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaved(true)
    } catch {
      alert('Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function testStripe() {
    setStripeStatus('loading')
    const res = await fetch('/api/admin/settings/test-stripe', { method: 'POST' })
    const data = await res.json()
    setStripeStatus(data.ok ? 'ok' : 'error')
    setStripeMsg(data.message)
  }

  async function testBC() {
    setBcStatus('loading')
    const res = await fetch('/api/admin/settings/test-bc', { method: 'POST' })
    const data = await res.json()
    setBcStatus(data.ok ? 'ok' : 'error')
    setBcMsg(data.message)
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Configure integrations and store preferences</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            <>
              <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving…
            </>
          ) : saved ? '✓ Saved' : 'Save Changes'}
        </button>
      </div>

      <div className="space-y-6">

        {/* ── General ── */}
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center text-lg">🏪</div>
            <div>
              <h2 className="font-semibold text-gray-900">General</h2>
              <p className="text-xs text-gray-500">Basic store information</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Store Name" name="store_name" value={settings.store_name || ''} onChange={handleChange} placeholder="ShopBC" />
            <Field label="Contact Email" name="store_email" value={settings.store_email || ''} onChange={handleChange} placeholder="shop@example.com" />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Currency</label>
              <select
                value={settings.store_currency || 'EUR'}
                onChange={(e) => handleChange('store_currency', e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="EUR">EUR — Euro (€)</option>
                <option value="USD">USD — US Dollar ($)</option>
                <option value="GBP">GBP — British Pound (£)</option>
                <option value="CAD">CAD — Canadian Dollar ($)</option>
                <option value="CHF">CHF — Swiss Franc (Fr)</option>
              </select>
            </div>
          </div>
        </section>

        {/* ── Stripe ── */}
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center">
                <svg viewBox="0 0 28 28" className="w-5 h-5"><path fill="#6772E5" d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/></svg>
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Stripe Payments</h2>
                <p className="text-xs text-gray-500">Accept credit card payments</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={stripeStatus} message={stripeMsg} />
              <button
                onClick={testStripe}
                disabled={stripeStatus === 'loading'}
                className="text-sm border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Test Connection
              </button>
            </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 mb-4 text-xs text-indigo-700">
            Get your keys from{' '}
            <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noreferrer" className="underline font-medium">
              dashboard.stripe.com/apikeys
            </a>
            . Use test keys (starting with <code>pk_test_</code>) while developing.
          </div>

          <div className="space-y-4">
            <Field
              label="Publishable Key"
              name="stripe_publishable_key"
              value={settings.stripe_publishable_key || ''}
              onChange={handleChange}
              placeholder="pk_test_..."
              hint="Safe to expose — used in the browser to load Stripe.js"
            />
            <Field
              label="Secret Key"
              name="stripe_secret_key"
              value={settings.stripe_secret_key || ''}
              onChange={handleChange}
              type="password"
              placeholder="sk_test_..."
              hint="Keep this private — never share or expose client-side"
            />
            <Field
              label="Webhook Secret"
              name="stripe_webhook_secret"
              value={settings.stripe_webhook_secret || ''}
              onChange={handleChange}
              type="password"
              placeholder="whsec_..."
              hint="From Stripe Dashboard → Webhooks. Required for order confirmation."
            />
          </div>
        </section>

        {/* ── Business Central ── */}
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#0078D4"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Microsoft Business Central</h2>
                <p className="text-xs text-gray-500">Sync products and push sales orders</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={bcStatus} message={bcMsg} />
              <button
                onClick={testBC}
                disabled={bcStatus === 'loading'}
                className="text-sm border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Test Connection
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4 text-xs text-blue-700">
            Register an app in{' '}
            <a href="https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps" target="_blank" rel="noreferrer" className="underline font-medium">
              Azure Active Directory
            </a>
            {' '}with API permission <strong>Dynamics 365 Business Central → API.ReadWrite.All</strong>, then paste the credentials below.
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Tenant ID" name="bc_tenant_id" value={settings.bc_tenant_id || ''} onChange={handleChange} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
              <Field label="Client ID" name="bc_client_id" value={settings.bc_client_id || ''} onChange={handleChange} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
            </div>
            <Field
              label="Client Secret"
              name="bc_client_secret"
              value={settings.bc_client_secret || ''}
              onChange={handleChange}
              type="password"
              placeholder="Your Azure app client secret"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Environment</label>
                <select
                  value={settings.bc_environment || 'production'}
                  onChange={(e) => handleChange('bc_environment', e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="production">Production</option>
                  <option value="sandbox">Sandbox</option>
                </select>
              </div>
              <Field label="Company ID" name="bc_company_id" value={settings.bc_company_id || ''} onChange={handleChange} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Sync Products from BC</p>
              <p className="text-xs text-gray-500 mt-0.5">Pull your item catalogue from Business Central into the store</p>
            </div>
            <button
              onClick={async () => {
                const res = await fetch('/api/admin/sync-bc', { method: 'POST' })
                const data = await res.json()
                alert(data.count != null ? `✓ Synced ${data.count} products` : data.error || 'Sync failed')
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Sync Now
            </button>
          </div>
        </section>

      </div>

      <p className="text-xs text-gray-400 mt-6 text-center">
        Settings are saved to the database. Secret keys are masked on screen. For production, ensure your database itself is encrypted at the infrastructure level.
      </p>
    </div>
  )
}
