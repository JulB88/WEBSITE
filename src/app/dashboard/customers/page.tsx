'use client'

import { useEffect, useState, useCallback } from 'react'
import { ROLE_META } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'

interface BusinessCustomer {
  id: string
  companyName: string
  vatNumber: string | null
  customerNo: string | null
  accountRequestType: string | null
  discountPercent: number
  priceListId: string | null
}

interface User {
  id: string
  email: string
  name: string | null
  role: Role
  createdAt: string
  _count: { orders: number }
  businessCustomer: BusinessCustomer | null
}

interface PriceList { id: string; name: string }

const ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CUSTOMER_SERVICE', 'BUSINESS', 'CUSTOMER']

const EMPTY_FORM = {
  email: '', name: '', password: '', role: 'CUSTOMER' as Role,
  companyName: '', vatNumber: '', customerNo: '', discountPercent: '0', priceListId: '',
}

export default function CustomersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [priceLists, setPriceLists] = useState<PriceList[]>([])
  const [assignableRoles, setAssignableRoles] = useState<Role[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) params.set('search', search)
      if (roleFilter) params.set('role', roleFilter)
      const res = await fetch(`/api/dashboard/users?${params}`)
      const data = await res.json()
      setUsers(data.users ?? [])
      setTotal(data.total ?? 0)
      setPages(data.pages ?? 1)
      setAssignableRoles(data.assignableRoles ?? [])
    } finally {
      setLoading(false)
    }
  }, [page, search, roleFilter])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  useEffect(() => {
    fetch('/api/admin/price-lists').then(r => r.json()).then(d => setPriceLists(d.priceLists ?? []))
  }, [])

  function openCreate() {
    setEditUser(null)
    setForm(EMPTY_FORM)
    setError('')
    setShowModal(true)
  }

  function openEdit(u: User) {
    setEditUser(u)
    setForm({
      email: u.email,
      name: u.name ?? '',
      password: '',
      role: u.role,
      companyName: u.businessCustomer?.companyName ?? '',
      vatNumber: u.businessCustomer?.vatNumber ?? '',
      customerNo: u.businessCustomer?.customerNo ?? '',
      discountPercent: String(u.businessCustomer?.discountPercent ?? 0),
      priceListId: u.businessCustomer?.priceListId ?? '',
    })
    setError('')
    setShowModal(true)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const payload: any = {
        email: form.email,
        name: form.name || null,
        role: form.role,
      }
      if (form.password) payload.password = form.password
      if (form.role === 'BUSINESS') {
        payload.companyName = form.companyName
        payload.vatNumber = form.vatNumber || null
        payload.customerNo = form.customerNo || null
        payload.discountPercent = parseFloat(form.discountPercent) || 0
        payload.priceListId = form.priceListId || null
      }

      const url = editUser ? `/api/dashboard/users/${editUser.id}` : '/api/dashboard/users'
      const method = editUser ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Something went wrong')
        return
      }
      setShowModal(false)
      fetchUsers()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(u: User) {
    if (!confirm(`Delete ${u.email}? This cannot be undone.`)) return
    await fetch(`/api/dashboard/users/${u.id}`, { method: 'DELETE' })
    fetchUsers()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 text-sm mt-0.5">{total} users total</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          + New User
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <input
          type="search"
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_META[r].label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-gray-400">Loading…</div>
        ) : users.length === 0 ? (
          <div className="py-20 text-center text-gray-400">No users found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-gray-500">User</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Role</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Entreprise</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">N° Client / Statut</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Orders</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Joined</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-gray-900">{u.name ?? '—'}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_META[u.role]?.color ?? 'bg-gray-100 text-gray-600'}`}>
                      {ROLE_META[u.role]?.label ?? u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">{u.businessCustomer?.companyName ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    {u.businessCustomer ? (
                      u.businessCustomer.customerNo ? (
                        <span className="text-sm text-gray-700 font-mono">{u.businessCustomer.customerNo}</span>
                      ) : u.businessCustomer.accountRequestType === 'new_request' ? (
                        <span className="inline-flex text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Nouvelle demande</span>
                      ) : u.businessCustomer.accountRequestType === 'existing_unknown' ? (
                        <span className="inline-flex text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Compte existant</span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">{u._count.orders}</td>
                  <td className="px-5 py-3.5 text-gray-400 text-xs">
                    {new Date(u.createdAt).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3.5 text-right space-x-2">
                    <button onClick={() => openEdit(u)} className="text-indigo-600 hover:underline text-xs">Edit</button>
                    <button onClick={() => handleDelete(u)} className="text-red-500 hover:underline text-xs">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="text-sm text-gray-500 disabled:opacity-40">← Prev</button>
            <span className="text-sm text-gray-500">Page {page} of {pages}</span>
            <button disabled={page === pages} onClick={() => setPage(p => p + 1)} className="text-sm text-gray-500 disabled:opacity-40">Next →</button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">{editUser ? 'Edit User' : 'New User'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <FormField label="Email *" type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} />
              <FormField label="Full name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} />
              <FormField label={editUser ? 'New password (leave blank to keep)' : 'Password *'} type="password" value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm(f => ({ ...f, role: e.target.value as Role }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {(assignableRoles.length > 0 ? assignableRoles : ROLES).map(r => (
                    <option key={r} value={r}>{ROLE_META[r].label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">{ROLE_META[form.role]?.description}</p>
              </div>

              {form.role === 'BUSINESS' && (
                <div className="border-t pt-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Détails entrepreneur</p>
                  <FormField label="Nom de l'entreprise *" value={form.companyName} onChange={v => setForm(f => ({ ...f, companyName: v }))} />
                  <FormField label="Numéro TPS/TVQ" value={form.vatNumber} onChange={v => setForm(f => ({ ...f, vatNumber: v }))} />
                  <FormField label="N° client DSF" value={form.customerNo} onChange={v => setForm(f => ({ ...f, customerNo: v }))} />
                  <FormField label="Remise %" type="number" value={form.discountPercent} onChange={v => setForm(f => ({ ...f, discountPercent: v }))} />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price List</label>
                    <select
                      value={form.priceListId}
                      onChange={(e) => setForm(f => ({ ...f, priceListId: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">None (use direct discount)</option>
                      {priceLists.map(pl => <option key={pl.id} value={pl.id}>{pl.name}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : editUser ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FormField({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  )
}
