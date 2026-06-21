'use client'

import { useEffect, useState, useCallback } from 'react'
import AccountingConfig from '@/components/dashboard/AccountingConfig'
import JournalEntries from '@/components/dashboard/JournalEntries'
import FinancialStatements from '@/components/dashboard/FinancialStatements'

type Tab = 'summary' | 'sales' | 'receipts' | 'tax' | 'aging' | 'entries' | 'journal' | 'trial' | 'statements' | 'config'

const TABS: { key: Tab; label: string }[] = [
  { key: 'summary',    label: 'Sommaire' },
  { key: 'sales',      label: 'Journal des ventes' },
  { key: 'receipts',   label: 'Encaissements' },
  { key: 'tax',        label: 'Taxes à remettre' },
  { key: 'aging',      label: 'Âge des comptes' },
  { key: 'entries',    label: 'Écritures' },
  { key: 'journal',    label: 'Grand livre' },
  { key: 'trial',      label: 'Balance de vérification' },
  { key: 'statements', label: 'États financiers' },
  { key: 'config',     label: '⚙ Paramètres' },
]

const money = (n: number) => (n ?? 0).toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $'

function monthRange(offset = 0) {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const to = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0)
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
}
function yearRange() {
  const y = new Date().getFullYear()
  return { from: `${y}-01-01`, to: `${y}-12-31` }
}

export default function AccountingPage() {
  const [tab, setTab] = useState<Tab>('summary')
  const init = monthRange(0)
  const [from, setFrom] = useState(init.from)
  const [to, setTo] = useState(init.to)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (tab === 'config' || tab === 'entries' || tab === 'statements') { setLoading(false); return } // ces panneaux gèrent leurs données
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard/accounting?report=${tab}&from=${from}&to=${to}`)
      setData(await res.json())
    } finally { setLoading(false) }
  }, [tab, from, to])

  useEffect(() => { load() }, [load])

  function exportCsv(filename: string, headers: string[], rows: (string | number)[][]) {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
    const csv = [headers, ...rows].map((r) => r.map(esc).join(',')).join('\r\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Comptabilité</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Cycle comptable de la facturation : journaux, taxes, âge des comptes et grand livre.
        </p>
      </div>

      {/* Période — masquée dans les onglets Paramètres / Écritures */}
      {tab !== 'config' && tab !== 'entries' && (
      <div className="flex flex-wrap items-end gap-3 mb-5 bg-white border border-gray-200 rounded-xl p-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Du</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Au</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex gap-1.5">
          {[
            { label: 'Ce mois', r: monthRange(0) },
            { label: 'Mois dernier', r: monthRange(-1) },
            { label: 'Cette année', r: yearRange() },
          ].map((p) => (
            <button key={p.label} onClick={() => { setFrom(p.r.from); setTo(p.r.to) }}
              className="text-xs border border-gray-200 rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-50">
              {p.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400 ml-auto self-center">
          {tab === 'aging' ? 'Solde en date d\'aujourd\'hui' : 'Selon la date de facturation'}
        </span>
      </div>
      )}

      {/* Onglets */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200 mb-5">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'config' ? (
        <AccountingConfig />
      ) : tab === 'entries' ? (
        <JournalEntries />
      ) : tab === 'statements' ? (
        <FinancialStatements from={from} to={to} />
      ) : loading ? (
        <div className="py-20 text-center text-gray-400">Chargement…</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          {tab === 'summary'  && <Summary data={data} />}
          {tab === 'sales'    && <SalesJournal data={data} onExport={exportCsv} />}
          {tab === 'receipts' && <Receipts data={data} onExport={exportCsv} />}
          {tab === 'tax'      && <TaxReport data={data} />}
          {tab === 'aging'    && <Aging data={data} onExport={exportCsv} />}
          {tab === 'journal'  && <Journal data={data} onExport={exportCsv} />}
          {tab === 'trial'    && <Trial data={data} />}
        </div>
      )}
    </div>
  )
}

// ─── Sommaire ──────────────────────────────────────────────────────────────────
function Summary({ data }: { data: any }) {
  const s = data?.summary
  if (!s) return <Empty />
  const cards = [
    { label: 'Ventes (sous-total)', value: money(s.salesSubtotal), sub: `${s.salesCount} facture(s)` },
    { label: 'TPS perçue', value: money(s.gstCollected) },
    { label: 'TVQ perçue', value: money(s.qstCollected) },
    { label: 'Ventes (total taxes incl.)', value: money(s.salesTotal) },
    { label: 'Encaissements', value: money(s.receipts), sub: `${s.receiptsCount} reçu(s)` },
    { label: 'Comptes clients (solde dû)', value: money(s.arOutstanding), accent: true },
  ]
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((c) => (
        <div key={c.label} className={`rounded-xl border p-4 ${c.accent ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50'}`}>
          <p className="text-xs text-gray-500">{c.label}</p>
          <p className={`text-xl font-bold mt-1 ${c.accent ? 'text-red-700' : 'text-gray-900'}`}>{c.value}</p>
          {c.sub && <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>}
        </div>
      ))}
    </div>
  )
}

