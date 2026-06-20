'use client'

import { useEffect, useState, useCallback } from 'react'

interface Account { id: string; code: string; name: string; isActive: boolean }
interface Line { id: string; debit: string; credit: string; baseDebit: string; baseCredit: string; description: string | null; account: { code: string; name: string } }
interface Entry { id: string; number: number; date: string; memo: string | null; source: string; status: string; lines: Line[] }

const money = (n: number) => (n ?? 0).toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $'

const SOURCE_LABEL: Record<string, string> = {
  SALE: 'Vente', PAYMENT: 'Encaissement', BILL: 'Facture fourn.', BILL_PAYMENT: 'Paiement fourn.',
  EXPENSE: 'Dépense', MANUAL: 'Manuelle', REVERSAL: 'Contre-passation',
}

interface FormLine { accountId: string; debit: string; credit: string; description: string }
const emptyLine = (): FormLine => ({ accountId: '', debit: '', credit: '', description: '' })

export default function JournalEntries() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  // Formulaire d'écriture manuelle
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [memo, setMemo] = useState('')
  const [formLines, setFormLines] = useState<FormLine[]>([emptyLine(), emptyLine()])
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [j, c] = await Promise.all([
        fetch('/api/dashboard/accounting/journal').then((r) => r.json()),
        fetch('/api/dashboard/accounting/config').then((r) => r.json()),
      ])
      setEntries(j.entries ?? [])
      setAccounts((c.accounts ?? []).filter((a: Account) => a.isActive))
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 5000) }

  const totalDebit = formLines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0)
  const totalCredit = formLines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0)
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0

  async function saveManual() {
    if (!balanced) { flash('✗ L\'écriture doit être équilibrée (débits = crédits).'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/dashboard/accounting/journal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'manual', date, memo, lines: formLines.filter((l) => l.accountId && (l.debit || l.credit)) }),
      })
      const d = await res.json()
      if (!res.ok) { flash(`✗ ${d.error}`); return }
      flash('✓ Écriture enregistrée'); setCreating(false)
      setMemo(''); setFormLines([emptyLine(), emptyLine()])
      load()
    } finally { setSaving(false) }
  }

  async function reverse(e: Entry) {
    if (!confirm(`Contre-passer l'écriture n° ${e.number}? Une écriture inverse sera créée.`)) return
    const res = await fetch('/api/dashboard/accounting/journal', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reverse', entryId: e.id }),
    })
    const d = await res.json()
    flash(res.ok ? '✓ Écriture contre-passée' : `✗ ${d.error}`)
    if (res.ok) load()
  }

  if (loading) return <div className="bg-white border border-gray-200 rounded-xl p-6 py-16 text-center text-gray-400">Chargement…</div>

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      {msg && <div className="mb-3 px-4 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm">{msg}</div>}

      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Écritures de journal ({entries.length})</h3>
        <button onClick={() => setCreating((c) => !c)} className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
          + Écriture manuelle
        </button>
      </div>

      {/* Formulaire écriture manuelle */}
      {creating && (
        <div className="mb-6 p-4 bg-gray-50 rounded-xl">
          <div className="flex flex-wrap gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex-1 min-w-48">
              <label className="block text-xs text-gray-500 mb-1">Description</label>
              <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Note de l'écriture" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <table className="w-full text-sm mb-2">
            <thead><tr className="text-left text-gray-500 text-xs">
              <th className="py-1">Compte</th><th className="py-1">Description</th><th className="py-1 text-right w-28">Débit</th><th className="py-1 text-right w-28">Crédit</th><th />
            </tr></thead>
            <tbody>
              {formLines.map((l, i) => (
                <tr key={i}>
                  <td className="py-1 pr-2">
                    <select value={l.accountId} onChange={(e) => setFormLines((fl) => fl.map((x, j) => j === i ? { ...x, accountId: e.target.value } : x))}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm">
                      <option value="">— Compte —</option>
                      {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
                    </select>
                  </td>
                  <td className="py-1 pr-2">
                    <input value={l.description} onChange={(e) => setFormLines((fl) => fl.map((x, j) => j === i ? { ...x, description: e.target.value } : x))}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
                  </td>
                  <td className="py-1 pr-2">
                    <input value={l.debit} onChange={(e) => setFormLines((fl) => fl.map((x, j) => j === i ? { ...x, debit: e.target.value, credit: '' } : x))}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right" placeholder="0.00" />
                  </td>
                  <td className="py-1 pr-2">
                    <input value={l.credit} onChange={(e) => setFormLines((fl) => fl.map((x, j) => j === i ? { ...x, credit: e.target.value, debit: '' } : x))}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right" placeholder="0.00" />
                  </td>
                  <td className="py-1">
                    {formLines.length > 2 && <button onClick={() => setFormLines((fl) => fl.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-xs">✕</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between">
            <button onClick={() => setFormLines((fl) => [...fl, emptyLine()])} className="text-xs text-indigo-600 hover:underline">+ Ajouter une ligne</button>
            <div className="text-sm">
              <span className="text-gray-500 mr-3">Débits : <strong>{money(totalDebit)}</strong></span>
              <span className="text-gray-500 mr-3">Crédits : <strong>{money(totalCredit)}</strong></span>
              <span className={balanced ? 'text-green-600' : 'text-red-600'}>{balanced ? '✓ équilibrée' : '✗ déséquilibrée'}</span>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => setCreating(false)} className="px-4 py-2 text-sm text-gray-600">Annuler</button>
            <button onClick={saveManual} disabled={!balanced || saving}
              className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
              {saving ? 'Enregistrement…' : 'Enregistrer l\'écriture'}
            </button>
          </div>
        </div>
      )}

      {/* Liste des écritures */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 text-left text-gray-500">
            <th className="px-3 py-2 font-medium">N°</th><th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 font-medium">Type</th><th className="px-3 py-2 font-medium">Description</th>
            <th className="px-3 py-2 font-medium text-right">Montant</th><th className="px-3 py-2 font-medium">Statut</th><th className="px-3 py-2" />
          </tr></thead>
          <tbody>
            {entries.length === 0 && <tr><td colSpan={7} className="py-12 text-center text-gray-400">Aucune écriture. Les ventes et paiements en génèrent automatiquement.</td></tr>}
            {entries.map((e) => {
              const amount = e.lines.reduce((s, l) => s + Number(l.baseDebit), 0)
              return (
                <>
                  <tr key={e.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono">{e.number}</td>
                    <td className="px-3 py-2">{e.date.slice(0, 10)}</td>
                    <td className="px-3 py-2 text-gray-600">{SOURCE_LABEL[e.source] ?? e.source}</td>
                    <td className="px-3 py-2 text-gray-600">{e.memo ?? '—'}</td>
                    <td className="px-3 py-2 text-right font-medium">{money(amount)}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${e.status === 'POSTED' ? 'bg-green-100 text-green-700' : e.status === 'VOID' ? 'bg-gray-100 text-gray-500' : 'bg-amber-100 text-amber-700'}`}>
                        {e.status === 'POSTED' ? 'Postée' : e.status === 'VOID' ? 'Contre-passée' : 'Brouillon'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button onClick={() => setExpanded(expanded === e.id ? null : e.id)} className="text-gray-500 hover:underline text-xs mr-2">{expanded === e.id ? 'Masquer' : 'Lignes'}</button>
                      {e.status === 'POSTED' && e.source !== 'REVERSAL' && (
                        <button onClick={() => reverse(e)} className="text-red-500 hover:underline text-xs">Contre-passer</button>
                      )}
                    </td>
                  </tr>
                  {expanded === e.id && (
                    <tr key={`${e.id}-lines`}><td colSpan={7} className="px-6 py-3 bg-gray-50">
                      <table className="w-full text-xs">
                        <thead><tr className="text-gray-400 text-left"><th className="py-1">Compte</th><th className="py-1">Description</th><th className="py-1 text-right">Débit</th><th className="py-1 text-right">Crédit</th></tr></thead>
                        <tbody>
                          {e.lines.map((l) => (
                            <tr key={l.id}>
                              <td className="py-1 font-mono">{l.account.code} · {l.account.name}</td>
                              <td className="py-1 text-gray-500">{l.description ?? ''}</td>
                              <td className="py-1 text-right">{Number(l.baseDebit) ? money(Number(l.baseDebit)) : ''}</td>
                              <td className="py-1 text-right">{Number(l.baseCredit) ? money(Number(l.baseCredit)) : ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td></tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
