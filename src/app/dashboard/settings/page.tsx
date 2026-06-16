'use client'

import { useEffect, useState, useRef } from 'react'
import { useSession } from 'next-auth/react'

// ─── Types ───────────────────────────────────────────────────────────────────

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
  site_password?: string
  resend_api_key?: string
  email_from?: string
}

type TestStatus = 'idle' | 'loading' | 'ok' | 'error'
type TotpSetupStatus = 'idle' | 'loading' | 'qr' | 'confirming' | 'done'

// ─── Rôle helpers ────────────────────────────────────────────────────────────

function useRole() {
  const { data: session } = useSession()
  const role = session?.user?.role ?? ''
  return {
    role,
    canEditCredentials: ['SUPER_ADMIN', 'ADMIN'].includes(role),
    canSync:            ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role),
    canEditSiteLock:    ['SUPER_ADMIN', 'ADMIN'].includes(role),
    canEditTOTP:        ['SUPER_ADMIN', 'ADMIN'].includes(role),
  }
}

// ─── Composants réutilisables ─────────────────────────────────────────────────

function SectionCard({ icon, title, subtitle, children, className = '' }: {
  icon: string; title: string; subtitle?: string; children: React.ReactNode; className?: string
}) {
  return (
    <section className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-5">
        <span className="text-xl">{icon}</span>
        <div>
          <h2 className="font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

function Field({ label, name, value, onChange, type = 'text', placeholder = '', hint = '', readOnly = false }: {
  label: string; name: string; value: string; onChange?: (n: string, v: string) => void
  type?: string; placeholder?: string; hint?: string; readOnly?: boolean
}) {
  const [show, setShow] = useState(false)
  const isSecret = type === 'password'
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input
          type={isSecret && !show ? 'password' : 'text'}
          value={value}
          readOnly={readOnly}
          onChange={e => onChange?.(name, e.target.value)}
          placeholder={placeholder}
          className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500
            ${readOnly ? 'bg-gray-50 text-gray-500 border-gray-100 cursor-not-allowed' : 'border-gray-200'}
            ${isSecret ? 'font-mono pr-16' : ''}`}
        />
        {isSecret && !readOnly && (
          <button type="button" onClick={() => setShow(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">
            {show ? 'Masquer' : 'Afficher'}
          </button>
        )}
      </div>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

function Toggle({ enabled, onChange, label, description }: {
  enabled: boolean; onChange: (v: boolean) => void; label: string; description: string
}) {
  return (
    <div className="flex items-start gap-4">
      <button type="button" role="switch" aria-checked={enabled} onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent
          transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500
          ${enabled ? 'bg-indigo-600' : 'bg-gray-200'}`}>
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow
          transition duration-200 ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
    </div>
  )
}

function StatusBadge({ status, okMsg, errMsg }: { status: TestStatus; okMsg: string; errMsg: string }) {
  if (status === 'idle') return null
  if (status === 'loading') return <span className="text-xs text-gray-500 animate-pulse">Test en cours…</span>
  if (status === 'ok')    return <span className="text-xs text-green-600 font-medium">✓ {okMsg}</span>
  return <span className="text-xs text-red-600 font-medium">✗ {errMsg}</span>
}

