'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

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

const SAMPLE_LINES_TABLE = `<table style="width:100%;border-collapse:collapse;font-size:13px;margin:16px 0;">
<thead><tr style="background:#1f2232;color:#fff;"><th style="padding:10px 12px;text-align:left;">Produit</th><th style="padding:10px 12px;text-align:center;">Qté</th><th style="padding:10px 12px;text-align:right;">Prix unitaire</th><th style="padding:10px 12px;text-align:right;">Total</th></tr></thead>
<tbody>
<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;">Panneau de gypse 1/2"</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">10</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">12.95 $</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">129.50 $</td></tr>
<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;">Vis à gypse (boîte 1000)</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">2</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">16.95 $</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">33.90 $</td></tr>
</tbody>
<tfoot><tr><td colspan="3" style="padding:12px;text-align:right;font-weight:700;color:#1f2232;">TOTAL</td><td style="padding:12px;text-align:right;font-weight:900;color:#e51937;font-size:16px;">163.40 $</td></tr></tfoot></table>`

const SAMPLE_STATEMENT_TABLE = `<table style="width:100%;border-collapse:collapse;font-size:13px;margin:16px 0;">
<thead><tr style="background:#1f2232;color:#fff;"><th style="padding:10px 12px;text-align:left;">Facture</th><th style="padding:10px 12px;text-align:left;">Date</th><th style="padding:10px 12px;text-align:right;">Montant</th><th style="padding:10px 12px;text-align:right;">Payé</th><th style="padding:10px 12px;text-align:right;">Solde</th><th style="padding:10px 12px;text-align:center;">Statut</th></tr></thead>
<tbody>
<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;">FAC-202605-A1B2C3</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">2026-05-12</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">250.00 $</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">100.00 $</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">150.00 $</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;color:#d97706;font-weight:600;">Partielle</td></tr>
</tbody></table>`

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function sampleVarsFor(event: string): { vars: Record<string, string>; raw: Set<string> } {
  const vars = { ...(SAMPLE_SCALARS[event] ?? SAMPLE_SCALARS.purchase_invoice) }
  if (event === 'purchase_invoice' || event === 'final_invoice') vars.lines_table = SAMPLE_LINES_TABLE
  if (event === 'monthly_statement') vars.statement_table = SAMPLE_STATEMENT_TABLE
  return { vars, raw: new Set(['lines_table', 'statement_table']) }
}

function renderTemplate(tpl: string, vars: Record<string, string>, raw: Set<string>): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
    const v = vars[key]
    if (v == null) return ''
    return raw.has(key) ? v : escapeHtml(v)
  })
}

function previewHtml(bodyHtml: string, event: string): string {
  const { vars, raw } = sampleVarsFor(event)
  const inner = renderTemplate(bodyHtml, vars, raw)
  return `<div style="background:#f3f4f6;font-family:Arial,sans-serif;padding:16px;">
    <div style="max-width:640px;margin:0 auto;">
      <div style="height:4px;background:#e51937;"></div>
      <div style="background:#1f2232;padding:14px 20px;"><span style="color:#fff;font-size:18px;font-weight:900;letter-spacing:.08em;">DSF</span><span style="color:#9ca3af;font-size:11px;margin-left:8px;">DISTRIBUTION</span></div>
      <div style="background:#fff;padding:24px 20px;border:1px solid #e5e7eb;border-top:none;">${inner}</div>
    </div>
  </div>`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EmailsPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [triggers, setTriggers]   = useState<Trigger[]>([])
  const [events, setEvents]       = useState<EventMeta[]>([])
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
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
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
          {templates.map((t) => (
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

      {editing && (
        <TemplateEditor
          template={editing}
          events={events}
          triggers={triggers}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load() }}
          onFlash={flash}
        />
      )}
    </div>
  )
}

// ─── Éditeur de modèle ────────────────────────────────────────────────────────

function TemplateEditor({ template, events, triggers, onClose, onSaved, onFlash }: {
  template: Template
  events: EventMeta[]
  triggers: Trigger[]
  onClose: () => void
  onSaved: () => void
  onFlash: (m: string) => void
}) {
  const [name, setName]       = useState(template.name)
  const [subject, setSubject] = useState(template.subject)
  const [body, setBody]       = useState(template.bodyHtml)
  const [saving, setSaving]   = useState(false)
  const [testing, setTesting] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  // Contexte d'aperçu : événement lié à ce modèle, ou le 1er
  const boundEvent = triggers.find((t) => t.templateId === template.id)?.event
    ?? template.systemKey?.replace('default_', '')
    ?? events[0]?.event
  const [previewEvent, setPreviewEvent] = useState(boundEvent ?? 'purchase_invoice')

  const currentEvent = events.find((e) => e.event === previewEvent)

  function insertVar(v: string) {
    const ta = bodyRef.current
    const token = `{{${v}}}`
    if (!ta) { setBody((b) => b + token); return }
    const start = ta.selectionStart, end = ta.selectionEnd
    setBody((b) => b.slice(0, start) + token + b.slice(end))
    requestAnimationFrame(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = start + token.length })
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

  async function sendTest() {
    setTesting(true)
    try {
      // Sauvegarder d'abord pour tester la version courante
      await fetch(`/api/dashboard/emails/templates/${template.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, subject, bodyHtml: body }),
      })
      const res = await fetch(`/api/dashboard/emails/templates/${template.id}/test`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: previewEvent }),
      })
      const d = await res.json()
      onFlash(d.message ?? (d.ok ? 'Test envoyé' : 'Échec du test'))
    } finally { setTesting(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Modifier le modèle</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-0">
          {/* Édition */}
          <div className="p-6 space-y-4 border-r border-gray-100">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom du modèle</label>
              <input value={name} onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sujet</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contenu (HTML)</label>
              <textarea ref={bodyRef} value={body} onChange={(e) => setBody(e.target.value)} rows={14}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <p className="text-xs text-gray-400 mt-1">L'en-tête et le pied DSF sont ajoutés automatiquement.</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1.5">
                Variables disponibles <span className="text-gray-400">(clique pour insérer)</span> :
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(currentEvent?.vars ?? []).map((v) => (
                  <button key={v} onClick={() => insertVar(v)}
                    className="text-xs font-mono px-2 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Aperçu */}
          <div className="p-6 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Aperçu</label>
              <select value={previewEvent} onChange={(e) => setPreviewEvent(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {events.map((e) => <option key={e.event} value={e.event}>{e.label}</option>)}
              </select>
            </div>
            <p className="text-xs text-gray-400 mb-2">Sujet : {renderTemplate(subject, sampleVarsFor(previewEvent).vars, new Set())}</p>
            <iframe
              title="Aperçu"
              srcDoc={previewHtml(body, previewEvent)}
              className="w-full h-[380px] bg-white border border-gray-200 rounded-lg"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t">
          <button onClick={sendTest} disabled={testing}
            className="text-sm border border-gray-200 rounded-lg px-4 py-2 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            {testing ? 'Envoi…' : '✉ Envoyer un test'}
          </button>
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
