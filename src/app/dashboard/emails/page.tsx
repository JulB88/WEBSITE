'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import RichEmailEditor from '@/components/dashboard/RichEmailEditor'
import TestSendButton from '@/components/dashboard/TestSendButton'

const VAR_LABELS: Record<string, string> = {
  companyName: 'Nom entreprise', customerName: 'Nom client', invoiceNo: 'N° facture',
  orderId: 'N° commande', date: 'Date', total: 'Total', paymentMethodLabel: 'Mode de paiement',
  amountPaid: 'Montant reçu', paidAmount: 'Déjà payé', remaining: 'Solde restant',
  statusLabel: 'Statut', period: 'Période', totalBilled: 'Total facturé',
  totalPaid: 'Total payé', balance: 'Solde', creditLimit: 'Limite de crédit',
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface Template {
  id: string
  systemKey: string | null
  name: string
  subject: string
  bodyHtml: string
}
interface Trigger {
  id: string
  event: string
  templateId: string | null
  enabled: boolean
}
interface EventMeta {
  event: string
  label: string
  description: string
  vars: string[]
}

// ─── Données d'exemple pour l'aperçu client (mirroir de EmailService) ─────────

const SAMPLE_SCALARS: Record<string, Record<string, string>> = {
  purchase_invoice: {
    companyName: 'Construction Tremblay inc.', customerName: 'Jean Tremblay',
    invoiceNo: 'FAC-202606-A1B2C3', orderId: 'cmexempleorder123',
    date: '2026-06-15', total: '163.40 $', paymentMethodLabel: 'Portée au compte — une facture finale suivra',
  },
  final_invoice: {
    companyName: 'Construction Tremblay inc.', customerName: 'Jean Tremblay',
    invoiceNo: 'FAC-202606-A1B2C3', orderId: 'cmexempleorder123', date: '2026-06-15', total: '163.40 $',
  },
  payment_confirmation: {
    companyName: 'Construction Tremblay inc.', customerName: 'Jean Tremblay',
    invoiceNo: 'FAC-202606-A1B2C3', amountPaid: '100.00 $', total: '163.40 $',
    paidAmount: '100.00 $', remaining: '63.40 $', statusLabel: 'Paiement partiel',
  },
  monthly_statement: {
    companyName: 'Construction Tremblay inc.', customerName: 'Jean Tremblay', period: '2026-05',
    totalBilled: '339.95 $', totalPaid: '100.00 $', balance: '239.95 $', creditLimit: '1000.00 $',
  },
}

interface Brand {
  nameShort: string; nameLegal: string; tagline: string; logoUrl: string
  colorPrimary: string; colorPrimaryDark: string; colorDark: string
  colorText: string; colorMuted: string; colorBg: string
}
const BRAND_DEFAULT: Brand = {
  nameShort: 'DSF', nameLegal: 'Distribution Ste-Foy Ltée', tagline: 'DISTRIBUTION', logoUrl: '/dsf-logo.png',
  colorPrimary: '#e51937', colorPrimaryDark: '#c0102a', colorDark: '#1f2232',
  colorText: '#1f2232', colorMuted: '#6b7280', colorBg: '#f3f4f6',
}

function brandTokens(b: Brand): Record<string, string> {
  return {
    brand_primary: b.colorPrimary, brand_primary_dark: b.colorPrimaryDark, brand_dark: b.colorDark,
    brand_text: b.colorText, brand_muted: b.colorMuted, brand_bg: b.colorBg,
    nameShort: b.nameShort, nameLegal: b.nameLegal, tagline: b.tagline, logoUrl: b.logoUrl,
    year: String(new Date().getFullYear()), storeName: b.nameLegal,
  }
}

function sampleLinesTable(b: Brand): string {
  return `<table style="width:100%;border-collapse:collapse;font-size:13px;margin:16px 0;">
<thead><tr style="background:${b.colorDark};color:#fff;"><th style="padding:10px 12px;text-align:left;">Produit</th><th style="padding:10px 12px;text-align:center;">Qté</th><th style="padding:10px 12px;text-align:right;">Prix unitaire</th><th style="padding:10px 12px;text-align:right;">Total</th></tr></thead>
<tbody>
<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;">Panneau de gypse 1/2"</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">10</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">12.95 $</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">129.50 $</td></tr>
</tbody>
<tfoot><tr><td colspan="3" style="padding:12px;text-align:right;font-weight:700;color:${b.colorDark};">TOTAL</td><td style="padding:12px;text-align:right;font-weight:900;color:${b.colorPrimary};font-size:16px;">163.40 $</td></tr></tfoot></table>`
}
function sampleStatementTable(b: Brand): string {
  return `<table style="width:100%;border-collapse:collapse;font-size:13px;margin:16px 0;">
<thead><tr style="background:${b.colorDark};color:#fff;"><th style="padding:10px 12px;text-align:left;">Facture</th><th style="padding:10px 12px;text-align:left;">Date</th><th style="padding:10px 12px;text-align:right;">Montant</th><th style="padding:10px 12px;text-align:right;">Payé</th><th style="padding:10px 12px;text-align:right;">Solde</th><th style="padding:10px 12px;text-align:center;">Statut</th></tr></thead>
<tbody>
<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;">FAC-202605-A1B2C3</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">2026-05-12</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">250.00 $</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">100.00 $</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">150.00 $</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;color:#d97706;font-weight:600;">Partielle</td></tr>
</tbody></table>`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const RAW_KEYS = new Set(['lines_table', 'statement_table', 'content'])

function sampleVarsFor(event: string, brand: Brand): Record<string, string> {
  const vars: Record<string, string> = { ...(SAMPLE_SCALARS[event] ?? SAMPLE_SCALARS.purchase_invoice), ...brandTokens(brand) }
  if (event === 'purchase_invoice' || event === 'final_invoice') vars.lines_table = sampleLinesTable(brand)
  if (event === 'monthly_statement') vars.statement_table = sampleStatementTable(brand)
  return vars
}

function renderTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
    const v = vars[key]
    if (v == null) return ''
    return RAW_KEYS.has(key) ? v : escapeHtml(v)
  })
}

