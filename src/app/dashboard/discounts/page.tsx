'use client'

import { useEffect, useState } from 'react'

interface Category { id: string; name: string; parentId: string | null; children?: Category[] }
interface PriceList { id: string; name: string }
interface Discount {
  id: string
  discountPercent: number
  createdAt: string
  category: { id: string; name: string; parentId: string | null }
  priceList: { id: string; name: string } | null
}

const EMPTY_FORM = { categoryId: '', priceListId: '', discountPercent: '10' }

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [priceLists, setPriceLists] = useState<PriceList[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editDiscount, setEditDiscount] = useState<Discount | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function fetchAll() {
    setLoading(true)
    try {
      const [dRes, cRes, plRes] = await Promise.all([
        fetch('/api/dashboard/discounts'),
        fetch('/api/dashboard/categories'),
        fetch('/api/admin/price-lists'),
      ])
      const [dData, cData, plData] = await Promise.all([dRes.json(), cRes.json(), plRes.json()])
      setDiscounts(Array.isArray(dData) ? dData : [])
      setCategories(Array.isArray(cData) ? cData : [])
      setPriceLists(plData.priceLists ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  // Flat category list for select
  const flatCategories: { id: string; label: string }[] = []
  for (const cat of categories) {
    flatCategories.push({ id: cat.id, label: cat.name })
    for (const sub of cat.children ?? []) {
      flatCategories.push({ id: sub.id, label: `  └ ${sub.name}` })
    }
  }

  function openCreate() {
    setEditDiscount(null)
    setForm(EMPTY_FORM)
    setError('')
    setShowModal(true)
  }

  function openEdit(d: Discount) {
    setEditDiscount(d)
    setForm({
      categoryId: d.category.id,
      priceListId: d.priceList?.id ?? '',
      discountPercent: String(d.discountPercent),
    })
    setError('')
    setShowModal(true)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const url = editDiscount ? `/api/dashboard/discounts/${editDiscount.id}` : '/api/dashboard/discounts'
      const method = editDiscount ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: form.categoryId || undefined,
          priceListId: form.priceListId || null,
          discountPercent: form.discountPercent,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Something went wrong')
        return
      }
      setShowModal(false)
      fetchAll()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(d: Discount) {
    if (!confirm('Delete this discount rule?')) return
    await fetch(`/api/dashboard/discounts/${d.id}`, { method: 'DELETE' })
    fetchAll()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Category Discounts</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Apply % off to a category — scoped to a price list or global for all customers
          </p>
        </div>
        <button
          onClick={openCreate}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          + New Discount
        </button>
      </div>

      {/* Info card */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-6 text-sm text-amber-800">
        <strong>Resolution order:</strong> Product override → Sub-category scoped → Parent category scoped → Sub-category global → Parent category global → Price list % → Customer direct %
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-gray-400">Loading…</div>
        ) : discounts.length === 0 ? (
          <div className="py-20 text-center text-gray-400">No discount rules yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Category</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Price List</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Discount</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Created</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {discounts.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-gray-900">{d.category.name}</p>
                    {d.category.parentId && (
                      <p className="text-xs text-gray-400">sub-category</p>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {d.priceList ? (
                      <span className="inline-flex text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        {d.priceList.name}
                      </span>
                    ) : (
                      <span className="inline-flex text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        All customers
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-bold text-green-700">{d.discountPercent}% off</span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-400">
                    {new Date(d.createdAt).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3.5 text-right space-x-2">
                    <button onClick={() => openEdit(d)} className="text-xs text-indigo-600 hover:underline">Edit</button>
                    <button onClick={() => handleDelete(d)} className="text-xs text-red-500 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">{editDiscount ? 'Edit Discount' : 'New Discount Rule'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm(f => ({ ...f, categoryId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={!!editDiscount}
                >
                  <option value="">Select category…</option>
                  {flatCategories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price List (optional)</label>
                <select
                  value={form.priceListId}
                  onChange={(e) => setForm(f => ({ ...f, priceListId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All customers (global)</option>
                  {priceLists.map(pl => <option key={pl.id} value={pl.id}>{pl.name}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1">Leave blank to apply to everyone. Select a price list to scope it.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount % *</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={form.discountPercent}
                  onChange={(e) => setForm(f => ({ ...f, discountPercent: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : editDiscount ? 'Save Changes' : 'Create Rule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
