'use client'

import { useEffect, useState, useCallback } from 'react'

interface Account { id: string; code: string; name: string; type: string; isActive: boolean; isSystem: boolean }
interface Mapping { id: string; key: string; label: string; accountId: string | null }
interface TaxCode { id: string; code: string; name: string; rate: number; jurisdiction: string | null; registrationNumber: string | null; collectedAccountId: string | null; isActive: boolean; isSystem: boolean }
interface Currency { code: string; symbol: string; name: string; isBase: boolean }
interface Period { id: string; name: string; status: string; startDate: string; endDate: string }
interface FiscalYr { id: string; name: string; startDate: string; endDate: string; periods: Period[] }

interface BcSync { enabled: boolean; batch: string; pending: number }

type Sub = 'accounts' | 'mappings' | 'taxes' | 'currencies' | 'fiscal' | 'bcsync'

const ACCOUNT_TYPES = [
  { value: 'ASSET', label: 'Actif' }, { value: 'LIABILITY', label: 'Passif' },
  { value: 'EQUITY', label: 'Capitaux propres' }, { value: 'REVENUE', label: 'Produits' },
  { value: 'EXPENSE', label: 'Charges' },
]
const typeLabel = (t: string) => ACCOUNT_TYPES.find((x) => x.value === t)?.label ?? t

