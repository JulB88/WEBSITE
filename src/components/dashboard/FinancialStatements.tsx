'use client'

import { useEffect, useState, useCallback } from 'react'

const money = (n: number) => (n ?? 0).toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $'

interface Line { code: string; name: string; amount: number }
interface Section { title: string; lines: Line[]; total: number }

export default function FinancialStatements({ from, to }: { from: string; to: string }) {
  const [view, setView] = useState<'balance' | 'income'>('income')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard/accounting?report=${view}&from=${from}&to=${to}`)
      setData((await res.json()).statement)
    } finally { setLoading(false) }
  }, [view, from, to])
  useEffect(() => { load() }, [load])

  const SectionBlock = ({ s }: { s: Section }) => (
    <div className="mb-5">
      <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide border-b-2 border-gray-800 pb-1 mb-2">{s.title}</h4>
      {s.lines.length === 0 && <p className="text-xs text-gray-400 py-1">Aucun montant</p>}
      {s.lines.map((l) => (
        <div key={l.code} className="flex justify-between py-1 text-sm">
          <span className="text-gray-600"><span className="font-mono text-xs text-gray-400 mr-2">{l.code}</span>{l.name}</span>
          <span className="text-gray-900">{money(l.amount)}</span>
        </div>
      ))}
      <div className="flex justify-between py-1.5 mt-1 border-t border-gray-200 text-sm font-bold">
        <span>Total {s.title.toLowerCase()}</span><span>{money(s.total)}</span>
      </div>
    </div>
  )

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex gap-2 mb-5">
        <button onClick={() => setView('income')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${view === 'income' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          État des résultats
        </button>
        <button onClick={() => setView('balance')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${view === 'balance' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          Bilan
        </button>
      </div>

      {loading || !data ? (
        <div className="py-16 text-center text-gray-400">Chargement…</div>
      ) : view === 'income' ? (
        <div className="max-w-2xl">
          <p className="text-xs text-gray-400 mb-4">Du {data.from} au {data.to}</p>
          <SectionBlock s={data.revenue} />
          <SectionBlock s={data.expenses} />
          <div className="flex justify-between py-3 border-t-2 border-gray-800 text-base font-bold">
            <span>Bénéfice net</span>
            <span className={data.netIncome >= 0 ? 'text-green-700' : 'text-red-600'}>{money(data.netIncome)}</span>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl">
          <p className="text-xs text-gray-400 mb-4">En date du {data.asOf}</p>
          <SectionBlock s={data.assets} />
          <div className="flex justify-between py-2 mb-5 border-t-2 border-gray-800 text-sm font-bold">
            <span>TOTAL DE L'ACTIF</span><span>{money(data.totalAssets)}</span>
          </div>
          <SectionBlock s={data.liabilities} />
          <SectionBlock s={data.equity} />
          <div className="flex justify-between py-1 text-sm">
            <span className="text-gray-600">Résultat de la période</span>
            <span className="text-gray-900">{money(data.netIncome)}</span>
          </div>
          <div className="flex justify-between py-2 border-t-2 border-gray-800 text-sm font-bold">
            <span>TOTAL PASSIF + CAPITAUX</span><span>{money(data.totalLiabEquity)}</span>
          </div>
          <p className={`text-sm mt-3 font-medium ${data.balanced ? 'text-green-600' : 'text-red-600'}`}>
            {data.balanced ? '✓ Bilan équilibré (Actif = Passif + Capitaux propres)' : '✗ Bilan déséquilibré'}
          </p>
        </div>
      )}
    </div>
  )
}
