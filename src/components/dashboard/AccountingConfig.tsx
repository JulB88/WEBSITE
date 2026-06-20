'use client'

import { useEffect, useState, useCallback } from 'react'

interface Account { id: string; code: string; name: string; type: string; isActive: boolean; isSystem: boolean }
interface Mapping { id: string; key: string; label: string; accountId: string | null }
interface TaxCode { id: string; code: string; name: string; rate: number; jurisdiction: string | null; registrationNumber: string | null; collectedAccountId: string | null; isActive: boolean; isSystem: boolean }
interface Currency { code: string; symbol: string; name: string; isBase: boolean }

type Sub = 'accounts' | 'mappings' | 'taxes' | 'currencies'

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
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await fetch('/api/dashboard/accounting/config').then((r) => r.json())
      setAccounts(d.accounts ?? []); setMappings(d.mappings ?? [])
      setTaxCodes(d.taxCodes ?? []); setCurrencies(d.currencies ?? [])
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
    </div>
  )
}

// ─── Plan comptable ──────────────────────────────────────────────────────────────
function Accounts({ accounts, mutate }: { accounts: Account[]; mutate: (p: any) => Promise<boolean> }) {
  const [form, setForm] = useState({ code: '', name: '', type: 'EXPENSE' })
  const [adding, setAdding] = useState(false)

  async function add() {
    if (!form.code.trim() || !form.name.trim()) return
    if (await mutate({ entity: 'account', action: 'create', data: form })) {
      setForm({ code: '', name: '', type: 'EXPENSE' }); setAdding(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Plan comptable ({accounts.length})</h3>
        <button onClick={() => setAdding((a) => !a)} className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700">+ Compte</button>
      </div>
      {adding && (
        <div className="flex flex-wrap gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
          <input placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-24" />
          <input placeholder="Nom du compte" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-40" />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            {ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <button onClick={add} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">Ajouter</button>
        </div>
      )}
      <table className="w-full text-sm">
        <thead><tr className="bg-gray-50 text-left text-gray-500">
          <th className="px-3 py-2 font-medium">Code</th><th className="px-3 py-2 font-medium">Nom</th>
          <th className="px-3 py-2 font-medium">Type</th><th className="px-3 py-2 font-medium">Statut</th><th className="px-3 py-2" />
        </tr></thead>
        <tbody>
          {accounts.map((a) => (
            <tr key={a.id} className="border-t border-gray-50">
              <td className="px-3 py-2 font-mono">{a.code}</td>
              <td className="px-3 py-2">{a.name} {a.isSystem && <span className="text-xs text-gray-400">(système)</span>}</td>
              <td className="px-3 py-2 text-gray-600">{typeLabel(a.type)}</td>
              <td className="px-3 py-2">
                <button onClick={() => mutate({ entity: 'account', action: 'update', id: a.id, data: { isActive: !a.isActive } })}
                  className={`text-xs px-2 py-0.5 rounded-full ${a.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {a.isActive ? 'Actif' : 'Inactif'}
                </button>
              </td>
              <td className="px-3 py-2 text-right">
                {!a.isSystem && (
                  <button onClick={() => confirm(`Supprimer ${a.code} — ${a.name}?`) && mutate({ entity: 'account', action: 'delete', id: a.id })}
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
