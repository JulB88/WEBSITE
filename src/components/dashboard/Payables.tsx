'use client'

import { useEffect, useState, useCallback } from 'react'

const money = (n: number) => (n ?? 0).toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $'

interface Vendor { id: string; name: string; email: string | null; phone: string | null; termsDays: number; isActive: boolean }
interface Bill { id: string; number: string | null; date: string; total: number; paidAmount: number; status: string; vendor: { name: string }; lines: any[] }
interface Account { id: string; code: string; name: string; type: string; isActive: boolean }
interface TaxCode { id: string; code: string; name: string; rate: number; isActive: boolean }

type Sub = 'vendors' | 'bills' | 'expenses' | 'aging'

export default function Payables() {
  const [sub, setSub] = useState<Sub>('bills')
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [bills, setBills] = useState<Bill[]>([])
  const [aging, setAging] = useState<any>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [taxCodes, setTaxCodes] = useState<TaxCode[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, c] = await Promise.all([
        fetch('/api/dashboard/accounting/payables').then((r) => r.json()),
        fetch('/api/dashboard/accounting/config').then((r) => r.json()),
      ])
      setVendors(p.vendors ?? []); setBills(p.bills ?? []); setAging(p.aging ?? null)
      setAccounts((c.accounts ?? []).filter((a: Account) => a.isActive))
      setTaxCodes((c.taxCodes ?? []).filter((t: TaxCode) => t.isActive))
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 5000) }
  async function mutate(payload: any): Promise<boolean> {
    const res = await fetch('/api/dashboard/accounting/payables', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { flash(`✗ ${d.error ?? 'Erreur'}`); return false }
    flash('✓ Enregistré'); await load(); return true
  }

  if (loading) return <div className="bg-white border border-gray-200 rounded-xl p-6 py-16 text-center text-gray-400">Chargement…</div>

  const SUBS: { key: Sub; label: string }[] = [
    { key: 'bills', label: 'Factures d\'achat' },
    { key: 'expenses', label: 'Dépenses' },
    { key: 'vendors', label: 'Fournisseurs' },
    { key: 'aging', label: 'Âge fournisseurs' },
  ]

  return (
    <div>
      {msg && <div className="mb-3 px-4 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm">{msg}</div>}
      <div className="flex flex-wrap gap-2 mb-5">
        {SUBS.map((s) => (
          <button key={s.key} onClick={() => setSub(s.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${sub === s.key ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{s.label}</button>
        ))}
      </div>
      {sub === 'vendors'  && <Vendors vendors={vendors} mutate={mutate} />}
      {sub === 'bills'    && <Bills bills={bills} vendors={vendors} accounts={accounts} taxCodes={taxCodes} mutate={mutate} />}
      {sub === 'expenses' && <Expenses accounts={accounts} taxCodes={taxCodes} mutate={mutate} />}
      {sub === 'aging'    && <Aging aging={aging} />}
    </div>
  )
}

function Vendors({ vendors, mutate }: { vendors: Vendor[]; mutate: (p: any) => Promise<boolean> }) {
  const [f, setF] = useState({ name: '', email: '', phone: '', termsDays: '30' })
  const [adding, setAdding] = useState(false)
  async function add() { if (f.name.trim() && await mutate({ action: 'vendor:create', data: { ...f, termsDays: parseInt(f.termsDays) || 30 } })) { setF({ name: '', email: '', phone: '', termsDays: '30' }); setAdding(false) } }
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-gray-900">Fournisseurs ({vendors.length})</h3>
        <button onClick={() => setAdding((a) => !a)} className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700">+ Fournisseur</button></div>
      {adding && (
        <div className="flex flex-wrap gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
          <input placeholder="Nom *" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-40" />
          <input placeholder="Courriel" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Téléphone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-36" />
          <input placeholder="Délai (j)" value={f.termsDays} onChange={(e) => setF({ ...f, termsDays: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-24" />
          <button onClick={add} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">Ajouter</button>
        </div>
      )}
      <table className="w-full text-sm"><thead><tr className="bg-gray-50 text-left text-gray-500"><th className="px-3 py-2 font-medium">Nom</th><th className="px-3 py-2 font-medium">Courriel</th><th className="px-3 py-2 font-medium">Téléphone</th><th className="px-3 py-2 font-medium">Délai</th></tr></thead>
        <tbody>{vendors.map((v) => <tr key={v.id} className="border-t border-gray-50"><td className="px-3 py-2 font-medium">{v.name}</td><td className="px-3 py-2 text-gray-600">{v.email ?? '—'}</td><td className="px-3 py-2 text-gray-600">{v.phone ?? '—'}</td><td className="px-3 py-2 text-gray-600">{v.termsDays} j</td></tr>)}
          {vendors.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-gray-400">Aucun fournisseur</td></tr>}</tbody></table>
    </div>
  )
}

interface FLine { accountId: string; description: string; amount: string; taxCodeId: string }
const emptyFLine = (): FLine => ({ accountId: '', description: '', amount: '', taxCodeId: '' })

function Bills({ bills, vendors, accounts, taxCodes, mutate }: { bills: Bill[]; vendors: Vendor[]; accounts: Account[]; taxCodes: TaxCode[]; mutate: (p: any) => Promise<boolean> }) {
  const [creating, setCreating] = useState(false)
  const [vendorId, setVendorId] = useState('')
  const [number, setNumber] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [lines, setLines] = useState<FLine[]>([emptyFLine()])
  const [payFor, setPayFor] = useState<Bill | null>(null)
  const [payAmount, setPayAmount] = useState('')

  const estTotal = lines.reduce((s, l) => {
    const a = parseFloat(l.amount) || 0
    const t = l.taxCodeId ? a * (taxCodes.find((c) => c.id === l.taxCodeId)?.rate ?? 0) : 0
    return s + a + t
  }, 0)

  async function save() {
    if (!vendorId) return
    const ok = await mutate({ action: 'bill:create', data: { vendorId, number, date, lines: lines.filter((l) => l.accountId && parseFloat(l.amount) > 0).map((l) => ({ accountId: l.accountId, description: l.description, amount: parseFloat(l.amount), taxCodeId: l.taxCodeId || null })) } })
    if (ok) { setCreating(false); setVendorId(''); setNumber(''); setLines([emptyFLine()]) }
  }
  async function pay() {
    if (!payFor) return
    if (await mutate({ action: 'bill:pay', id: payFor.id, amount: parseFloat(payAmount) })) { setPayFor(null); setPayAmount('') }
  }

  const expenseAccts = accounts.filter((a) => a.type === 'EXPENSE' || a.type === 'ASSET')

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-gray-900">Factures d'achat ({bills.length})</h3>
        <button onClick={() => setCreating((c) => !c)} className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700" disabled={vendors.length === 0}>+ Facture</button></div>
      {vendors.length === 0 && <p className="text-sm text-amber-600 mb-3">Ajoute d'abord un fournisseur.</p>}

      {creating && (
        <div className="mb-6 p-4 bg-gray-50 rounded-xl">
          <div className="flex flex-wrap gap-3 mb-3">
            <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm"><option value="">— Fournisseur * —</option>{vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
            <input placeholder="N° facture" value={number} onChange={(e) => setNumber(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-36" />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <table className="w-full text-sm mb-2"><thead><tr className="text-left text-gray-500 text-xs"><th className="py-1">Compte</th><th className="py-1">Description</th><th className="py-1 w-28 text-right">Montant HT</th><th className="py-1 w-32">Taxe</th><th /></tr></thead>
            <tbody>{lines.map((l, i) => (
              <tr key={i}>
                <td className="py-1 pr-2"><select value={l.accountId} onChange={(e) => setLines((ls) => ls.map((x, j) => j === i ? { ...x, accountId: e.target.value } : x))} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm"><option value="">— Compte —</option>{expenseAccts.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}</select></td>
                <td className="py-1 pr-2"><input value={l.description} onChange={(e) => setLines((ls) => ls.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" /></td>
                <td className="py-1 pr-2"><input value={l.amount} onChange={(e) => setLines((ls) => ls.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right" placeholder="0.00" /></td>
                <td className="py-1 pr-2"><select value={l.taxCodeId} onChange={(e) => setLines((ls) => ls.map((x, j) => j === i ? { ...x, taxCodeId: e.target.value } : x))} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm"><option value="">Aucune</option>{taxCodes.map((t) => <option key={t.id} value={t.id}>{t.code}</option>)}</select></td>
                <td className="py-1">{lines.length > 1 && <button onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} className="text-red-400 text-xs">✕</button>}</td>
              </tr>
            ))}</tbody></table>
          <div className="flex items-center justify-between">
            <button onClick={() => setLines((ls) => [...ls, emptyFLine()])} className="text-xs text-indigo-600 hover:underline">+ Ligne</button>
            <span className="text-sm text-gray-600">Total estimé (taxes incl.) : <strong>{money(estTotal)}</strong></span>
          </div>
          <div className="flex justify-end gap-2 mt-3"><button onClick={() => setCreating(false)} className="px-4 py-2 text-sm text-gray-600">Annuler</button><button onClick={save} disabled={!vendorId} className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">Enregistrer la facture</button></div>
        </div>
      )}

      <table className="w-full text-sm"><thead><tr className="bg-gray-50 text-left text-gray-500"><th className="px-3 py-2 font-medium">Fournisseur</th><th className="px-3 py-2 font-medium">N°</th><th className="px-3 py-2 font-medium">Date</th><th className="px-3 py-2 font-medium text-right">Total</th><th className="px-3 py-2 font-medium text-right">Payé</th><th className="px-3 py-2 font-medium">Statut</th><th /></tr></thead>
        <tbody>{bills.map((b) => (
          <tr key={b.id} className="border-t border-gray-50">
            <td className="px-3 py-2 font-medium">{b.vendor.name}</td><td className="px-3 py-2 font-mono text-xs">{b.number ?? '—'}</td><td className="px-3 py-2">{b.date.slice(0, 10)}</td>
            <td className="px-3 py-2 text-right">{money(b.total)}</td><td className="px-3 py-2 text-right">{money(b.paidAmount)}</td>
            <td className="px-3 py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${b.status === 'PAID' ? 'bg-green-100 text-green-700' : b.status === 'PARTIAL' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{b.status === 'PAID' ? 'Payée' : b.status === 'PARTIAL' ? 'Partielle' : 'Impayée'}</span></td>
            <td className="px-3 py-2 text-right">{b.status !== 'PAID' && <button onClick={() => { setPayFor(b); setPayAmount(String(Math.round((b.total - b.paidAmount) * 100) / 100)) }} className="text-green-600 hover:underline text-xs">Payer</button>}</td>
          </tr>
        ))}
        {bills.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-gray-400">Aucune facture d'achat</td></tr>}</tbody></table>

      {payFor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setPayFor(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-1">Payer {payFor.vendor.name}</h3>
            <p className="text-xs text-gray-500 mb-4">Solde : {money(payFor.total - payFor.paidAmount)}</p>
            <input value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4" placeholder="Montant" />
            <div className="flex justify-end gap-2"><button onClick={() => setPayFor(null)} className="px-4 py-2 text-sm text-gray-600">Annuler</button><button onClick={pay} className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-green-700">Confirmer</button></div>
          </div>
        </div>
      )}
    </div>
  )
}

function Expenses({ accounts, taxCodes, mutate }: { accounts: Account[]; taxCodes: TaxCode[]; mutate: (p: any) => Promise<boolean> }) {
  const [f, setF] = useState({ date: new Date().toISOString().slice(0, 10), vendorName: '', accountId: '', amount: '', taxCodeId: '' })
  const expenseAccts = accounts.filter((a) => a.type === 'EXPENSE' || a.type === 'ASSET')
  async function add() { if (f.accountId && parseFloat(f.amount) > 0 && await mutate({ action: 'expense:create', data: f })) setF({ date: new Date().toISOString().slice(0, 10), vendorName: '', accountId: '', amount: '', taxCodeId: '' }) }
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="font-semibold text-gray-900 mb-1">Dépense au comptant</h3>
      <p className="text-xs text-gray-500 mb-4">Sortie d'argent immédiate (Dr charge + CTI · Cr Encaisse). Pour un cycle de facture, utilise « Factures d'achat ».</p>
      <div className="flex flex-wrap gap-2 items-end">
        <div><label className="block text-xs text-gray-500 mb-0.5">Date</label><input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
        <div className="flex-1 min-w-40"><label className="block text-xs text-gray-500 mb-0.5">Bénéficiaire</label><input value={f.vendorName} onChange={(e) => setF({ ...f, vendorName: e.target.value })} placeholder="Ex. Hydro-Québec" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
        <div><label className="block text-xs text-gray-500 mb-0.5">Compte de charge</label><select value={f.accountId} onChange={(e) => setF({ ...f, accountId: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm"><option value="">— Compte —</option>{expenseAccts.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}</select></div>
        <div><label className="block text-xs text-gray-500 mb-0.5">Montant HT</label><input value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder="0.00" className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-28 text-right" /></div>
        <div><label className="block text-xs text-gray-500 mb-0.5">Taxe</label><select value={f.taxCodeId} onChange={(e) => setF({ ...f, taxCodeId: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm"><option value="">Aucune</option>{taxCodes.map((t) => <option key={t.id} value={t.id}>{t.code}</option>)}</select></div>
        <button onClick={add} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">Enregistrer</button>
      </div>
    </div>
  )
}

function Aging({ aging }: { aging: any }) {
  const rows = aging?.rows ?? []; const totals = aging?.totals
  if (!rows.length) return <div className="bg-white border border-gray-200 rounded-xl p-6 py-12 text-center text-gray-400">Aucun solde fournisseur impayé. 🎉</div>
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Âge des comptes fournisseurs</h3>
      <table className="w-full text-sm"><thead><tr className="bg-gray-50 text-left text-gray-500"><th className="px-3 py-2 font-medium">Fournisseur</th><th className="px-3 py-2 font-medium text-right">0-30 j</th><th className="px-3 py-2 font-medium text-right">31-60 j</th><th className="px-3 py-2 font-medium text-right">61-90 j</th><th className="px-3 py-2 font-medium text-right">90+ j</th><th className="px-3 py-2 font-medium text-right">Total</th></tr></thead>
        <tbody>{rows.map((r: any, i: number) => <tr key={i} className="border-t border-gray-50"><td className="px-3 py-2">{r.vendor}</td><td className="px-3 py-2 text-right">{money(r.current)}</td><td className="px-3 py-2 text-right">{money(r.d31_60)}</td><td className="px-3 py-2 text-right">{money(r.d61_90)}</td><td className="px-3 py-2 text-right">{money(r.d90plus)}</td><td className="px-3 py-2 text-right font-bold">{money(r.total)}</td></tr>)}
          {totals && <tr className="border-t-2 border-gray-200 font-bold"><td className="px-3 py-2">TOTAL</td><td className="px-3 py-2 text-right">{money(totals.current)}</td><td className="px-3 py-2 text-right">{money(totals.d31_60)}</td><td className="px-3 py-2 text-right">{money(totals.d61_90)}</td><td className="px-3 py-2 text-right">{money(totals.d90plus)}</td><td className="px-3 py-2 text-right">{money(totals.total)}</td></tr>}</tbody></table>
    </div>
  )
}
