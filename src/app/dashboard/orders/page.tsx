'use client'

import { useEffect, useState, useCallback } from 'react'

interface OrderItem {
  id: string
  quantity: number
  unitPrice: number
  product: { id: string; name: string; bcItemNo: string; imageUrl?: string | null }
}

interface Order {
  id: string
  status: string
  totalAmount: number
  bcSalesOrderNo: string | null
  createdAt: string
  user: { id: string; email: string; name: string | null }
  businessCustomer: { id: string; companyName: string } | null
  orderItems: OrderItem[]
}

const STATUSES = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  PROCESSING: 'bg-blue-100 text-blue-700',
  SHIPPED: 'bg-indigo-100 text-indigo-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Order | null>(null)
  const [editStatus, setEditStatus] = useState('')
  const [editBcNo, setEditBcNo] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/dashboard/orders?${params}`)
      const data = await res.json()
      setOrders(data.orders ?? [])
      setTotal(data.total ?? 0)
      setPages(data.pages ?? 1)
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  function openOrder(o: Order) {
    setSelected(o)
    setEditStatus(o.status)
    setEditBcNo(o.bcSalesOrderNo ?? '')
  }

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    try {
      const res = await fetch(`/api/dashboard/orders/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: editStatus, bcSalesOrderNo: editBcNo || null }),
      })
      if (res.ok) {
        setSelected(null)
        fetchOrders()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-500 text-sm mt-0.5">{total} orders total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <input
          type="search"
          placeholder="Search order ID, email, BC order…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-gray-400">Loading…</div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center text-gray-400">No orders found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Order</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Customer</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Status</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">BC Order</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Total</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Date</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3.5 font-mono text-xs text-gray-500">{o.id.slice(0, 12)}…</td>
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-gray-900">{o.businessCustomer?.companyName ?? o.user.name ?? o.user.email}</p>
                    {o.businessCustomer && <p className="text-xs text-gray-400">{o.user.email}</p>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[o.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-gray-500">{o.bcSalesOrderNo ?? '—'}</td>
                  <td className="px-5 py-3.5 font-semibold text-gray-900">€{o.totalAmount.toFixed(2)}</td>
                  <td className="px-5 py-3.5 text-xs text-gray-400">
                    {new Date(o.createdAt).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button onClick={() => openOrder(o)} className="text-xs text-indigo-600 hover:underline">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="text-sm text-gray-500 disabled:opacity-40">← Prev</button>
            <span className="text-sm text-gray-500">Page {page} of {pages}</span>
            <button disabled={page === pages} onClick={() => setPage(p => p + 1)} className="text-sm text-gray-500 disabled:opacity-40">Next →</button>
          </div>
        )}
      </div>

      {/* Order detail drawer */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex justify-end z-50">
          <div className="bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Order Details</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            <div className="flex-1 px-6 py-5 space-y-5">
              {/* Customer */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Customer</p>
                <p className="font-medium text-gray-900">{selected.businessCustomer?.companyName ?? selected.user.name ?? '—'}</p>
                <p className="text-sm text-gray-500">{selected.user.email}</p>
              </div>

              {/* Items */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Items ({selected.orderItems.length})</p>
                <div className="space-y-2">
                  {selected.orderItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium text-gray-900">{item.product.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{item.product.bcItemNo} × {item.quantity}</p>
                      </div>
                      <p className="font-medium text-gray-900">€{(item.unitPrice * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between font-bold text-gray-900 border-t mt-3 pt-3">
                  <span>Total</span>
                  <span>€{selected.totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Edit */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Update Order</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">BC Sales Order No.</label>
                  <input
                    type="text"
                    value={editBcNo}
                    onChange={(e) => setEditBcNo(e.target.value)}
                    placeholder="e.g. SO-12345"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t">
              <button onClick={() => setSelected(null)} className="px-4 py-2 text-sm text-gray-600">Close</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
