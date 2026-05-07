'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

interface Category { id: string; name: string; parentId: string | null; children?: Category[] }
interface Product {
  id: string
  bcItemNo: string
  name: string
  nameEn: string | null
  description: string | null
  descriptionEn: string | null
  price: number
  stock: number
  active: boolean
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE'
  source: 'BC' | 'MANUAL'
  category: string | null
  categoryId: string | null
  productCategory: { id: string; name: string } | null
  imageUrl: string | null
}

type BulkAction = 'activate' | 'deactivate' | 'set-category'

const SOURCE_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  BC:     { label: 'Business Central', bg: '#eff6ff', color: '#1d4ed8' },
  MANUAL: { label: 'Manuel',           bg: '#f0fdf4', color: '#15803d' },
}

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  ACTIVE:   { label: 'Actif',    bg: '#f0fdf4', color: '#15803d' },
  INACTIVE: { label: 'Inactif',  bg: '#f3f4f6', color: '#6b7280' },
  DRAFT:    { label: 'Brouillon', bg: '#fef3c7', color: '#92400e' },
}

function getCompleteness(p: Product): 'COMPLETE' | 'PARTIAL' | 'DRAFT' {
  if (p.status === 'DRAFT') return 'DRAFT'
  return p.imageUrl ? 'COMPLETE' : 'PARTIAL'
}

const COMPLETENESS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  COMPLETE: { label: '● Complet',  bg: '#f0fdf4', color: '#15803d' },
  PARTIAL:  { label: '◑ Partiel',  bg: '#fffbeb', color: '#d97706' },
  DRAFT:    { label: '○ Brouillon', bg: '#fef3c7', color: '#92400e' },
}

