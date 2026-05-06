'use client'

import { useEffect, useState, useCallback } from 'react'

interface Category { id: string; name: string; parentId: string | null; children?: Category[] }
interface Product {
  id: string
  bcItemNo: string
  name: string
  price: number
  stock: number
  active: boolean
  category: string | null
  categoryId: string | null
  productCategory: { id: string; name: string; parentId: string | null } | null
  imageUrl: string | null
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [form, setForm] = useState({ categoryId: '', active: true })
  const [saving, setSaving] = useState(false)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20', staff: 'true' })
      if (search) params.set('search', search)
      if (catFilter) params.set('categoryId', catFilter)
      if (activeFilter) params.set('active', activeFilter)
      const res = await fetch(`/api/products?${params}`)
      const data = await res.json()
      setProducts(data.products ?? data ?? [])
      setTotal(data.total ?? 0)
      setPages(data.pages ?? 1)
    } finally {
      setLoading(false)
    }
  }, [page, search, catFilter, activeFilter])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  useEffect(() => {
    fetch('/api/dashboard/categories').then(r => r.json()).then(setCategories)
  }, [])

  // Flat list of all categories for the dropdown
  const flatCategories: { id: string; label: string }[] = []
  for (const cat of categories) {
    flatCategories.push({ id: cat.id, label: cat.name })
    for (const sub of cat.children ?? []) {
      flatCategories.push({ id: sub.id, label: `  └ ${sub.name}` })
    }
  }

  function openEdit(p: Product) {
    setEditProduct(p)
    setForm({ categoryId: p.categoryId ?? '', active: p.active })
    setShowModal(true)
  }

  async function handleSave() {
    if (!editProduct) return
    setSaving(true)
    try {
      await fetch(`/api/products/${editProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: form.categoryId || null, active: form.active }),
      })
      setShowModal(false)
      fetchProducts()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500 text-sm mt-0.5">{total} products · synced from Business Central</p>
        </div>
        <a
          href="/api/admin/sync-bc"
          onClick={(e) => { e.preventDefault(); fetch('/api/admin/sync-bc', { method: 'POST' }).then(() => fetchProducts()) }}
          className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          ↻ Sync BC
        </a>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <input
          type="search"
          placeholder="Search products…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="flex-1 min-w-48 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={catFilter}
          onChange={(e) => { setCatFilter(e.target.value); setPage(1) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All categories</option>
          {flatCategories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select
          value={activeFilter}
          onChange={(e) => { setActiveFilter(e.target.value); setPage(1) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-gray-400">Loading…</div>
        ) : products.length === 0 ? (
          <div className="py-20 text-center text-gray-400">No products found. Sync from Business Central to import.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Product</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">BC Item No.</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Category</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Price</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Stock</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt="" className="w-9 h-9 rounded object-cover bg-gray-100" />
                      ) : (
                        <div className="w-9 h-9 rounded bg-gray-100 flex items-center justify-center text-gray-300 text-xs">IMG</div>
                      )}
                      <span className="font-medium text-gray-900 truncate max-w-48">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-gray-500">{p.bcItemNo}</td>
                  <td className="px-5 py-3.5 text-gray-600">
                    {p.productCategory?.name ?? <span className="text-gray-300 italic">Uncategorised</span>}
                  </td>
                  <td className="px-5 py-3.5 font-medium text-gray-900">€{p.price.toFixed(2)}</td>
                  <td className="px-5 py-3.5">
                    <span className={p.stock <= 0 ? 'text-red-500' : 'text-gray-700'}>{p.stock}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {p.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button onClick={() => openEdit(p)} className="text-indigo-600 hover:underline text-xs">Edit</button>
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

      {/* Edit Modal */}
      {showModal && editProduct && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold truncate">{editProduct.name}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-xs text-gray-400 font-mono">{editProduct.bcItemNo} · €{editProduct.price.toFixed(2)} · Stock: {editProduct.stock}</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm(f => ({ ...f, categoryId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Uncategorised</option>
                  {flatCategories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="active"
                  checked={form.active}
                  onChange={(e) => setForm(f => ({ ...f, active: e.target.checked }))}
                  className="h-4 w-4 text-indigo-600 rounded"
                />
                <label htmlFor="active" className="text-sm text-gray-700">Active (visible in store)</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