// ─── Journal des ventes ──────────────────────────────────────────────────────────
function SalesJournal({ data, onExport }: { data: any; onExport: any }) {
  const rows = data?.rows ?? []
  if (!rows.length) return <Empty />
  const tot = (k: string) => money(rows.reduce((s: number, r: any) => s + r[k], 0))
  return (
    <>
      <ExportBar onClick={() => onExport('journal-ventes.csv',
        ['Date', 'Facture', 'Client', 'Mode', 'Sous-total', 'TPS', 'TVQ', 'Total'],
        rows.map((r: any) => [r.date, r.invoiceNo, r.customer, r.method, r.subtotal, r.gst, r.qst, r.total]))} />
      <Table head={['Date', 'Facture', 'Client', 'Mode', 'Sous-total', 'TPS', 'TVQ', 'Total']}>
        {rows.map((r: any, i: number) => (
          <tr key={i} className="border-t border-gray-50">
            <Td>{r.date}</Td><Td mono>{r.invoiceNo}</Td><Td>{r.customer}</Td><Td>{r.method}</Td>
            <Td right>{money(r.subtotal)}</Td><Td right>{money(r.gst)}</Td><Td right>{money(r.qst)}</Td><Td right bold>{money(r.total)}</Td>
          </tr>
        ))}
        <tr className="border-t-2 border-gray-200 font-bold">
          <Td>TOTAL</Td><Td></Td><Td></Td><Td></Td>
          <Td right>{tot('subtotal')}</Td><Td right>{tot('gst')}</Td><Td right>{tot('qst')}</Td><Td right>{tot('total')}</Td>
        </tr>
      </Table>
    </>
  )
}

// ─── Encaissements ───────────────────────────────────────────────────────────────
function Receipts({ data, onExport }: { data: any; onExport: any }) {
  const rows = data?.rows ?? []
  if (!rows.length) return <Empty />
  const total = money(rows.reduce((s: number, r: any) => s + r.amount, 0))
  return (
    <>
      <ExportBar onClick={() => onExport('encaissements.csv',
        ['Date', 'Client', 'Facture', 'Mode', 'Montant'],
        rows.map((r: any) => [r.date, r.customer, r.invoiceNo, r.method, r.amount]))} />
      <Table head={['Date', 'Client', 'Facture', 'Mode', 'Montant']}>
        {rows.map((r: any, i: number) => (
          <tr key={i} className="border-t border-gray-50">
            <Td>{r.date}</Td><Td>{r.customer}</Td><Td mono>{r.invoiceNo}</Td><Td>{r.method}</Td><Td right bold>{money(r.amount)}</Td>
          </tr>
        ))}
        <tr className="border-t-2 border-gray-200 font-bold"><Td>TOTAL</Td><Td></Td><Td></Td><Td></Td><Td right>{total}</Td></tr>
      </Table>
    </>
  )
}

// ─── Taxes à remettre ────────────────────────────────────────────────────────────
function TaxReport({ data }: { data: any }) {
  const r = data?.report
  if (!r) return <Empty />
  return (
    <div className="max-w-md space-y-3">
      <Line label="Ventes taxables (sous-total)" value={money(r.subtotal)} />
      <Line label={`TPS perçue${r.gstNumber ? ` (${r.gstNumber})` : ''}`} value={money(r.gst)} />
      <Line label={`TVQ perçue${r.qstNumber ? ` (${r.qstNumber})` : ''}`} value={money(r.qst)} />
      <div className="border-t-2 border-gray-800 pt-3">
        <Line label="Total à remettre (TPS + TVQ)" value={money(r.gst + r.qst)} bold accent />
      </div>
      <p className="text-xs text-gray-400">{r.count} facture(s) dans la période. Configure tes numéros d'inscription dans Paramètres → Taxes.</p>
    </div>
  )
}

