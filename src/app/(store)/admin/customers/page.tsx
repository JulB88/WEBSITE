'use client'

import { useState, useEffect, useCallback } from 'react'

interface BusinessCustomer {
  id: string
  companyName: string
  vatNumber: string | null
  discountPercent: number
  priceListId: string | null
  priceList: { name: string } | null
}

interface User {
  id: string
  name: string | null
  email: string
  role: string
  createdAt: string
  businessCustomer: BusinessCustomer | null
  _count: { orders: number }
}

interface PriceList {
  id: string
  name: string
  discountPercent: number
}

export default function AdminCustomersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [priceLists, setPriceLists] = useState<PriceList[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [editingBcId, setEditingBcId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ discountPercent: number; priceListId: string }>({ discountPercent: 0, priceListId: '' })
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [usersRes, plRes] = await Promise.all([
        fetch(`/api/admin/customers?search=${encodeURIComponent(search)}&type=${typeFilter}&limit=50`),
        fetch('/api/admin/price-lists'),
      ])
      const usersData = await usersRes.json()
      const plData = await plRes.json()
      setUsers(usersData.users || [])
      setPriceLists(plData || [])
    } finally {
      setLoading(false)
    }
  }, [search, typeFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const handleEdit = (bc: BusinessCustomer) => {
    setEditingBcId(bc.id)
    setEditForm({ discountPercent: bc.discountPercent, priceListId: bc.priceListId || '' })
  }

  const handleSave = async () => {
    if (!editingBcId) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/customers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessCustomerId: editingBcId,
          discountPercent: editForm.discountPercent,
          priceListId: editForm.priceListId || null,
        }),
      })
      if (res.ok) {
        setEditingBcId(null)
        fetchData()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <p className="text-gray-500 text-sm mt-1">Manage customer accounts and business pricing</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-64"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All accounts</option>
          <option value="business">Business only</option>
          <option value="customer">Consumers only</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Name / Email</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Role</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Company</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Discount %</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Price List</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Orders</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Loading…</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">No customers found</td></tr>
              ) : (
                users.map((user) => {
                  const isEditingThisUser = editingBcId === user.businessCustomer?.id
                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{user.name || '—'}</div>
                        <div className="text-gray-400 text-xs">{user.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                          user.role === 'BUSINESS' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {user.businessCustomer?.companyName || '—'}
                        {user.businessCustomer?.vatNumber && (
                          <div className="text-xs text-gray-400">{user.businessCustomer.vatNumber}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditingThisUser ? (
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
                          user.businessCustomer
                            ? <span className="font-medium text-blue-600">{user.businessCustomer.discountPercent}%</span>
                            : '—'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditingThisUser ? (
                          <select
                            value={editForm.priceListId}
                            onChange={(e) => setEditForm({ ...editForm, priceListId: e.target.value })}
                            className="border border-gray-300 rounded px-2 py-1 text-sm"
                          >
                            <option value="">No price list</option>
                            {priceLists.map((pl) => (
                              <option key={pl.id} value={pl.id}>{pl.name} ({pl.discountPercent}%)</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-gray-600">{user.businessCustomer?.priceList?.name || '—'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">{user._count.orders}</td>
                      <td className="px-4 py-3 text-right">
                        {user.businessCustomer && (
                          isEditingThisUser ? (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={handleSave}
                                disabled={saving}
                                className="text-green-600 hover:text-green-700 font-medium text-xs"
                              >
                                {saving ? 'Saving…' : 'Save'}
                              </button>
                              <button
                                onClick={() => setEditingBcId(null)}
                                className="text-gray-400 hover:text-gray-600 font-medium text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleEdit(user.businessCustomer!)}
                              className="text-blue-600 hover:text-blue-700 font-medium text-xs"
                            >
                              Edit pricing
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
