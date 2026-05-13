'use client'

import { useState, useEffect, useCallback } from 'react'

interface PriceList {
  id: string
  name: string
  discountPercent: number
  isDefault: boolean
  createdAt: string
  _count: { businessCustomers: number; priceListItems: number }
}

export default function AdminPriceListsPage() {
  const [priceLists, setPriceLists] = useState<PriceList[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', discountPercent: 0, isDefault: false })
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', discountPercent: 0, isDefault: false })
  const [error, setError] = useState('')

  const fetchPriceLists = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/price-lists')
      const data = await res.json()
      setPriceLists(data || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPriceLists() }, [fetchPriceLists])

  const handleCreate = async () => {
    if (!createForm.name.trim()) { setError('Name is required'); return }
    setCreating(true)
    setError('')
    try {
      const res = await fetch('/api/admin/price-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      })
      const data = await res.json()
      if (res.ok) {
        setShowCreateForm(false)
        setCreateForm({ name: '', discountPercent: 0, isDefault: false })
        fetchPriceLists()
      } else {
        setError(data.error || 'Failed to create')
      }
    } finally {
      setCreating(false)
    }
  }

  const handleEdit = (pl: PriceList) => {
    setEditingId(pl.id)
    setEditForm({ name: pl.name, discountPercent: pl.discountPercent, isDefault: pl.isDefault })
  }

  const handleSaveEdit = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/price-lists/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (res.ok) {
        setEditingId(null)
        fetchPriceLists()
      }
    } catch {
      alert('Failed to save')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this price list? Customers assigned to it will lose their price list.')) return
    await fetch(`/api/admin/price-lists/${id}`, { method: 'DELETE' })
    fetchPriceLists()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Price Lists</h1>
          <p className="text-gray-500 text-sm mt-1">Create and manage custom pricing for business customers</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Price List
        </button>
      </div>

      {/* How pricing works info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <h3 className="font-semibold text-blue-900 text-sm mb-1">How business pricing works</h3>
        <p className="text-blue-700 text-sm">
          Each business customer can have a <strong>direct discount %</strong> (applied to all products) OR be assigned a <strong>price list</strong> (with its own discount % and optional per-product override prices). If both exist, the price list takes precedence.
        </p>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Create New Price List</h2>
          {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="e.g. Gold Partners"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount % (applied to all products)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={createForm.discountPercent}
                onChange={(e) => setCreateForm({ ...createForm, discountPercent: parseFloat(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input
                type="checkbox"
                id="isDefault"
                checked={createForm.isDefault}
                onChange={(e) => setCreateForm({ ...createForm, isDefault: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="isDefault" className="text-sm text-gray-700">Set as default</label>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              {creating ? 'Creating…' : 'Create Price List'}
            </button>
            <button
              onClick={() => { setShowCreateForm(false); setError('') }}
              className="text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Price Lists table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Name</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Discount %</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Default</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Customers</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Product Overrides</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Loading…</td></tr>
              ) : priceLists.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    No price lists yet. Create one to offer custom pricing to business customers.
                  </td>
                </tr>
              ) : (
                priceLists.map((pl) => (
                  <tr key={pl.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {editingId === pl.id ? (
                        <input
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="border border-gray-300 rounded px-2 py-1 text-sm w-48"
                        />
                      ) : (
                        <span className="font-medium text-gray-900">{pl.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editingId === pl.id ? (
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={editForm.discountPercent}
                          onChange={(e) => setEditForm({ ...editForm, discountPercent: parseFloat(e.target.value) })}
                          className="border border-gray-300 rounded px-2 py-1 text-sm w-20 text-right"
                        />
                      ) : (
                        <span className="font-semibold text-blue-600">{pl.discountPercent}%</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {editingId === pl.id ? (
                        <input
                          type="checkbox"
                          checked={editForm.isDefault}
                          onChange={(e) => setEditForm({ ...editForm, isDefault: e.target.checked })}
                          className="rounded"
                        />
                      ) : (
                        pl.isDefault ? (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">Default</span>
                        ) : '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{pl._count.businessCustomers}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{pl._count.priceListItems}</td>
                    <td className="px-4 py-3 text-right">
                      {editingId === pl.id ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleSaveEdit(pl.id)}
                            className="text-green-600 hover:text-green-700 font-medium text-xs"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-gray-400 hover:text-gray-600 font-medium text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => handleEdit(pl)}
                            className="text-blue-600 hover:text-blue-700 font-medium text-xs"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(pl.id)}
                            className="text-red-500 hover:text-red-600 font-medium text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
