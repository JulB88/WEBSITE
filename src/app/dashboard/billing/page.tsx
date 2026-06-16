'use client'

import { useEffect, useState, useCallback } from 'react'

interface Payment {
  id: string
  amount: number
  method: string
  note: string | null
  recordedBy: string | null
  createdAt: string
}

interface BillingOrder {
  id: string
  totalAmount: number
  paidAmount: number
  paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID'
  invoiceNo: string | null
  invoicedAt: string | null
  status: string
  createdAt: string
  user: { name: string | null; email: string }
  businessCustomer: { id: string; companyName: string; creditLimit: number } | null
  payments: Payment[]
  orderItems: { quantity: number; unitPrice: number; product: { name: string } }[]
}

const fmt = (n: number) => `${n.toFixed(2)} $`

const PAYMENT_METHODS = [
  { value: 'cheque',   label: 'Chèque' },
  { value: 'virement', label: 'Virement bancaire' },
  { value: 'carte',    label: 'Carte' },
  { value: 'comptant', label: 'Comptant' },
  { value: 'autre',    label: 'Autre' },
]

export default function BillingPage() {
  const [orders, setOrders] = useState<BillingOrder[]>([])
  const [total, setTotal] = useState(0)
  const [totalOutstanding, setTotalOutstanding] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [invoicedFilter, setInvoicedFilter] = useState('')   // '' | 'true' | 'false'
  const [statusFilter, setStatusFilter] = useState('')        // '' | UNPAID | PARTIAL | PAID
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Modal paiement
  const [payOrder, setPayOrder] = useState<BillingOrder | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('cheque')
  const [payNote, setPayNote] = useState('')
  const [paySaving, setPaySaving] = useState(false)
  const [payError, setPayError] = useState('')

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' })
      if (invoicedFilter) params.set('invoiced', invoicedFilter)
      if (statusFilter) params.set('paymentStatus', statusFilter)
      const res = await fetch(`/api/dashboard/billing?${params}`)
      const data = await res.json()
      setOrders(data.orders ?? [])
      setTotal(data.total ?? 0)
      setPages(data.pages ?? 1)
      setTotalOutstanding(data.totalOutstanding ?? 0)
    } finally {
      setLoading(false)
    }
  }, [page, invoicedFilter, statusFilter])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  function flash(msg: string) {
    setMessage(msg)
    setTimeout(() => setMessage(''), 5000)
  }

  async function handleInvoice(order: BillingOrder) {
    if (!confirm(`Facturer la commande de ${order.businessCustomer?.companyName ?? order.user.email} (${fmt(order.totalAmount)}) ?\nUne facture finale sera envoyée au client par courriel.`)) return
    const res = await fetch(`/api/dashboard/billing/${order.id}/invoice`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      flash(data.message)
      fetchOrders()
    } else {
      flash(`Erreur : ${data.error}`)
    }
  }

  function openPayment(order: BillingOrder) {
    setPayOrder(order)
    setPayAmount(String(Math.round((order.totalAmount - order.paidAmount) * 100) / 100))
    setPayMethod('cheque')
    setPayNote('')
    setPayError('')
  }

  async function handlePayment() {
    if (!payOrder) return
    setPaySaving(true)
    setPayError('')
    try {
      const res = await fetch(`/api/dashboard/billing/${payOrder.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(payAmount), method: payMethod, note: payNote || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPayError(data.error ?? 'Erreur')
        return
      }
      setPayOrder(null)
      flash(data.message)
      fetchOrders()
    } finally {
      setPaySaving(false)
    }
  }

  async function handleRunStatements() {
    if (!confirm('Générer et envoyer les états de compte du mois précédent à tous les clients concernés ?')) return
    const res = await fetch('/api/admin/run-statements', { method: 'POST' })
    const data = await res.json()
    flash(res.ok ? data.message : `Erreur : ${data.error}`)
  }

  const statusBadge = (o: BillingOrder) => {
    if (o.paymentStatus === 'PAID')
      return <span className="inline-flex text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Payée</span>
    if (o.paymentStatus === 'PARTIAL')
      return <span className="inline-flex text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Partielle — {fmt(o.paidAmount)} / {fmt(o.totalAmount)}</span>
    return <span className="inline-flex text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">Impayée</span>
  }

  const invoiceBadge = (o: BillingOrder) => {
    if (o.invoicedAt)
      return (
        <div>
          <span className="inline-flex text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">✓ Facturée</span>
          <p className="text-xs text-gray-400 mt-0.5 font-mono">{o.invoiceNo}</p>
          <p className="text-xs text-gray-400">{new Date(o.invoicedAt).toLocaleDateString('fr-CA')}</p>
        </div>
      )
    return <span className="inline-flex text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">À facturer</span>
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturation — Comptes clients</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {total} commande(s) au compte • Solde impayé global :{' '}
            <span className="font-semibold text-red-600">{fmt(totalOutstanding)}</span>
          </p>
        </div>
        <button
          onClick={handleRunStatements}
          className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          📨 Envoyer les états de compte
        </button>
      </div>

      {message && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm">
          {message}
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-3 mb-5">
        <select
          value={invoicedFilter}
          onChange={(e) => { setInvoicedFilter(e.target.value); setPage(1) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Facturée ou non</option>
          <option value="false">À facturer</option>
          <option value="true">Facturées</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Tous les paiements</option>
          <option value="UNPAID">Impayées</option>
          <option value="PARTIAL">Partielles</option>
          <option value="PAID">Payées</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-gray-400">Chargement…</div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center text-gray-400">Aucune commande au compte</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Client</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Date</th>
                <th className="px-5 py-3 text-right font-medium text-gray-500">Montant</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Facturation</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Paiement</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((o) => (
                <>
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-gray-900">{o.businessCustomer?.companyName ?? '—'}</p>
                      <p className="text-xs text-gray-400">{o.user.email}</p>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">
                      {new Date(o.createdAt).toLocaleDateString('fr-CA')}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-gray-900">{fmt(o.totalAmount)}</td>
                    <td className="px-5 py-3.5">{invoiceBadge(o)}</td>
                    <td className="px-5 py-3.5">{statusBadge(o)}</td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap space-x-2">
                      <button
                        onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
                        className="text-gray-500 hover:underline text-xs"
                      >
                        {expandedId === o.id ? 'Masquer' : 'Détails'}
                      </button>
                      {!o.invoicedAt && o.status !== 'CANCELLED' && (
                        <button onClick={() => handleInvoice(o)} className="text-indigo-600 hover:underline text-xs font-medium">
                          Facturer
                        </button>
                      )}
                      {o.paymentStatus !== 'PAID' && o.status !== 'CANCELLED' && (
                        <button onClick={() => openPayment(o)} className="text-green-600 hover:underline text-xs font-medium">
                          + Paiement
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedId === o.id && (
                    <tr key={`${o.id}-detail`}>
                      <td colSpan={6} className="px-8 py-4 bg-gray-50">
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Articles</p>
                            {o.orderItems.map((oi, i) => (
                              <p key={i} className="text-xs text-gray-600">
                                {oi.quantity} × {oi.product.name} — {fmt(oi.unitPrice * oi.quantity)}
                              </p>
                            ))}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                              Paiements reçus ({fmt(o.paidAmount)} / {fmt(o.totalAmount)})
                            </p>
                            {o.payments.length === 0 ? (
                              <p className="text-xs text-gray-400">Aucun paiement enregistré</p>
                            ) : (
                              o.payments.map((p) => (
                                <p key={p.id} className="text-xs text-gray-600">
                                  {new Date(p.createdAt).toLocaleDateString('fr-CA')} — {fmt(p.amount)} ({p.method})
                                  {p.note ? ` — ${p.note}` : ''}
                                  {p.recordedBy ? ` — par ${p.recordedBy}` : ''}
                                </p>
                              ))
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="text-sm text-gray-500 disabled:opacity-40">← Préc.</button>
            <span className="text-sm text-gray-500">Page {page} / {pages}</span>
            <button disabled={page === pages} onClick={() => setPage(p => p + 1)} className="text-sm text-gray-500 disabled:opacity-40">Suiv. →</button>
          </div>
        )}
      </div>

      {/* Modal paiement */}
      {payOrder && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Enregistrer un paiement</h2>
              <button onClick={() => setPayOrder(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm">
                <p className="font-medium text-gray-900">{payOrder.businessCustomer?.companyName ?? payOrder.user.email}</p>
                <p className="text-gray-500 text-xs mt-1">
                  Total : {fmt(payOrder.totalAmount)} • Déjà payé : {fmt(payOrder.paidAmount)} •{' '}
                  <span className="font-semibold text-red-600">
                    Reste : {fmt(Math.round((payOrder.totalAmount - payOrder.paidAmount) * 100) / 100)}
                  </span>
                </p>
              </div>
              {payError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{payError}</p>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Montant reçu ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-400 mt-1">Un montant inférieur au solde = paiement partiel.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mode de paiement</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (n° de chèque, référence…)</label>
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t">
              <button onClick={() => setPayOrder(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Annuler</button>
              <button
                onClick={handlePayment}
                disabled={paySaving || !payAmount}
                className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {paySaving ? 'Enregistrement…' : 'Confirmer le paiement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
