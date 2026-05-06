'use client'

import { useEffect, useState } from 'react'

interface PriceListItem {
  id: string
  productId: string
  overridePrice: number | null
  product: { id: string; name: string; bcItemNo: string; price: number }
}

interface PriceList {
  id: string
  name: string
  discountPercent: number
  isDefault: boolean
  createdAt: string
  _count?: { businessCustomers: number; priceListItems: number }
  priceListItems?: PriceListItem[]
}

const EMPTY_FORM = { name: '', discountPercent: '0', isDefault: false }

export default function PriceListsPage() {
  const [priceLists, setPriceLists] = useState<PriceList[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editPL, setEditPL] = useState<PriceList | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  async function fetchPriceLists() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/price-lists?include=counts')
      const data = await res.json()
      setPriceLists(data.priceLists ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPriceLists() }, [])

  function openCreate() {
    setEditPL(null)
    setForm(EMPTY_FORM)
    setError('')
    setShowModal(true)
  }

  function openEdit(pl: PriceList) {
    setEditPL(pl)
    setForm({ name: pl.name, discountPercent: String(pl.discountPercent), isDefault: pl.isDefault })
    setError('')
    setShowModal(true)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const url = editPL ? `/api/admin/price-lists/${editPL.id}` : '/api/admin/price-lists'
      const method = editPL ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, discountPercent: parseFloat(form.discountPercent) || 0, isDefault: form.isDefault }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Something went wrong')
        return
      }
      setShowModal(false)
      fetchPriceLists()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(pl: PriceList) {
    if (!confirm(`Delete "${pl.name}"?`)) return
    const res = await fetch(`/api/admin/price-lists/${pl.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json()
      alert(d.error ?? 'Delete failed')
      return
    }
    fetchPriceLists()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Price Lists</h1>
          <p className="text-gray-500 text-sm mt-0.5">Assign to business customers for custom pricing</p>
        </div>
        <button onClick={openCreate} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
          + New Price List
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-400">Loading…</div>
      ) : priceLists.length === 0 ? (
        <div className="py-20 text-center text-gray-400">No price lists yet.</div>
      ) : (
        <div className="space-y-3">
          {priceLists.map((pl) => (
            <div key={pl.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl">💰</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{pl.name}</p>
                      {pl.isDefault && (
                        <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Default</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      {pl.discountPercent > 0 ? `${pl.discountPercent}% off all products` : 'No global discount'}
                      {pl._count && ` · ${pl._count.businessCustomers} customer(s) · ${pl._count.priceListItems} overrides`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setExpanded(expanded === pl.id ? null : pl.id)} className="text-xs text-gray-500 hover:underline">
                    {expanded === pl.id ? 'Hide items' : 'View items'}
                  </button>
                  <button onClick={() => openEdit(pl)} className="text-xs text-indigo-600 hover:underline">Edit</button>
                  <button onClick={() => handleDelete(pl)} className="text-xs text-red-500 hover:underline">Delete</button>
                </div>
              </div>

              {expanded === pl.id && (
                <PriceListItems priceListId={pl.id} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">{editPL ? 'Edit Price List' : 'New Price List'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Global Discount %</label>
                <input type="number" min="0" max="100" step="0.5" value={form.discountPercent}
                  onChange={(e) => setForm(f => ({ ...f, discountPercent: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <p className="text-xs text-gray-400 mt-1">Applied to all products unless overridden per-product or per-category</p>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="isDefault" checked={form.isDefault} onChange={(e) => setForm(f => ({ ...f, isDefault: e.target.checked }))} className="h-4 w-4 rounded text-indigo-600" />
                <label htmlFor="isDefault" className="text-sm text-gray-700">Set as default price list</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Saving…' : editPL ? 'Save Changes' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PriceListItems({ priceListId }: { priceListId: string }) {
  const [items, setItems] = useState<PriceListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [price, setPrice] = useState('')

  useEffect(() => {
    fetch(`/api/admin/price-lists/${priceListId}`)
      .then(r => r.json())
      .then(d => { setItems(d.priceListItems ?? []); setLoading(false) })
  }, [priceListId])

  async function saveOverride(itemId: string, productId: string) {
    const p = parseFloat(price)
    if (isNaN(p) || p < 0) return
    await fetch(`/api/admin/price-lists/${priceListId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, overridePrice: p }),
    })
    setEditing(null)
    fetch(`/api/admin/price-lists/${priceListId}`).then(r => r.json()).then(d => setItems(d.priceListItems ?? []))
  }

  if (loading) return <div className="px-5 py-3 text-sm text-gray-400 border-t">Loading items…</div>
  if (items.length === 0) return <div className="px-5 py-3 text-sm text-gray-400 border-t">No product-level overrides set.</div>

  return (
    <div className="border-t">
      <table className="w-full text-xs">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-5 py-2 text-left font-medium text-gray-500">Product</th>
            <th className="px-5 py-2 text-left font-medium text-gray-500">Base Price</th>
            <th className="px-5 py-2 text-left font-medium text-gray-500">Override Price</th>
            <th className="px-5 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {items.map((item) => (
            <tr key={item.id}>
              <td className="px-5 py-2">
                <p className="font-medium text-gray-800">{item.product.name}</p>
                <p className="text-gray-400 font-mono">{item.product.bcItemNo}</p>
              </td>
              <td className="px-5 py-2 text-gray-600">€{item.product.price.toFixed(2)}</td>
              <td className="px-5 py-2">
                {editing === item.id ? (
                  <input type="number" value={price} onChange={e => setPrice(e.target.value)}
                    className="w-24 border border-gray-300 rounded px-2 py-1 text-xs" autoFocus />
                ) : (
                  <span className="font-semibold text-gray-900">
                    {item.overridePrice != null ? `€${item.overridePrice.toFixed(2)}` : '—'}
                  </span>
                )}
              </td>
              <td className="px-5 py-2 text-right">
                {editing === item.id ? (
                  <button onClick={() => saveOverride(item.id, item.productId)} className="text-indigo-600 hover:underline mr-2">Save</button>
                ) : (
                  <button onClick={() => { setEditing(item.id); setPrice(String(item.overridePrice ?? item.product.price)) }} className="text-indigo-600 hover:underline">Edit</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