export default function ProductsPage() {
  const [products, setProducts]         = useState<Product[]>([])
  const [categories, setCategories]     = useState<Category[]>([])
  const [total, setTotal]               = useState(0)
  const [page, setPage]                 = useState(1)
  const [pages, setPages]               = useState(1)
  const [search, setSearch]             = useState('')
  const [catFilter, setCatFilter]       = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [imageFilter, setImageFilter]   = useState('')
  const [loading, setLoading]           = useState(true)
  const [syncing, setSyncing]           = useState(false)
  const [syncMsg, setSyncMsg]           = useState('')

  // Selection
  const [selected, setSelected]         = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction]     = useState<BulkAction>('activate')
  const [bulkCatId, setBulkCatId]       = useState('')
  const [bulkLoading, setBulkLoading]   = useState(false)

  // Add product modal
  const [showAdd, setShowAdd]           = useState(false)
  const [addForm, setAddForm]           = useState({ name: '', nameEn: '', sku: '', price: '', stock: '0', description: '', descriptionEn: '', categoryId: '' })
  const [addError, setAddError]         = useState('')
  const [addLoading, setAddLoading]     = useState(false)

  // Edit modal
  const [editProduct, setEditProduct]   = useState<Product | null>(null)
  const [editForm, setEditForm]         = useState({
    name: '', nameEn: '', description: '', descriptionEn: '',
    categoryId: '', active: true, price: '', stock: '',
  })
  const [editLoading, setEditLoading]   = useState(false)

  // Image upload state
  const [uploadingFor, setUploadingFor]   = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<Record<string, 'uploading' | 'done' | 'error'>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadTargetRef = useRef<string | null>(null)

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full'

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search)       params.set('search', search)
      if (catFilter)    params.set('categoryId', catFilter)
      if (sourceFilter) params.set('source', sourceFilter)
      if (statusFilter) params.set('status', statusFilter)
      const res  = await fetch(`/api/products?${params}`)
      const data = await res.json()
      let prods = data.products ?? []
      // Client-side image filter
      if (imageFilter === 'with')    prods = prods.filter((p: Product) => !!p.imageUrl)
      if (imageFilter === 'without') prods = prods.filter((p: Product) => !p.imageUrl)
      setProducts(prods)
      setTotal(imageFilter ? prods.length : (data.total ?? 0))
      setPages(imageFilter ? 1 : (data.pages ?? 1))
      setSelected(new Set())
    } finally {
      setLoading(false)
    }
  }, [page, search, catFilter, statusFilter, sourceFilter, imageFilter])

  useEffect(() => { fetchProducts() }, [fetchProducts])
  useEffect(() => {
    fetch('/api/dashboard/categories').then(r => r.json()).then(setCategories)
  }, [])

  const flatCats: { id: string; label: string }[] = []
  for (const cat of categories) {
    flatCats.push({ id: cat.id, label: cat.name })
    for (const sub of cat.children ?? []) flatCats.push({ id: sub.id, label: `  └ ${sub.name}` })
  }

  const allIds = products.map(p => p.id)
  const allChecked = allIds.length > 0 && allIds.every(id => selected.has(id))
  const someChecked = selected.size > 0

  function toggleAll() { setSelected(allChecked ? new Set() : new Set(allIds)) }
  function toggleOne(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function toggleActive(p: Product) {
    await fetch(`/api/products/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !p.active }),
    })
    fetchProducts()
  }

  async function handleBulk() {
    if (selected.size === 0) return
    setBulkLoading(true)
    try {
      await fetch('/api/dashboard/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: [...selected],
          action: bulkAction,
          categoryId: bulkAction === 'set-category' ? bulkCatId : undefined,
        }),
      })
      fetchProducts()
    } finally {
      setBulkLoading(false)
    }
  }

  async function syncBC() {
    setSyncing(true); setSyncMsg('')
    try {
      const res  = await fetch('/api/admin/sync-bc', { method: 'POST' })
      const data = await res.json()
      setSyncMsg(res.ok ? `✓ ${data.message}` : `✗ ${data.error}`)
      if (res.ok) fetchProducts()
    } finally {
      setSyncing(false)
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddError('')
    setAddLoading(true)
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addForm.name, nameEn: addForm.nameEn,
          sku: addForm.sku, price: addForm.price, stock: addForm.stock,
          description: addForm.description, descriptionEn: addForm.descriptionEn,
          categoryId: addForm.categoryId,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setAddError(data.error || 'Erreur'); return }
      setShowAdd(false)
      setAddForm({ name: '', nameEn: '', sku: '', price: '', stock: '0', description: '', descriptionEn: '', categoryId: '' })
      fetchProducts()
    } finally {
      setAddLoading(false)
    }
  }

  async function handleEdit() {
    if (!editProduct) return
    setEditLoading(true)
    try {
      await fetch(`/api/products/${editProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          nameEn: editForm.nameEn || null,
          description: editForm.description || null,
          descriptionEn: editForm.descriptionEn || null,
          categoryId: editForm.categoryId || null,
          active: editForm.active,
          price: parseFloat(editForm.price) || editProduct.price,
          stock: parseInt(editForm.stock) || editProduct.stock,
        }),
      })
      setEditProduct(null)
      fetchProducts()
    } finally {
      setEditLoading(false)
    }
  }

  // Image upload
  function openImageUpload(bcItemNo: string) {
    uploadTargetRef.current = bcItemNo
    fileInputRef.current?.click()
  }

  async function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const bcItemNo = uploadTargetRef.current
    if (!file || !bcItemNo) return
    e.target.value = ''

    setUploadProgress(prev => ({ ...prev, [bcItemNo]: 'uploading' }))
    const fd = new FormData()
    fd.append('file', file)
    fd.append('bcItemNo', bcItemNo)

    try {
      const res = await fetch('/api/upload/product-image', { method: 'POST', body: fd })
      if (res.ok) {
        setUploadProgress(prev => ({ ...prev, [bcItemNo]: 'done' }))
        fetchProducts()
        // Update editProduct imageUrl if open
        if (editProduct?.bcItemNo === bcItemNo) {
          const data = await res.json()
          setEditProduct(ep => ep ? { ...ep, imageUrl: data.imageUrl } : ep)
        }
      } else {
        const data = await res.json()
        alert(data.error || 'Erreur upload')
        setUploadProgress(prev => ({ ...prev, [bcItemNo]: 'error' }))
      }
    } catch {
      setUploadProgress(prev => ({ ...prev, [bcItemNo]: 'error' }))
    }
    setTimeout(() => setUploadProgress(prev => {
      const n = { ...prev }; delete n[bcItemNo]; return n
    }), 3000)
  }

  return (
    <div className="p-6 md:p-8 max-w-screen-xl">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        style={{ display: 'none' }}
        onChange={handleImageFile}
      />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produits</h1>
          <p className="text-gray-500 text-sm mt-0.5">{total} produits au total</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            <span className="text-lg leading-none">+</span> Ajouter un produit
          </button>
          <button onClick={syncBC} disabled={syncing} className="flex items-center gap-1.5 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-60 transition-colors">
            <span className={syncing ? 'animate-spin inline-block' : ''}>↻</span>
            {syncing ? 'Sync…' : 'Sync BC'}
          </button>
        </div>
      </div>
      {syncMsg && (
        <p className={`mb-4 text-sm px-3 py-2 rounded-lg ${syncMsg.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {syncMsg}
        </p>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          type="search" placeholder="Rechercher…" defaultValue={search}
          onChange={e => {
            const v = e.target.value
            if (searchTimer.current) clearTimeout(searchTimer.current)
            searchTimer.current = setTimeout(() => { setSearch(v); setPage(1) }, 300)
          }}
          className="flex-1 min-w-44 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1) }} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">Toutes les catégories</option>
          {flatCats.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select value={sourceFilter} onChange={e => { setSourceFilter(e.target.value); setPage(1) }} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">Toutes les sources</option>
          <option value="BC">Business Central</option>
          <option value="MANUAL">Manuel</option>
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">Tous les statuts</option>
          <option value="ACTIVE">Actif</option>
          <option value="INACTIVE">Inactif</option>
          <option value="DRAFT">Brouillon</option>
        </select>
        <select value={imageFilter} onChange={e => { setImageFilter(e.target.value); setPage(1) }} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">Avec et sans image</option>
          <option value="with">Avec image</option>
          <option value="without">Sans image</option>
        </select>
      </div>

      {/* Bulk action bar */}
      {someChecked && (
        <div className="flex flex-wrap items-center gap-2 mb-4 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2.5">
          <span className="text-sm font-medium text-indigo-700">{selected.size} sélectionné(s)</span>
          <div className="flex gap-2 flex-wrap ml-auto">
            <select value={bulkAction} onChange={e => setBulkAction(e.target.value as BulkAction)} className="border border-indigo-200 rounded-lg px-2 py-1.5 text-sm text-indigo-800 bg-white focus:outline-none">
              <option value="activate">Activer</option>
              <option value="deactivate">Désactiver</option>
              <option value="set-category">Changer de catégorie</option>
            </select>
            {bulkAction === 'set-category' && (
              <select value={bulkCatId} onChange={e => setBulkCatId(e.target.value)} className="border border-indigo-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none">
                <option value="">— Sans catégorie —</option>
                {flatCats.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            )}
            <button onClick={handleBulk} disabled={bulkLoading} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
              {bulkLoading ? 'En cours…' : 'Appliquer'}
            </button>
            <button onClick={() => setSelected(new Set())} className="text-indigo-500 hover:text-indigo-700 text-sm">Annuler</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        {loading ? (
          <div className="py-20 text-center text-gray-400 text-sm">Chargement…</div>
        ) : products.length === 0 ? (
          <div className="py-20 text-center text-gray-400 text-sm">Aucun produit trouvé.</div>
        ) : (
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Produit</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Référence</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Source</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Catégorie</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Prix</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Stock</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Statut</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Complétude</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map((p) => {
                const src = SOURCE_LABELS[p.source] ?? SOURCE_LABELS.BC
                const statusBadge = STATUS_BADGE[p.status] ?? STATUS_BADGE.DRAFT
                const comp = getCompleteness(p)
                const compBadge = COMPLETENESS_BADGE[comp]
                const uploading = uploadProgress[p.bcItemNo]

                return (
                  <tr key={p.id} className={`hover:bg-gray-50 ${selected.has(p.id) ? 'bg-indigo-50/50' : ''}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {/* Image thumbnail + upload trigger */}
                        <button
                          onClick={() => openImageUpload(p.bcItemNo)}
                          title="Cliquer pour changer l'image"
                          className="relative flex-shrink-0 group"
                        >
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt="" className="w-9 h-9 rounded object-cover bg-gray-100" />
                          ) : (
                            <div className="w-9 h-9 rounded bg-gray-100 flex items-center justify-center text-gray-300 text-[9px] font-bold">IMG</div>
                          )}
                          <div className="absolute inset-0 rounded bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                            {uploading === 'uploading' ? (
                              <span className="text-white text-[9px]">…</span>
                            ) : uploading === 'done' ? (
                              <span className="text-green-400 text-xs">✓</span>
                            ) : (
                              <span className="text-white text-[10px] opacity-0 group-hover:opacity-100">↑</span>
                            )}
                          </div>
                        </button>
                        <span className="font-medium text-gray-900 truncate max-w-[180px]">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.bcItemNo}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: src.bg, color: src.color }}>
                        {src.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {p.productCategory?.name ?? <span className="text-gray-300 italic">—</span>}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{p.price.toFixed(2)} $</td>
                    <td className="px-4 py-3">
                      <span className={p.stock <= 0 ? 'text-red-500 font-medium' : 'text-gray-700'}>{p.stock}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => p.status !== 'DRAFT' && toggleActive(p)}
                        disabled={p.status === 'DRAFT'}
                        title={p.status === 'DRAFT' ? 'Brouillon — complétez les champs requis' : p.active ? 'Cliquer pour désactiver' : 'Cliquer pour activer'}
                        className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full transition-colors border ${
                          p.status === 'DRAFT'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 cursor-default'
                            : p.active
                              ? 'bg-green-50 text-green-700 border-green-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 cursor-pointer'
                              : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-green-50 hover:text-green-700 hover:border-green-200 cursor-pointer'
                        }`}
                      >
                        {statusBadge.label}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: compBadge.bg, color: compBadge.color }}>
                        {compBadge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setEditProduct(p)
                          setEditForm({
                            name: p.name, nameEn: p.nameEn ?? '',
                            description: p.description ?? '', descriptionEn: p.descriptionEn ?? '',
                            categoryId: p.categoryId ?? '', active: p.active,
                            price: p.price.toString(), stock: p.stock.toString(),
                          })
                        }}
                        className="text-indigo-600 hover:underline text-xs"
                      >
                        Modifier
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="text-sm text-gray-500 disabled:opacity-40">← Précédent</button>
            <span className="text-sm text-gray-500">Page {page} / {pages}</span>
            <button disabled={page === pages} onClick={() => setPage(p => p + 1)} className="text-sm text-gray-500 disabled:opacity-40">Suivant →</button>
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Ajouter un produit manuel</h2>
                <p className="text-xs text-gray-400 mt-0.5">Ce produit ne sera pas écrasé lors d'une synchronisation BC.</p>
              </div>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleAdd}>
              <div className="px-6 py-5 space-y-4">
                {/* FR/EN name */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">🇫🇷 Nom du produit *</label>
                    <input required value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">🇬🇧 Product name (EN)</label>
                    <input value={addForm.nameEn} onChange={e => setAddForm(f => ({ ...f, nameEn: e.target.value }))} className={inputCls} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">SKU / Référence</label>
                    <input value={addForm.sku} onChange={e => setAddForm(f => ({ ...f, sku: e.target.value }))} placeholder="Auto-généré si vide" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Catégorie</label>
                    <select value={addForm.categoryId} onChange={e => setAddForm(f => ({ ...f, categoryId: e.target.value }))} className={inputCls}>
                      <option value="">— Sans catégorie —</option>
                      {flatCats.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Prix (CA$) *</label>
                    <input required type="number" min="0" step="0.01" value={addForm.price} onChange={e => setAddForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Stock initial</label>
                    <input type="number" min="0" value={addForm.stock} onChange={e => setAddForm(f => ({ ...f, stock: e.target.value }))} className={inputCls} />
                  </div>
                </div>

                {/* FR/EN description */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">🇫🇷 Description</label>
                    <textarea rows={3} value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))} className={inputCls} style={{ resize: 'vertical' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">🇬🇧 Description (EN)</label>
                    <textarea rows={3} value={addForm.descriptionEn} onChange={e => setAddForm(f => ({ ...f, descriptionEn: e.target.value }))} className={inputCls} style={{ resize: 'vertical' }} />
                  </div>
                </div>

                <p className="text-xs text-gray-400">💡 L'image peut être ajoutée après la création via le bouton sur la vignette du produit.</p>

                {addError && <p className="text-red-600 text-sm">{addError}</p>}
              </div>
              <div className="flex justify-end gap-2 px-6 py-4 border-t">
                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Annuler</button>
                <button type="submit" disabled={addLoading} className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                  {addLoading ? 'Création…' : 'Créer le produit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editProduct && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
              <div>
                <h2 className="text-lg font-semibold truncate max-w-xs">{editProduct.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-xs text-gray-400">{editProduct.bcItemNo}</span>
                  <span className="inline-flex text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: SOURCE_LABELS[editProduct.source]?.bg, color: SOURCE_LABELS[editProduct.source]?.color }}>
                    {SOURCE_LABELS[editProduct.source]?.label}
                  </span>
                </div>
              </div>
              <button onClick={() => setEditProduct(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">

              {/* Image upload */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Image du produit</label>
                <div className="flex items-center gap-4">
                  {editProduct.imageUrl ? (
                    <img src={editProduct.imageUrl} alt="" className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
                  ) : (
                    <div className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-300 text-xs text-center">
                      Aucune<br/>image
                    </div>
                  )}
                  <div>
                    <button
                      type="button"
                      onClick={() => openImageUpload(editProduct.bcItemNo)}
                      className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
                    >
                      {uploadProgress[editProduct.bcItemNo] === 'uploading' ? 'Envoi…' : uploadProgress[editProduct.bcItemNo] === 'done' ? '✓ Uploadé !' : editProduct.imageUrl ? 'Changer l\'image' : 'Ajouter une image'}
                    </button>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP ou GIF · Max 8 Mo</p>
                  </div>
                </div>
              </div>

              {/* FR/EN names */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">🇫🇷 Nom *</label>
                  <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className={inputCls} required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">🇬🇧 Name (EN)</label>
                  <input value={editForm.nameEn} onChange={e => setEditForm(f => ({ ...f, nameEn: e.target.value }))} className={inputCls} />
                </div>
              </div>

              {/* Price + stock */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Prix (CA$)</label>
                  <input type="number" min="0" step="0.01" value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Stock</label>
                  <input type="number" min="0" value={editForm.stock} onChange={e => setEditForm(f => ({ ...f, stock: e.target.value }))} className={inputCls} />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Catégorie</label>
                <select value={editForm.categoryId} onChange={e => setEditForm(f => ({ ...f, categoryId: e.target.value }))} className={inputCls}>
                  <option value="">— Sans catégorie —</option>
                  {flatCats.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>

              {/* FR/EN descriptions */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">🇫🇷 Description</label>
                  <textarea rows={4} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} className={inputCls} style={{ resize: 'vertical' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">🇬🇧 Description (EN)</label>
                  <textarea rows={4} value={editForm.descriptionEn} onChange={e => setEditForm(f => ({ ...f, descriptionEn: e.target.value }))} className={inputCls} style={{ resize: 'vertical' }} />
                </div>
              </div>

              {/* Active toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.active}
                  disabled={editProduct.status === 'DRAFT'}
                  onChange={e => setEditForm(f => ({ ...f, active: e.target.checked }))}
                  className="h-4 w-4 text-indigo-600 rounded"
                />
                <span className="text-sm text-gray-700">
                  Actif — visible dans la boutique
                  {editProduct.status === 'DRAFT' && <span className="ml-2 text-amber-600 text-xs">(requis : compléter les champs obligatoires)</span>}
                </span>
              </label>

              {editProduct.source === 'BC' && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  ⚠ Ce produit vient de Business Central. Une synchronisation BC ne réactivera pas un produit que vous avez désactivé manuellement.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t sticky bottom-0 bg-white">
              <button onClick={() => setEditProduct(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Annuler</button>
              <button onClick={handleEdit} disabled={editLoading} className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                {editLoading ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