// ─── Âge des comptes ─────────────────────────────────────────────────────────────
function Aging({ data, onExport }: { data: any; onExport: any }) {
  const rows = data?.rows ?? []
  const totals = data?.totals
  if (!rows.length) return <Empty msg="Aucun solde impayé. 🎉" />
  return (
    <>
      <ExportBar onClick={() => onExport('age-des-comptes.csv',
        ['Client', '0-30 j', '31-60 j', '61-90 j', '90+ j', 'Total'],
        rows.map((r: any) => [r.customer, r.current, r.d31_60, r.d61_90, r.d90plus, r.total]))} />
      <Table head={['Client', '0-30 j', '31-60 j', '61-90 j', '90+ j', 'Total']}>
        {rows.map((r: any, i: number) => (
          <tr key={i} className="border-t border-gray-50">
            <Td>{r.customer}</Td>
            <Td right>{money(r.current)}</Td><Td right>{money(r.d31_60)}</Td>
            <Td right>{money(r.d61_90)}</Td><Td right className={r.d90plus > 0 ? 'text-red-600 font-semibold' : ''}>{money(r.d90plus)}</Td>
            <Td right bold>{money(r.total)}</Td>
          </tr>
        ))}
        {totals && (
          <tr className="border-t-2 border-gray-200 font-bold">
            <Td>TOTAL</Td>
            <Td right>{money(totals.current)}</Td><Td right>{money(totals.d31_60)}</Td>
            <Td right>{money(totals.d61_90)}</Td><Td right>{money(totals.d90plus)}</Td><Td right>{money(totals.total)}</Td>
          </tr>
        )}
      </Table>
    </>
  )
}

// ─── Grand livre (écritures) ─────────────────────────────────────────────────────
function Journal({ data, onExport }: { data: any; onExport: any }) {
  const rows = data?.rows ?? []
  if (!rows.length) return <Empty />
  return (
    <>
      <ExportBar onClick={() => onExport('grand-livre.csv',
        ['Date', 'Réf.', 'Compte', 'Libellé', 'Débit', 'Crédit'],
        rows.map((r: any) => [r.date, r.ref, `${r.account} ${r.accountName}`, r.label, r.debit, r.credit]))} />
      <Table head={['Date', 'Réf.', 'Compte', 'Libellé', 'Débit', 'Crédit']}>
        {rows.map((r: any, i: number) => (
          <tr key={i} className="border-t border-gray-50">
            <Td>{r.date}</Td><Td mono>{r.ref}</Td><Td mono>{r.account} · {r.accountName}</Td><Td>{r.label}</Td>
            <Td right>{r.debit ? money(r.debit) : ''}</Td><Td right>{r.credit ? money(r.credit) : ''}</Td>
          </tr>
        ))}
      </Table>
    </>
  )
}

// ─── Balance de vérification ─────────────────────────────────────────────────────
function Trial({ data }: { data: any }) {
  const rows = data?.rows ?? []
  if (!rows.length) return <Empty />
  const balanced = Math.abs((data.totalDebit ?? 0) - (data.totalCredit ?? 0)) < 0.01
  return (
    <>
      <Table head={['Compte', 'Type', 'Débit', 'Crédit']}>
        {rows.map((r: any) => (
          <tr key={r.code} className="border-t border-gray-50">
            <Td mono>{r.code} · {r.name}</Td><Td>{r.type}</Td>
            <Td right>{r.debit ? money(r.debit) : ''}</Td><Td right>{r.credit ? money(r.credit) : ''}</Td>
          </tr>
        ))}
        <tr className="border-t-2 border-gray-200 font-bold">
          <Td>TOTAL</Td><Td></Td><Td right>{money(data.totalDebit)}</Td><Td right>{money(data.totalCredit)}</Td>
        </tr>
      </Table>
      <p className={`text-sm mt-3 font-medium ${balanced ? 'text-green-600' : 'text-red-600'}`}>
        {balanced ? '✓ Balance équilibrée (débits = crédits)' : '✗ Déséquilibre détecté'}
      </p>
    </>
  )
}

// ─── Sous-composants ─────────────────────────────────────────────────────────────
function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="bg-gray-50 text-left">
          {head.map((h, i) => <th key={i} className={`px-3 py-2.5 font-medium text-gray-500 ${i >= 4 || ['Débit','Crédit','Montant','Total'].includes(h) ? 'text-right' : ''}`}>{h}</th>)}
        </tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}
function Td({ children, right, bold, mono, className = '' }: { children?: React.ReactNode; right?: boolean; bold?: boolean; mono?: boolean; className?: string }) {
  return <td className={`px-3 py-2.5 ${right ? 'text-right' : ''} ${bold ? 'font-bold text-gray-900' : 'text-gray-700'} ${mono ? 'font-mono text-xs' : ''} ${className}`}>{children}</td>
}
function Line({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-sm ${bold ? 'font-bold' : 'text-gray-600'}`}>{label}</span>
      <span className={`${bold ? 'font-bold text-lg' : 'font-medium'} ${accent ? 'text-red-700' : 'text-gray-900'}`}>{value}</span>
    </div>
  )
}
function ExportBar({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex justify-end mb-3">
      <button onClick={onClick} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-50">
        ⬇ Exporter en CSV
      </button>
    </div>
  )
}
function Empty({ msg = 'Aucune donnée pour cette période.' }: { msg?: string }) {
  return <div className="py-16 text-center text-gray-400">{msg}</div>
}
