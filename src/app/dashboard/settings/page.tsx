'use client'

import { useEffect, useState } from 'react'

interface Settings {
  stripe_publishable_key?: string
  stripe_secret_key?: string
  stripe_webhook_secret?: string
  bc_tenant_id?: string
  bc_client_id?: string
  bc_client_secret?: string
  bc_environment?: string
  bc_company_id?: string
  store_name?: string
  store_currency?: string
  store_email?: string
  site_lock_enabled?: string
}

type TestStatus = 'idle' | 'loading' | 'ok' | 'error'

function Field({ label, name, value, onChange, type = 'text', placeholder = '', hint = '' }: {
  label: string; name: string; value: string; onChange: (n: string, v: string) => void
  type?: string; placeholder?: string; hint?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

function StatusBadge({ status, okMsg, errMsg }: { status: TestStatus; okMsg: string; errMsg: string }) {
  if (status === 'idle') return null
  if (status === 'loading') return <span className="text-xs text-gray-500 animate-pulse">Testing…</span>
  if (status === 'ok') return <span className="text-xs text-green-600 font-medium">✓ {okMsg}</span>
  return <span className="text-xs text-red-600 font-medium">✗ {errMsg}</span>
}

function Toggle({ enabled, onChange, label, description }: {
  enabled: boolean
  onChange: (v: boolean) => void
  label: string
  description: string
}) {
  return (
    <div className="flex items-start gap-4">
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
          ${enabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
      >
        <span
          aria-hidden="true"
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
            transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
    </div>
  )
}

export default function DashboardSettingsPage() {
  const [settings, setSettings] = useState<Settings>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [stripeStatus, setStripeStatus] = useState<TestStatus>('idle')
  const [stripeDetail, setStripeDetail] = useState('')
  const [bcStatus, setBcStatus] = useState<TestStatus>('idle')
  const [bcDetail, setBcDetail] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState('')

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => { setSettings(d.settings ?? d ?? {}); setLoading(false) })
  }, [])

  function handleChange(name: string, value: string) {
    setSettings(s => ({ ...s, [name]: value }))
  }

  function handleToggle(name: string, value: boolean) {
    setSettings(s => ({ ...s, [name]: value ? 'true' : 'false' }))
  }

  async function handleSave() {
    setSaving(true)
    setSaveMsg('')
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      })
      setSaveMsg(res.ok ? '✓ Sauvegardé' : '✗ Erreur de sauvegarde')
    } catch {
      setSaveMsg('✗ Erreur réseau')
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(''), 3000)
    }
  }

  async function testStripe() {
    setStripeStatus('loading')
    setStripeDetail('')
    try {
      const res = await fetch('/api/admin/settings/test-stripe', { method: 'POST' })
      const d = await res.json()
      if (res.ok) { setStripeStatus('ok'); setStripeDetail(d.mode === 'live' ? 'Live mode' : 'Test mode') }
      else { setStripeStatus('error'); setStripeDetail(d.error ?? '') }
    } catch { setStripeStatus('error') }
  }

  async function testBC() {
    setBcStatus('loading')
    setBcDetail('')
    try {
      const res = await fetch('/api/admin/settings/test-bc', { method: 'POST' })
      const d = await res.json()
      if (res.ok) { setBcStatus('ok'); setBcDetail(d.company ? `Company: ${d.company}` : 'Connected') }
      else { setBcStatus('error'); setBcDetail(d.error ?? '') }
    } catch { setBcStatus('error') }
  }

  async function syncBC() {
    setSyncing(true)
    setSyncResult('')
    try {
      const res = await fetch('/api/admin/sync-bc', { method: 'POST' })
      const d = await res.json()
      setSyncResult(res.ok ? `✓ Synced ${d.count ?? 0} products` : `✗ ${d.error ?? 'Failed'}`)
    } finally {
      setSyncing(false)
    }
  }

  if (loading) return <div className="p-8 text-gray-400">Chargement…</div>

  const siteLockEnabled = settings.site_lock_enabled !== 'false'

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Configure integrations and store preferences</p>
      </div>

      <div className="space-y-6">

        {/* ── Site Access ─────────────────────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-base font-semibold text-gray-900">Accès au site</h2>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              siteLockEnabled
                ? 'bg-amber-100 text-amber-700'
                : 'bg-green-100 text-green-700'
            }`}>
              {siteLockEnabled ? 'Protégé' : 'Public'}
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-5">
            Contrôle si le site est accessible au public ou protégé par un mot de passe.
          </p>
          <Toggle
            enabled={siteLockEnabled}
            onChange={(v) => handleToggle('site_lock_enabled', v)}
            label="Protection par mot de passe activée"
            description={
              siteLockEnabled
                ? 'Les visiteurs doivent entrer le mot de passe pour accéder au site.'
                : 'Le site est public — tout le monde peut y accéder sans mot de passe.'
            }
          />
          {!siteLockEnabled && (
            <div className="mt-4 flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
              <svg className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-green-700">
                Le site sera accessible sans mot de passe. Assurez-vous que le contenu est prêt à être publié.
              </p>
            </div>
          )}
          {siteLockEnabled && (
            <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <p className="text-xs text-amber-700">
                Les visiteurs seront redirigés vers la page de connexion. Seuls ceux avec le mot de passe peuvent voir le site.
              </p>
            </div>
          )}
        </section>

        {/* ── General ─────────────────────────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">General</h2>
          <div className="space-y-4">
            <Field label="Store Name" name="store_name" value={settings.store_name ?? ''} onChange={handleChange} placeholder="DSF" />
            <Field label="Store Email" name="store_email" value={settings.store_email ?? ''} onChange={handleChange} type="email" placeholder="orders@yourstore.com" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select
                value={settings.store_currency ?? 'EUR'}
                onChange={(e) => handleChange('store_currency', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="EUR">EUR — Euro (€)</option>
                <option value="GBP">GBP — British Pound (£)</option>
                <option value="USD">USD — US Dollar ($)</option>
                <option value="CAD">CAD — Dollar canadien ($)</option>
              </select>
            </div>
          </div>
        </section>

        {/* ── Stripe ──────────────────────────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Stripe Payments</h2>
            <div className="flex items-center gap-3">
              <StatusBadge status={stripeStatus} okMsg={stripeDetail || 'Connected'} errMsg={stripeDetail || 'Connection failed'} />
              <button onClick={testStripe} disabled={stripeStatus === 'loading'}
                className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                Test connection
              </button>
            </div>
          </div>
          <div className="space-y-4">
            <Field label="Publishable Key" name="stripe_publishable_key" value={settings.stripe_publishable_key ?? ''} onChange={handleChange} placeholder="pk_live_…" />
            <Field label="Secret Key" name="stripe_secret_key" value={settings.stripe_secret_key ?? ''} onChange={handleChange} type="password" placeholder="sk_live_…" />
            <Field label="Webhook Secret" name="stripe_webhook_secret" value={settings.stripe_webhook_secret ?? ''} onChange={handleChange} type="password" placeholder="whsec_…"
              hint="From your Stripe webhook endpoint settings" />
          </div>
        </section>

        {/* ── Business Central ─────────────────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Business Central</h2>
            <div className="flex items-center gap-3">
              <StatusBadge status={bcStatus} okMsg={bcDetail || 'Connected'} errMsg={bcDetail || 'Connection failed'} />
              <button onClick={testBC} disabled={bcStatus === 'loading'}
                className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                Test connection
              </button>
              <button onClick={syncBC} disabled={syncing}
                className="text-xs bg-gray-800 text-white rounded-lg px-3 py-1.5 hover:bg-gray-700 disabled:opacity-50">
                {syncing ? 'Syncing…' : '↻ Sync Now'}
              </button>
            </div>
          </div>
          {syncResult && <p className={`text-xs mb-3 ${syncResult.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>{syncResult}</p>}
          <div className="space-y-4">
            <Field label="Tenant ID" name="bc_tenant_id" value={settings.bc_tenant_id ?? ''} onChange={handleChange} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
            <Field label="Client ID" name="bc_client_id" value={settings.bc_client_id ?? ''} onChange={handleChange} placeholder="App registration client ID" />
            <Field label="Client Secret" name="bc_client_secret" value={settings.bc_client_secret ?? ''} onChange={handleChange} type="password" placeholder="App registration secret" />
            <Field label="Environment" name="bc_environment" value={settings.bc_environment ?? ''} onChange={handleChange} placeholder="production" />
            <Field label="Company ID" name="bc_company_id" value={settings.bc_company_id ?? ''} onChange={handleChange} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
          </div>
        </section>

      </div>

      {/* ── Save ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
        <p className="text-xs text-gray-400">Les clés secrètes sont masquées. Assurez-vous que votre base de données est chiffrée.</p>
        <div className="flex items-center gap-3">
          {saveMsg && <span className={`text-sm font-medium ${saveMsg.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>{saveMsg}</span>}
          <button onClick={handleSave} disabled={saving}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Sauvegarde…' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  )
}