const EMAIL_LAYOUT_KEY = 'email_layout'

const LAYOUT_FALLBACK = `<div style="max-width:640px;margin:0 auto;padding:24px 16px;">
  <div style="height:4px;background:{{brand_primary}};"></div>
  <div style="background:{{brand_dark}};padding:18px 24px;"><span style="color:#fff;font-size:20px;font-weight:900;letter-spacing:.08em;">{{nameShort}}</span><span style="color:#9ca3af;font-size:12px;margin-left:8px;">{{tagline}}</span></div>
  <div style="background:#fff;padding:28px 24px;border:1px solid #e5e7eb;border-top:none;">{{content}}</div>
  <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:16px;">© {{year}} {{nameLegal}} — Ce courriel a été généré automatiquement.</p>
</div>`

/** Encadre un corps de courriel avec la mise en page (entête + pied). */
function wrapWithLayout(layoutBody: string, inner: string, brand: Brand): string {
  const filled = renderTemplate(layoutBody || LAYOUT_FALLBACK, { content: inner, ...brandTokens(brand) })
  return `<div style="background:${brand.colorBg};font-family:Arial,sans-serif;padding:16px;">${filled}</div>`
}

/** Aperçu d'un modèle d'événement, encadré par la mise en page. */
function previewHtml(bodyHtml: string, event: string, layoutBody: string, brand: Brand): string {
  const inner = renderTemplate(bodyHtml, sampleVarsFor(event, brand))
  return wrapWithLayout(layoutBody, inner, brand)
}