export default function AccountingConfig() {
  const [sub, setSub] = useState<Sub>('accounts')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [mappings, setMappings] = useState<Mapping[]>([])
  const [taxCodes, setTaxCodes] = useState<TaxCode[]>([])
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [fiscalYears, setFiscalYears] = useState<FiscalYr[]>([])
  const [bcSync, setBcSync] = useState<BcSync>({ enabled: false, batch: '', pending: 0 })
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await fetch('/api/dashboard/accounting/config').then((r) => r.json())
      setAccounts(d.accounts ?? []); setMappings(d.mappings ?? [])
      setTaxCodes(d.taxCodes ?? []); setCurrencies(d.currencies ?? [])
      setFiscalYears(d.fiscalYears ?? [])
      if (d.bcSync) setBcSync(d.bcSync)
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 5000) }

  async function mutate(payload: any): Promise<boolean> {
    const res = await fetch('/api/dashboard/accounting/config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { flash(`✗ ${d.error ?? 'Erreur'}`); return false }
    await load()
    return true
  }

  if (loading) return <div className="py-16 text-center text-gray-400">Chargement…</div>

  const SUBS: { key: Sub; label: string }[] = [
    { key: 'accounts',   label: 'Plan comptable' },
    { key: 'mappings',   label: 'Mappages de comptes' },
    { key: 'taxes',      label: 'Codes de taxe' },
    { key: 'currencies', label: 'Devises' },
    { key: 'fiscal',     label: 'Exercices' },
    { key: 'bcsync',     label: 'Sync Business Central' },
  ]

  return (
    <div>
      {msg && <div className="mb-3 px-4 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm">{msg}</div>}

      <div className="flex flex-wrap gap-2 mb-5">
        {SUBS.map((s) => (
          <button key={s.key} onClick={() => setSub(s.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${sub === s.key ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {sub === 'accounts'   && <Accounts accounts={accounts} mutate={mutate} />}
      {sub === 'mappings'   && <Mappings mappings={mappings} accounts={accounts} mutate={mutate} />}
      {sub === 'taxes'      && <Taxes taxCodes={taxCodes} accounts={accounts} mutate={mutate} />}
      {sub === 'currencies' && <Currencies currencies={currencies} mutate={mutate} />}
      {sub === 'fiscal'     && <Fiscal years={fiscalYears} mutate={mutate} />}
      {sub === 'bcsync'     && <BcSync bc={bcSync} mutate={mutate} flash={flash} reload={load} />}
    </div>
  )
}

// ─── Synchronisation Business Central ──────────────────────────────────────────────
function BcSync({ bc, mutate, flash, reload }: { bc: BcSync; mutate: (p: any) => Promise<boolean>; flash: (m: string) => void; reload: () => void }) {
  const [batch, setBatch] = useState(bc.batch)
  const [running, setRunning] = useState(false)

  async function runSync() {
    setRunning(true)
    try {
      const res = await fetch('/api/dashboard/accounting/config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entity: 'bcSync', action: 'run' }),
      })
      const d = await res.json()
      flash(res.ok ? `✓ ${d.message}` : `✗ ${d.error}`)
      reload()
    } finally { setRunning(false) }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-xl">
      <h3 className="font-semibold text-gray-900 mb-1">Synchronisation vers Business Central</h3>
      <p className="text-xs text-gray-500 mb-5">
        Optionnelle. Quand activée, chaque écriture postée est exportée vers le journal général de BC.
        La comptabilité interne reste autonome si désactivée.
      </p>

      <div className="flex items-start gap-4 mb-4">
        <button type="button" role="switch" aria-checked={bc.enabled}
          onClick={() => mutate({ entity: 'bcSync', action: 'setEnabled', value: !bc.enabled })}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors mt-0.5 ${bc.enabled ? 'bg-indigo-600' : 'bg-gray-200'}`}>
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${bc.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
        <div>
          <p className="text-sm font-medium text-gray-900">Activer la synchronisation BC</p>
          <p className="text-xs text-gray-500 mt-0.5">{bc.enabled ? 'Activée — les nouvelles écritures sont exportées.' : 'Désactivée.'}</p>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Code du journal BC (batch)</label>
        <div className="flex gap-2">
          <input value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="ex. GENERAL"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <button onClick={() => mutate({ entity: 'bcSync', action: 'setBatch', value: batch })} className="text-sm bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700">Enregistrer</button>
        </div>
        <p className="text-xs text-gray-400 mt-1">Laisse vide pour utiliser le premier journal disponible. Les numéros de compte BC doivent correspondre aux codes du plan comptable.</p>
      </div>

      <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
        <button onClick={runSync} disabled={running || !bc.enabled}
          className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
          {running ? 'Synchronisation…' : 'Synchroniser maintenant'}
        </button>
        <span className="text-xs text-gray-500">{bc.pending} écriture(s) en attente de synchronisation</span>
      </div>
    </div>
  )
}

// ─── Exercices ───────────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = { OPEN: 'Ouverte', CLOSED: 'Fermée', LOCKED: 'Verrouillée' }
function Fiscal({ years, mutate }: { years: FiscalYr[]; mutate: (p: any) => Promise<boolean> }) {
  const [form, setForm] = useState({ name: '', startDate: new Date().getFullYear() + '-01-01' })

  async function add() {
    if (!form.name.trim() || !form.startDate) return
    if (await mutate({ entity: 'fiscalYear', action: 'create', data: form })) setForm({ name: '', startDate: new Date().getFullYear() + '-01-01' })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="font-semibold text-gray-900 mb-1">Exercices financiers</h3>
      <p className="text-xs text-gray-500 mb-4">Ferme ou verrouille une période pour empêcher tout nouveau postage à ces dates.</p>

      <div className="flex flex-wrap gap-2 mb-5 p-3 bg-gray-50 rounded-lg">
        <input placeholder="Nom (ex. Exercice 2026)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-44" />
        <div>
          <label className="block text-xs text-gray-500 mb-0.5">Début</label>
          <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
        </div>
        <button onClick={add} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 self-end">+ Créer (12 mois)</button>
      </div>

      {years.length === 0 && <p className="text-sm text-gray-400">Aucun exercice. Crée-en un pour gérer les clôtures de période.</p>}
      {years.map((y) => (
        <div key={y.id} className="mb-5">
          <p className="text-sm font-semibold text-gray-800 mb-2">{y.name} <span className="text-xs text-gray-400 font-normal">({y.startDate.slice(0, 10)} → {y.endDate.slice(0, 10)})</span></p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {y.periods.map((p) => (
              <div key={p.id} className="border border-gray-100 rounded-lg px-3 py-2 flex items-center justify-between">
                <span className="text-sm font-mono">{p.name}</span>
                <select value={p.status} onChange={(e) => mutate({ entity: 'period', action: 'setStatus', id: p.id, status: e.target.value })}
                  className={`text-xs rounded px-1.5 py-1 border ${p.status === 'OPEN' ? 'text-green-700 border-green-200' : p.status === 'LOCKED' ? 'text-red-700 border-red-200' : 'text-amber-700 border-amber-200'}`}>
                  {['OPEN', 'CLOSED', 'LOCKED'].map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Plan comptable ──────────────────────────────────────────────────────────────
function Accounts({ accounts, mutate }: { accounts: Account[]; mutate: (p: any) => Promise<boolean> }) {
  const [form, setForm] = useState({ code: '', name: '', type: 'EXPENSE' })
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ code: '', name: '', type: 'EXPENSE' })

  async function add() {
    if (!form.code.trim() || !form.name.trim()) return
    if (await mutate({ entity: 'account', action: 'create', data: form })) {
      setForm({ code: '', name: '', type: 'EXPENSE' }); setAdding(false)
    }
  }

  function startEdit(a: Account) {
    setEditId(a.id)
    setEditForm({ code: a.code, name: a.name, type: a.type })
  }

  async function saveEdit(id: string) {
    if (!editForm.code.trim() || !editForm.name.trim()) return
    if (await mutate({ entity: 'account', action: 'update', id, data: editForm })) setEditId(null)
  }

  const inputCls = 'border border-gray-200 rounded-lg px-2 py-1.5 text-sm'

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Plan comptable ({accounts.length})</h3>
        <button onClick={() => setAdding((a) => !a)} className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700">+ Compte</button>
      </div>
      {adding && (
        <div className="flex flex-wrap gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
          <input placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className={`${inputCls} w-24`} />
          <input placeholder="Nom du compte" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`${inputCls} flex-1 min-w-40`} />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}>
            {ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <button onClick={add} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">Ajouter</button>
        </div>
      )}
      <table className="w-full text-sm">
        <thead><tr className="bg-gray-50 text-left text-gray-500">
          <th className="px-3 py-2 font-medium">Code</th><th className="px-3 py-2 font-medium">Nom</th>
          <th className="px-3 py-2 font-medium">Type</th><th className="px-3 py-2 font-medium">Statut</th><th className="px-3 py-2 text-right" />
        </tr></thead>
        <tbody>
          {accounts.map((a) => editId === a.id ? (
            <tr key={a.id} className="border-t border-gray-50 bg-indigo-50/40">
              <td className="px-3 py-2"><input value={editForm.code} onChange={(e) => setEditForm({ ...editForm, code: e.target.value })} className={`${inputCls} w-24 font-mono`} /></td>
              <td className="px-3 py-2"><input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className={`${inputCls} w-full`} /></td>
              <td className="px-3 py-2"><select value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })} className={inputCls}>{ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></td>
              <td className="px-3 py-2 text-gray-400 text-xs">{a.isActive ? 'Actif' : 'Inactif'}</td>
              <td className="px-3 py-2 text-right whitespace-nowrap">
                <button onClick={() => saveEdit(a.id)} className="text-xs text-green-600 hover:underline font-medium mr-2">Enregistrer</button>
                <button onClick={() => setEditId(null)} className="text-xs text-gray-500 hover:underline">Annuler</button>
              </td>
            </tr>
          ) : (
            <tr key={a.id} className="border-t border-gray-50">
              <td className="px-3 py-2 font-mono">{a.code}</td>
              <td className="px-3 py-2">{a.name} {a.isSystem && <span className="text-xs text-gray-400">(système)</span>}</td>
              <td className="px-3 py-2 text-gray-600">{typeLabel(a.type)}</td>
              <td className="px-3 py-2">
                <button onClick={() => mutate({ entity: 'account', action: 'update', id: a.id, data: { isActive: !a.isActive } })}
                  title="Cliquer pour activer/désactiver"
                  className={`text-xs px-2 py-0.5 rounded-full ${a.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  {a.isActive ? 'Actif' : 'Inactif'}
                </button>
              </td>
              <td className="px-3 py-2 text-right whitespace-nowrap">
                <button onClick={() => startEdit(a)} className="text-xs text-indigo-600 hover:underline mr-2">Modifier</button>
                {!a.isSystem && (
                  <button onClick={() => confirm(`Supprimer ${a.code} — ${a.name}?`) && mutate({ entity: 'account', action: 'delete', id: a.id })}
                    className="text-xs text-red-500 hover:underline">Supprimer</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-400 mt-3">Clique sur le statut pour activer/désactiver un compte. « Modifier » permet de changer le code, le nom et le type (même pour les comptes système).</p>
    </div>
  )
}

// ─── Mappages ────────────────────────────────────────────────────────────────────
function Mappings({ mappings, accounts, mutate }: { mappings: Mapping[]; accounts: Account[]; mutate: (p: any) => Promise<boolean> }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="font-semibold text-gray-900 mb-1">Mappages de comptes</h3>
      <p className="text-xs text-gray-500 mb-4">Quel compte du grand livre utiliser pour chaque type de transaction.</p>
      <div className="space-y-2">
        {mappings.map((m) => (
          <div key={m.id} className="flex items-center gap-4 py-2 border-b border-gray-50">
            <span className="text-sm text-gray-700 flex-1">{m.label}</span>
            <select value={m.accountId ?? ''} onChange={(e) => mutate({ entity: 'mapping', action: 'set', key: m.key, accountId: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-72">
              <option value="">— Aucun —</option>
              {accounts.filter((a) => a.isActive).map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Codes de taxe ───────────────────────────────────────────────────────────────
function Taxes({ taxCodes, accounts, mutate }: { taxCodes: TaxCode[]; accounts: Account[]; mutate: (p: any) => Promise<boolean> }) {
  const [form, setForm] = useState({ code: '', name: '', rate: '', jurisdiction: '', collectedAccountId: '' })
  const [adding, setAdding] = useState(false)
  const liabilities = accounts.filter((a) => a.type === 'LIABILITY' && a.isActive)

  async function add() {
    if (!form.code.trim() || !form.name.trim()) return
    if (await mutate({ entity: 'taxCode', action: 'create', data: { ...form, rate: parseFloat(form.rate) || 0 } })) {
      setForm({ code: '', name: '', rate: '', jurisdiction: '', collectedAccountId: '' }); setAdding(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Codes de taxe ({taxCodes.length})</h3>
        <button onClick={() => setAdding((a) => !a)} className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700">+ Taxe</button>
      </div>
      {adding && (
        <div className="flex flex-wrap gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
          <input placeholder="Code (ex. TPS)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-28" />
          <input placeholder="Nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-40" />
          <input placeholder="Taux (0.05)" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-28" />
          <input placeholder="Juridiction" value={form.jurisdiction} onChange={(e) => setForm({ ...form, jurisdiction: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-32" />
          <select value={form.collectedAccountId} onChange={(e) => setForm({ ...form, collectedAccountId: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="">Compte taxe perçue…</option>
            {liabilities.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
          </select>
          <button onClick={add} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">Ajouter</button>
        </div>
      )}
      <table className="w-full text-sm">
        <thead><tr className="bg-gray-50 text-left text-gray-500">
          <th className="px-3 py-2 font-medium">Code</th><th className="px-3 py-2 font-medium">Nom</th>
          <th className="px-3 py-2 font-medium text-right">Taux</th><th className="px-3 py-2 font-medium">Juridiction</th>
          <th className="px-3 py-2 font-medium">Compte perçu</th><th className="px-3 py-2 font-medium">Statut</th><th className="px-3 py-2" />
        </tr></thead>
        <tbody>
          {taxCodes.map((t) => (
            <tr key={t.id} className="border-t border-gray-50">
              <td className="px-3 py-2 font-mono">{t.code}</td>
              <td className="px-3 py-2">{t.name}</td>
              <td className="px-3 py-2 text-right">{(t.rate * 100).toFixed(3).replace(/\.?0+$/, '')} %</td>
              <td className="px-3 py-2 text-gray-600">{t.jurisdiction ?? '—'}</td>
              <td className="px-3 py-2 text-xs font-mono text-gray-500">{accounts.find((a) => a.id === t.collectedAccountId)?.code ?? '—'}</td>
              <td className="px-3 py-2">
                <button onClick={() => mutate({ entity: 'taxCode', action: 'update', id: t.id, data: { isActive: !t.isActive } })}
                  className={`text-xs px-2 py-0.5 rounded-full ${t.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {t.isActive ? 'Actif' : 'Inactif'}
                </button>
              </td>
              <td className="px-3 py-2 text-right">
                {!t.isSystem && (
                  <button onClick={() => confirm(`Supprimer ${t.code}?`) && mutate({ entity: 'taxCode', action: 'delete', id: t.id })}
                    className="text-xs text-red-500 hover:underline">Supprimer</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Devises ─────────────────────────────────────────────────────────────────────
function Currencies({ currencies, mutate }: { currencies: Currency[]; mutate: (p: any) => Promise<boolean> }) {
  const [form, setForm] = useState({ code: '', symbol: '', name: '' })
  const [rate, setRate] = useState<Record<string, string>>({})

  async function add() {
    if (!form.code.trim()) return
    if (await mutate({ entity: 'currency', action: 'create', data: form })) setForm({ code: '', symbol: '', name: '' })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="font-semibold text-gray-900 mb-1">Devises</h3>
      <p className="text-xs text-gray-500 mb-4">La devise de base tient le grand livre. Les taux : unités de base pour 1 unité étrangère.</p>
      <table className="w-full text-sm mb-4">
        <thead><tr className="bg-gray-50 text-left text-gray-500">
          <th className="px-3 py-2 font-medium">Code</th><th className="px-3 py-2 font-medium">Nom</th>
          <th className="px-3 py-2 font-medium">Base</th><th className="px-3 py-2 font-medium">Taux (→ base)</th>
        </tr></thead>
        <tbody>
          {currencies.map((c) => (
            <tr key={c.code} className="border-t border-gray-50">
              <td className="px-3 py-2 font-mono">{c.symbol} {c.code}</td>
              <td className="px-3 py-2">{c.name}</td>
              <td className="px-3 py-2">
                {c.isBase ? <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">Base</span>
                  : <button onClick={() => mutate({ entity: 'currency', action: 'setBase', code: c.code })} className="text-xs text-indigo-600 hover:underline">Définir comme base</button>}
              </td>
              <td className="px-3 py-2">
                {c.isBase ? <span className="text-gray-400 text-xs">1.0000</span> : (
                  <div className="flex gap-1">
                    <input placeholder="1.00" value={rate[c.code] ?? ''} onChange={(e) => setRate({ ...rate, [c.code]: e.target.value })}
                      className="border border-gray-200 rounded px-2 py-1 text-xs w-20" />
                    <button onClick={() => mutate({ entity: 'currency', action: 'setRate', code: c.code, rate: parseFloat(rate[c.code] || '1'), asOf: new Date().toISOString() })}
                      className="text-xs bg-gray-800 text-white px-2 py-1 rounded">OK</button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
        <input placeholder="Code (USD)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-28" />
        <input placeholder="Symbole ($)" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-28" />
        <input placeholder="Nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-40" />
        <button onClick={add} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">+ Devise</button>
      </div>
    </div>
  )
}