function SyncBtn({ url, label, onResult }: {
  url: string; label: string; onResult: (msg: string) => void
}) {
  const [loading, setLoading] = useState(false)
  async function run() {
    setLoading(true)
    try {
      const res = await fetch(url, { method: 'POST' })
      const d   = await res.json()
      onResult(res.ok ? `✓ ${d.message ?? label + ' terminé'}` : `✗ ${d.error ?? 'Erreur'}`)
    } catch { onResult('✗ Erreur réseau') }
    finally  { setLoading(false) }
  }
  return (
    <button onClick={run} disabled={loading}
      className="text-xs bg-gray-800 text-white rounded-lg px-3 py-1.5 hover:bg-gray-700 disabled:opacity-50 flex items-center gap-1.5">
      {loading && <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
      {loading ? 'En cours…' : label}
    </button>
  )
}

// ─── Section TOTP ─────────────────────────────────────────────────────────────

function TotpSection() {
  const [setupStatus, setSetupStatus] = useState<TotpSetupStatus>('idle')
  const [configured, setConfigured]   = useState<boolean | null>(null)
  const [qrDataUrl, setQrDataUrl]     = useState('')
  const [secret, setSecret]           = useState('')
  const [confirmCode, setConfirmCode] = useState('')
  const [confirmError, setConfirmError] = useState('')

  useEffect(() => {
    fetch('/api/admin/totp-setup')
      .then(r => r.json())
      .then(d => setConfigured(d.configured ?? false))
  }, [])

  async function generate() {
    setSetupStatus('loading')
    const d = await fetch('/api/admin/totp-setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'generate' }),
    }).then(r => r.json())
    setQrDataUrl(d.qrDataUrl); setSecret(d.secret); setSetupStatus('qr')
  }

  async function confirm() {
    setSetupStatus('confirming'); setConfirmError('')
    const d = await fetch('/api/admin/totp-setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirm', secret, code: confirmCode }),
    }).then(r => r.json())
    if (d.ok) { setConfigured(true); setSetupStatus('done') }
    else       { setConfirmError(d.error || 'Code incorrect'); setSetupStatus('qr') }
  }

  return (
    <SectionCard icon="🔐" title="Microsoft Authenticator (TOTP)"
      subtitle="Code à 6 chiffres pour déverrouiller le site">
      <div className="flex items-center justify-between mb-4">
        {configured !== null && (
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            configured ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {configured ? '✓ Configuré' : 'Non configuré'}
          </span>
        )}
      </div>

      {setupStatus === 'idle' && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {configured
              ? 'Un secret TOTP est enregistré. Regénère si nécessaire.'
              : 'Génère un QR code à scanner une fois dans Microsoft Authenticator.'}
          </p>
          <button onClick={generate}
            className="ml-4 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
            {configured ? 'Regénérer' : 'Configurer'}
          </button>
        </div>
      )}

      {setupStatus === 'loading' && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="inline-block w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          Génération…
        </div>
      )}

      {(setupStatus === 'qr' || setupStatus === 'confirming') && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 flex flex-col items-center gap-3">
            {qrDataUrl && <img src={qrDataUrl} alt="QR TOTP" className="w-48 h-48 rounded-lg" />}
            <p className="text-xs text-gray-500 text-center">
              Scanne dans <strong>Microsoft Authenticator</strong> → + → Autre compte
            </p>
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code de confirmation
              </label>
              <input type="text" inputMode="numeric" maxLength={6}
                value={confirmCode} onChange={e => setConfirmCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono w-32 focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <button onClick={confirm}
              disabled={confirmCode.length < 6 || setupStatus === 'confirming'}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
              Valider
            </button>
            <button onClick={() => setSetupStatus('idle')} className="text-sm text-gray-400 hover:text-gray-600 px-2">
              Annuler
            </button>
          </div>
          {confirmError && <p className="text-xs text-red-500">{confirmError}</p>}
        </div>
      )}

      {setupStatus === 'done' && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          ✓ Microsoft Authenticator configuré — le site utilise maintenant les codes TOTP.
        </div>
      )}
    </SectionCard>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { canEditCredentials, canSync, canEditSiteLock, canEditTOTP, role } = useRole()
  const [settings, setSettings] = useState<Settings>({})
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saveMsg, setSaveMsg]   = useState('')
  const [stripeStatus, setStripeStatus] = useState<TestStatus>('idle')
  const [stripeDetail, setStripeDetail] = useState('')
  const [bcStatus, setBcStatus] = useState<TestStatus>('idle')
  const [bcDetail, setBcDetail] = useState('')
  const [syncMsg, setSyncMsg]   = useState('')

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => { setSettings(d.settings ?? d ?? {}); setLoading(false) })
  }, [])

  function handleChange(name: string, value: string) {
    setSettings(s => ({ ...s, [name]: value }))
  }

  async function handleSave() {
    setSaving(true); setSaveMsg('')
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      })
      setSaveMsg(res.ok ? '✓ Sauvegardé' : '✗ Erreur de sauvegarde')
    } catch { setSaveMsg('✗ Erreur réseau') }
    finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(''), 3000)
    }
  }

  async function testStripe() {
    setStripeStatus('loading'); setStripeDetail('')
    try {
      const res = await fetch('/api/admin/settings/test-stripe', { method: 'POST' })
      const d   = await res.json()
      setStripeStatus(res.ok ? 'ok' : 'error')
      setStripeDetail(d.mode === 'live' ? 'Live mode' : d.error ?? (res.ok ? 'Test mode' : 'Échec'))
    } catch { setStripeStatus('error') }
  }

  async function testBC() {
    setBcStatus('loading'); setBcDetail('')
    try {
      const res = await fetch('/api/admin/settings/test-bc', { method: 'POST' })
      const d   = await res.json()
      setBcStatus(d.ok ? 'ok' : 'error')
      setBcDetail(d.message ?? (d.ok ? 'Connecté' : 'Échec'))
    } catch { setBcStatus('error') }
  }

  if (loading) return <div className="p-8 text-gray-400">Chargement…</div>

  const siteLockEnabled = settings.site_lock_enabled !== 'false'

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {canEditCredentials ? 'Gestion des intégrations et préférences du site' : 'Outils de synchronisation'}
          </p>
        </div>
        {canEditCredentials && (
          <div className="flex items-center gap-3">
            {saveMsg && <span className={`text-sm font-medium ${saveMsg.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>{saveMsg}</span>}
            <button onClick={handleSave} disabled={saving}
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Sauvegarde…' : 'Sauvegarder'}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-6">

        {/* ── TOTP — ADMIN+ seulement ── */}
        {canEditTOTP && <TotpSection />}

        {/* ── Accès au site — ADMIN+ ── */}
        {canEditSiteLock && (
          <SectionCard icon="🔒" title="Accès au site"
            subtitle="Contrôle si le site est protégé par mot de passe ou public">
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                siteLockEnabled ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
              }`}>
                {siteLockEnabled ? 'Protégé' : 'Public'}
              </span>
            </div>
            <Toggle
              enabled={siteLockEnabled}
              onChange={v => handleChange('site_lock_enabled', v ? 'true' : 'false')}
              label="Protection par mot de passe"
              description={siteLockEnabled
                ? 'Les visiteurs doivent entrer le mot de passe pour accéder au site.'
                : 'Le site est public — tout le monde peut y accéder.'}
            />
            <div className="mt-4 pt-4 border-t border-gray-100">
              <Field label="Mot de passe d'accès (fallback)"
                name="site_password" type="password"
                value={settings.site_password ?? ''}
                onChange={handleChange}
                hint="Utilisé si le TOTP n'est pas configuré. Modifiez et sauvegardez pour le changer." />
            </div>
          </SectionCard>
        )}

        {/* ── Général — ADMIN+ ── */}
        {canEditCredentials && (
          <SectionCard icon="🏪" title="Général" subtitle="Informations de base du magasin">
            <div className="space-y-4">
              <Field label="Nom du magasin" name="store_name" value={settings.store_name ?? ''} onChange={handleChange} placeholder="DSF" />
              <Field label="Email de contact" name="store_email" type="email" value={settings.store_email ?? ''} onChange={handleChange} placeholder="commandes@votremagasin.com" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Devise</label>
                <select value={settings.store_currency ?? 'CAD'}
                  onChange={e => handleChange('store_currency', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="CAD">CAD — Dollar canadien ($)</option>
                  <option value="EUR">EUR — Euro (€)</option>
                  <option value="USD">USD — Dollar américain ($)</option>
                  <option value="GBP">GBP — Livre sterling (£)</option>
                </select>
              </div>
            </div>
          </SectionCard>
        )}

        {/* ── Stripe — ADMIN+ ── */}
        {canEditCredentials && (
          <SectionCard icon="💳" title="Stripe Payments" subtitle="Paiements par carte de crédit">
            <div className="flex items-center gap-3 mb-4">
              <StatusBadge status={stripeStatus} okMsg={stripeDetail || 'Connecté'} errMsg={stripeDetail || 'Connexion échouée'} />
              <button onClick={testStripe} disabled={stripeStatus === 'loading'}
                className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                Tester la connexion
              </button>
            </div>
            <div className="space-y-4">
              <Field label="Clé publiable" name="stripe_publishable_key" value={settings.stripe_publishable_key ?? ''} onChange={handleChange} placeholder="pk_live_…" />
              <Field label="Clé secrète" name="stripe_secret_key" type="password" value={settings.stripe_secret_key ?? ''} onChange={handleChange} placeholder="sk_live_…" />
              <Field label="Secret webhook" name="stripe_webhook_secret" type="password" value={settings.stripe_webhook_secret ?? ''} onChange={handleChange} placeholder="whsec_…" hint="Depuis vos paramètres de webhook Stripe" />
            </div>
          </SectionCard>
        )}

        {/* ── Courriels (Resend) — ADMIN+ ── */}
        {canEditCredentials && (
          <SectionCard icon="📧" title="Courriels transactionnels"
            subtitle="Factures, confirmations de paiement et états de compte (via Resend)">
            <div className="space-y-4">
              <Field label="Clé API Resend" name="resend_api_key" type="password"
                value={settings.resend_api_key ?? ''} onChange={handleChange}
                placeholder="re_…"
                hint="Créez une clé sur resend.com → API Keys. Sans clé, aucun courriel n'est envoyé." />
              <Field label="Adresse expéditeur" name="email_from"
                value={settings.email_from ?? ''} onChange={handleChange}
                placeholder="DSF Distribution <factures@votredomaine.com>"
                hint="Le domaine doit être vérifié dans Resend. Format : Nom <courriel@domaine.com>" />
            </div>
          </SectionCard>
        )}

        {/* ── Business Central — crédentiels ADMIN+ / synchro MANAGER+ ── */}
        <SectionCard icon="🔷" title="Business Central" subtitle="Synchronisation produits, commandes et clients">
          {canEditCredentials && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <StatusBadge status={bcStatus} okMsg={bcDetail || 'Connecté'} errMsg={bcDetail || 'Connexion échouée'} />
                <button onClick={testBC} disabled={bcStatus === 'loading'}
                  className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                  Tester la connexion
                </button>
              </div>
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Tenant ID" name="bc_tenant_id" value={settings.bc_tenant_id ?? ''} onChange={handleChange} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
                  <Field label="Client ID" name="bc_client_id" value={settings.bc_client_id ?? ''} onChange={handleChange} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
                </div>
                <Field label="Client Secret" name="bc_client_secret" type="password" value={settings.bc_client_secret ?? ''} onChange={handleChange} placeholder="Secret de l'app registration Azure" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Environnement</label>
                    <select value={settings.bc_environment ?? 'sandbox'}
                      onChange={e => handleChange('bc_environment', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="sandbox">Sandbox</option>
                      <option value="production">Production</option>
                    </select>
                  </div>
                  <Field label="Company ID" name="bc_company_id" value={settings.bc_company_id ?? ''} onChange={handleChange} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
                </div>
              </div>
              <div className="border-t border-gray-100 pt-4" />
            </>
          )}

          {/* Boutons de synchro — tous les rôles canSync */}
          {canSync && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Synchronisation</p>
              {syncMsg && (
                <p className={`text-xs px-3 py-2 rounded-lg border ${
                  syncMsg.startsWith('✓') ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-700 bg-red-50 border-red-200'
                }`}>{syncMsg}</p>
              )}
              <div className="flex flex-wrap gap-2">
                <SyncBtn url="/api/admin/sync-bc" label="↻ Sync produits" onResult={setSyncMsg} />
                <SyncBtn url="/api/admin/sync-customers" label="↻ Sync clients" onResult={setSyncMsg} />
                <SyncBtn url="/api/admin/sync-orders" label="↻ Sync commandes" onResult={setSyncMsg} />
              </div>
            </div>
          )}
        </SectionCard>

      </div>

      {canEditCredentials && (
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-400">Les clés secrètes sont chiffrées. Assurez-vous que votre base de données est sécurisée.</p>
          <div className="flex items-center gap-3">
            {saveMsg && <span className={`text-sm font-medium ${saveMsg.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>{saveMsg}</span>}
            <button onClick={handleSave} disabled={saving}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Sauvegarde…' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
