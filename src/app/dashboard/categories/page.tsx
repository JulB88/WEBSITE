'use client'

import { useEffect, useState } from 'react'

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  parentId: string | null
  children: Category[]
  _count: { products: number; categoryDiscounts: number }
}

const EMPTY_FORM = { name: '', slug: '', description: '', parentId: '' }

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editCat, setEditCat] = useState<Category | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function fetchCategories() {
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard/categories')
      const data = await res.json()
      setCategories(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCategories() }, [])

  function openCreate(parentId = '') {
    setEditCat(null)
    setForm({ ...EMPTY_FORM, parentId })
    setError('')
    setShowModal(true)
  }

  function openEdit(cat: Category) {
    setEditCat(cat)
    setForm({ name: cat.name, slug: cat.slug, description: cat.description ?? '', parentId: cat.parentId ?? '' })
    setError('')
    setShowModal(true)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const url = editCat ? `/api/dashboard/categories/${editCat.id}` : '/api/dashboard/categories'
      const method = editCat ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, parentId: form.parentId || null }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Something went wrong')
        return
      }
      setShowModal(false)
      fetchCategories()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(cat: Category) {
    if (!confirm(`Delete "${cat.name}"? This cannot be undone.`)) return
    const res = await fetch(`/api/dashboard/categories/${cat.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json()
      alert(d.error ?? 'Delete failed')
      return
    }
    fetchCategories()
  }

  const totalCategories = categories.reduce((s, c) => s + 1 + (c.children?.length ?? 0), 0)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-500 text-sm mt-0.5">{totalCategories} categories</p>
        </div>
        <button
          onClick={() => openCreate()}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          + New Category
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-400">Loading…</div>
      ) : categories.length === 0 ? (
        <div className="py-20 text-center text-gray-400">No categories yet. Create your first one.</div>
      ) : (
        <div className="space-y-4">
          {categories.map((cat) => (
            <div key={cat.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Parent category */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <span className="text-lg">🗂️</span>
                  <div>
                    <p className="font-semibold text-gray-900">{cat.name}</p>
                    <p className="text-xs text-gray-400 font-mono">/{cat.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-400">{cat._count.products} products · {cat._count.categoryDiscounts} discounts</span>
                  <button onClick={() => openCreate(cat.id)} className="text-xs text-indigo-600 hover:underline">+ Sub-category</button>
                  <button onClick={() => openEdit(cat)} className="text-xs text-indigo-600 hover:underline">Edit</button>
                  <button onClick={() => handleDelete(cat)} className="text-xs text-red-500 hover:underline">Delete</button>
                </div>
              </div>

              {/* Sub-categories */}
              {cat.children && cat.children.length > 0 && (
                <div className="divide-y divide-gray-50">
                  {cat.children.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between px-5 py-3 pl-12 bg-gray-50/50">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-400">└</span>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{sub.name}</p>
                          <p className="text-xs text-gray-400 font-mono">/{sub.slug}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-gray-400">{sub._count?.products ?? 0} products</span>
                        <button onClick={() => openEdit(sub as any)} className="text-xs text-indigo-600 hover:underline">Edit</button>
                        <button onClick={() => handleDelete(sub as any)} className="text-xs text-red-500 hover:underline">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
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
              <h2 className="text-lg font-semibold">{editCat ? 'Edit Category' : form.parentId ? 'New Sub-category' : 'New Category'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              {form.parentId && (
                <p className="text-xs text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg">
                  Sub-category of: {categories.find(c => c.id === form.parentId)?.name}
                </p>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value, slug: editCat ? f.slug : slugify(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
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
                {saving ? 'Saving…' : editCat ? 'Save Changes' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