/** Aperçu du modèle de mise en page lui-même (avec un corps d'exemple). */
function previewLayoutHtml(layoutBody: string, brand: Brand): string {
  const sampleInner = `<h2 style="color:${brand.colorDark};margin:0 0 8px;">Confirmation d'achat</h2>
<p style="color:#374151;font-size:14px;">Construction Tremblay inc.,<br/>merci pour votre commande.</p>${sampleLinesTable(brand)}`
  return wrapWithLayout(layoutBody, sampleInner, brand)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EmailsPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [triggers, setTriggers]   = useState<Trigger[]>([])
  const [events, setEvents]       = useState<EventMeta[]>([])
  const [brand, setBrand]         = useState<Brand>(BRAND_DEFAULT)
  const [smtpReady, setSmtpReady] = useState(false)
  const [loading, setLoading]     = useState(true)
  const [message, setMessage]     = useState('')

  const [editing, setEditing] = useState<Template | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard/emails')
      const d = await res.json()
      setTemplates(d.templates ?? [])
      setTriggers(d.triggers ?? [])
      setEvents(d.events ?? [])
      if (d.brand) setBrand(d.brand)
      setSmtpReady(!!d.smtpReady)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  function flash(m: string) { setMessage(m); setTimeout(() => setMessage(''), 5000) }

  function triggerFor(event: string): Trigger | undefined {
    return triggers.find((t) => t.event === event)
  }

  async function updateTrigger(event: string, patch: { templateId?: string | null; enabled?: boolean }) {
    setTriggers((ts) => ts.map((t) => t.event === event ? { ...t, ...patch } : t))
    const res = await fetch(`/api/dashboard/emails/triggers/${event}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    })
    if (!res.ok) { flash('Erreur lors de la mise à jour du déclencheur'); load() }
  }

  async function deleteTemplate(t: Template) {
    if (!confirm(`Supprimer le modèle « ${t.name} » ?`)) return
    const res = await fetch(`/api/dashboard/emails/templates/${t.id}`, { method: 'DELETE' })
    if (res.ok) { flash('Modèle supprimé'); load() }
    else { const d = await res.json(); flash(`Erreur : ${d.error}`) }
  }

  async function newTemplate() {
    const res = await fetch('/api/dashboard/emails/templates', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Nouveau modèle', subject: 'Sujet — DSF Distribution',
        bodyHtml: '<h2 style="color:#1f2232;">Titre</h2>\n<p>Bonjour {{companyName}},</p>\n<p>Votre message ici.</p>',
      }),
    })
    if (res.ok) { const t = await res.json(); await load(); setEditing(t) }
  }

  if (loading) return <div className="p-8 text-gray-400">Chargement…</div>

  const layout = templates.find((t) => t.systemKey === EMAIL_LAYOUT_KEY)
  const eventTemplates = templates.filter((t) => t.systemKey !== EMAIL_LAYOUT_KEY)
  const layoutBody = layout?.bodyHtml ?? ''

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Courriels</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Gère les modèles de courriels et choisis quel modèle envoyer à chaque moment.
        </p>
      </div>

      {message && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm">{message}</div>
      )}

      {/* ── Workflows / déclencheurs ── */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-xl">⚡</span>
          <h2 className="font-semibold text-gray-900">Quand envoyer quoi</h2>
        </div>
        <p className="text-xs text-gray-500 mb-5">
          Pour chaque moment, choisis le modèle à envoyer et active ou désactive l'envoi.
        </p>

        <div className="space-y-3">
          {events.map((ev) => {
            const trig = triggerFor(ev.event)
            const enabled = trig?.enabled ?? false
            return (
              <div key={ev.event} className="flex items-start gap-4 py-3 border-b border-gray-50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{ev.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{ev.description}</p>
                </div>
                <select
                  value={trig?.templateId ?? ''}
                  onChange={(e) => updateTrigger(ev.event, { templateId: e.target.value || null })}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— Aucun (ne pas envoyer) —</option>
                  {eventTemplates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <button
                  type="button" role="switch" aria-checked={enabled}
                  onClick={() => updateTrigger(ev.event, { enabled: !enabled })}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 mt-1 ${enabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Modèles ── */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className="text-xl">📝</span>
            <h2 className="font-semibold text-gray-900">Modèles de courriels</h2>
          </div>
          <button onClick={newTemplate} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
            + Nouveau modèle
          </button>
        </div>

        <div className="divide-y divide-gray-50">
          {eventTemplates.map((t) => (
            <div key={t.id} className="flex items-center gap-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">{t.name}</p>
                  {t.systemKey && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">par défaut</span>}
                </div>
                <p className="text-xs text-gray-400 truncate">{t.subject}</p>
              </div>
              <button onClick={() => setEditing(t)} className="text-indigo-600 hover:underline text-xs">Modifier</button>
              {!t.systemKey && (
                <button onClick={() => deleteTemplate(t)} className="text-red-500 hover:underline text-xs">Supprimer</button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Entête et pied de page (mise en page partagée) ── */}
      {layout && (
        <section className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">🖼️</span>
              <div>
                <h2 className="font-semibold text-gray-900">Entête et pied de page</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  La bannière du haut et le pied de page appliqués à <strong>tous</strong> les courriels.
                </p>
              </div>
            </div>
            <button onClick={() => setEditing(layout)} className="text-indigo-600 hover:underline text-sm font-medium">
              Modifier
            </button>
          </div>
        </section>
      )}

      {editing && (
        <TemplateEditor
          template={editing}
          events={events}
          triggers={triggers}
          layoutBody={layoutBody}
          brand={brand}
          smtpReady={smtpReady}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load() }}
          onFlash={flash}
        />
      )}
    </div>
  )
}

// ─── Éditeur de modèle ────────────────────────────────────────────────────────

function TemplateEditor({ template, events, triggers, layoutBody, brand, smtpReady, onClose, onSaved, onFlash }: {
  template: Template
  events: EventMeta[]
  triggers: Trigger[]
  layoutBody: string
  brand: Brand
  smtpReady: boolean
  onClose: () => void
  onSaved: () => void
  onFlash: (m: string) => void
}) {
  const isLayout = template.systemKey === EMAIL_LAYOUT_KEY
  const [name, setName]       = useState(template.name)
  const [subject, setSubject] = useState(template.subject)
  const [body, setBody]       = useState(template.bodyHtml)
  const [saving, setSaving]   = useState(false)
  const subjectRef = useRef<HTMLInputElement>(null)

  // Contexte d'aperçu : événement lié à ce modèle, ou le 1er
  const boundEvent = triggers.find((t) => t.templateId === template.id)?.event
    ?? template.systemKey?.replace('default_', '')
    ?? events[0]?.event
  const [previewEvent, setPreviewEvent] = useState(boundEvent ?? 'purchase_invoice')

  const currentEvent = events.find((e) => e.event === previewEvent)
  // Le modèle de mise en page a ses propres variables (entête/pied)
  const allVars    = isLayout ? ['storeName', 'year', 'content'] : (currentEvent?.vars ?? [])
  const inlineVars = isLayout ? ['storeName', 'year'] : allVars.filter((v) => !v.endsWith('_table'))
  const blockVars  = isLayout ? ['content']           : allVars.filter((v) => v.endsWith('_table'))

  // Insère une donnée dans le sujet (au curseur)
  function insertSubjectVar(v: string) {
    const input = subjectRef.current
    const token = `{{${v}}}`
    if (!input) { setSubject((s) => s + token); return }
    const start = input.selectionStart ?? subject.length
    const end   = input.selectionEnd ?? subject.length
    setSubject((s) => s.slice(0, start) + token + s.slice(end))
    requestAnimationFrame(() => { input.focus(); input.selectionStart = input.selectionEnd = start + token.length })
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/dashboard/emails/templates/${template.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, subject, bodyHtml: body }),
      })
      if (res.ok) { onFlash('Modèle enregistré ✓'); onSaved() }
      else { const d = await res.json(); onFlash(`Erreur : ${d.error}`) }
    } finally { setSaving(false) }
  }

  async function runTest(signal: AbortSignal): Promise<{ ok: boolean; message: string }> {
    // Sauvegarder d'abord pour tester la version courante
    await fetch(`/api/dashboard/emails/templates/${template.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, subject, bodyHtml: body }), signal,
    })
    const res = await fetch(`/api/dashboard/emails/templates/${template.id}/test`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: previewEvent }), signal,
    })
    const d = await res.json()
    return { ok: !!d.ok, message: d.message ?? (d.ok ? 'Test envoyé' : 'Échec du test') }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">{isLayout ? "Modifier l'entête et le pied de page" : 'Modifier le modèle'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-0">
          {/* Édition */}
          <div className="p-6 space-y-4 border-r border-gray-100">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom du modèle</label>
              <input value={name} onChange={(e) => setName(e.target.value)} readOnly={isLayout}
                className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isLayout ? 'bg-gray-50 text-gray-500' : ''}`} />
            </div>
            {!isLayout && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sujet</label>
                <input ref={subjectRef} value={subject} onChange={(e) => setSubject(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                {inlineVars.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    <span className="text-xs text-gray-400 mr-1 self-center">Insérer :</span>
                    {inlineVars.map((v) => (
                      <button key={v} type="button"
                        onMouseDown={(e) => { e.preventDefault(); insertSubjectVar(v) }}
                        className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 hover:bg-indigo-100 hover:text-indigo-700">
                        + {VAR_LABELS[v] ?? v}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isLayout ? 'Entête et pied de page' : 'Contenu du courriel'}
              </label>
              <RichEmailEditor value={body} onChange={setBody} inlineVars={inlineVars} blockVars={blockVars} />
              <p className="text-xs text-gray-400 mt-1">
                {isLayout
                  ? "Le bloc « Contenu du courriel » sera remplacé par chaque message. Modifie autour : bannière, logo, pied de page."
                  : "L'en-tête et le pied DSF sont ajoutés automatiquement. Utilise « + Donnée » pour insérer des informations qui se remplissent toutes seules à l'envoi."}
              </p>
            </div>
          </div>

          {/* Aperçu */}
          <div className="p-6 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Aperçu</label>
              {!isLayout && (
                <select value={previewEvent} onChange={(e) => setPreviewEvent(e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {events.map((e) => <option key={e.event} value={e.event}>{e.label}</option>)}
                </select>
              )}
            </div>
            {!isLayout && (
              <p className="text-xs text-gray-400 mb-2">Sujet : {renderTemplate(subject, sampleVarsFor(previewEvent, brand))}</p>
            )}
            <iframe
              title="Aperçu"
              srcDoc={isLayout ? previewLayoutHtml(body, brand) : previewHtml(body, previewEvent, layoutBody, brand)}
              className="w-full h-[380px] bg-white border border-gray-200 rounded-lg"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t">
          <TestSendButton
            onTest={runTest}
            disabled={!smtpReady}
            disabledReason="Configure et teste d'abord le SMTP dans Paramètres → Courriels transactionnels. Le test devient disponible une fois l'envoi vérifié."
          />
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Annuler</button>
            <button onClick={save} disabled={saving}
              className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
