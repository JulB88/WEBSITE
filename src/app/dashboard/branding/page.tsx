'use client'

import { useEffect, useState } from 'react'

interface Brand {
  nameShort: string; nameLegal: string; tagline: string; logoUrl: string
  colorPrimary: string; colorPrimaryDark: string; colorDark: string
  colorText: string; colorMuted: string; colorBg: string
}

const COLOR_FIELDS: { key: keyof Brand; label: string; hint: string }[] = [
  { key: 'colorPrimary',     label: 'Couleur principale',        hint: 'Accent, boutons, liens (rouge DSF)' },
  { key: 'colorPrimaryDark', label: 'Principale — survol',       hint: 'Variante foncée au survol' },
  { key: 'colorDark',        label: 'Foncé (entête / nav)',      hint: 'Bandeau, navigation, titres' },
  { key: 'colorText',        label: 'Texte',                     hint: 'Couleur du texte courant' },
  { key: 'colorMuted',       label: 'Texte atténué',             hint: 'Sous-titres, légendes' },
  { key: 'colorBg',          label: 'Fond',                      hint: 'Arrière-plan des pages / courriels' },
]

const TEXT_FIELDS: { key: keyof Brand; label: string; placeholder: string; hint: string }[] = [
  { key: 'nameShort', label: 'Nom court',   placeholder: 'DSF', hint: 'Affiché dans la barre du haut et les courriels' },
  { key: 'tagline',   label: 'Slogan',      placeholder: 'DISTRIBUTION', hint: 'À côté du nom court' },
  { key: 'nameLegal', label: 'Nom légal',   placeholder: 'Distribution Ste-Foy Ltée', hint: 'Pied de page, copyright, factures' },
  { key: 'logoUrl',   label: 'URL du logo', placeholder: '/dsf-logo.png', hint: 'Chemin interne ou URL https complète' },
]

export default function BrandingPage() {
  const [brand, setBrand] = useState<Brand | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('/api/dashboard/branding').then(r => r.json()).then(d => setBrand(d.brand))
  }, [])

  function set(key: keyof Brand, value: string) {
    setBrand(b => b ? { ...b, [key]: value } : b)
  }

  async function save() {
    if (!brand) return
    setSaving(true); setMsg('')
    try {
      const res = await fetch('/api/dashboard/branding', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand }),
      })
      const d = await res.json()
      setMsg(res.ok ? '✓ Enregistré — les changements s\'appliquent partout (site et courriels).' : `✗ ${d.error}`)
    } catch { setMsg('✗ Erreur réseau') }
    finally { setSaving(false); setTimeout(() => setMsg(''), 6000) }
  }

  if (!brand) return <div className="p-8 text-gray-400">Chargement…</div>

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marque & Apparence</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Une seule palette pour tout le site et les courriels. Modifie une fois, applique partout.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {msg && <span className={`text-sm font-medium ${msg.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>{msg}</span>}
          <button onClick={save} disabled={saving}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Édition */}
        <div className="space-y-6">
          {/* Identité */}
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-5">
              <span className="text-xl">🏷️</span>
              <h2 className="font-semibold text-gray-900">Identité</h2>
            </div>
            <div className="space-y-4">
              {TEXT_FIELDS.map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                  <input value={brand[f.key]} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <p className="text-xs text-gray-400 mt-1">{f.hint}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Palette */}
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-5">
              <span className="text-xl">🎨</span>
              <h2 className="font-semibold text-gray-900">Palette de couleurs</h2>
            </div>
            <div className="space-y-3">
              {COLOR_FIELDS.map(f => (
                <div key={f.key} className="flex items-center gap-3">
                  <input type="color" value={brand[f.key]} onChange={e => set(f.key, e.target.value)}
                    className="w-10 h-10 rounded border border-gray-200 cursor-pointer shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{f.label}</p>
                    <p className="text-xs text-gray-400">{f.hint}</p>
                  </div>
                  <input value={brand[f.key]} onChange={e => set(f.key, e.target.value)}
                    className="w-28 border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Aperçu live */}
        <div className="space-y-6">
          <section className="bg-white rounded-xl border border-gray-200 p-6 lg:sticky lg:top-4">
            <div className="flex items-center gap-3 mb-5">
              <span className="text-xl">👁️</span>
              <h2 className="font-semibold text-gray-900">Aperçu en direct</h2>
            </div>

            {/* Mock navbar */}
            <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
              <div style={{ height: 4, background: brand.colorPrimary }} />
              <div style={{ background: brand.colorDark, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#fff', fontWeight: 900, letterSpacing: '.08em' }}>
                  {brand.nameShort} <span style={{ color: '#9ca3af', fontSize: 11 }}>{brand.tagline}</span>
                </span>
                <span style={{ background: brand.colorPrimary, color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 12px', textTransform: 'uppercase' }}>
                  S'inscrire
                </span>
              </div>
              {/* Mock content */}
              <div style={{ background: brand.colorBg, padding: 16 }}>
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', padding: 12 }}>
                  <p style={{ fontSize: 11, color: brand.colorPrimary, fontWeight: 700, textTransform: 'uppercase' }}>Catégorie</p>
                  <p style={{ fontWeight: 700, color: brand.colorText, fontSize: 14 }}>Produit exemple</p>
                  <p style={{ fontWeight: 900, color: brand.colorText, fontSize: 16 }}>29.95 $</p>
                  <p style={{ fontSize: 12, color: brand.colorMuted }}>En stock</p>
                  <div style={{ background: brand.colorPrimary, color: '#fff', textAlign: 'center', fontWeight: 700, fontSize: 12, padding: '8px 0', marginTop: 8, textTransform: 'uppercase' }}>
                    Ajouter au panier
                  </div>
                </div>
              </div>
            </div>

            {/* Mock email header/footer */}
            <p className="text-xs text-gray-500 mt-5 mb-2 font-medium">Courriel</p>
            <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
              <div style={{ height: 4, background: brand.colorPrimary }} />
              <div style={{ background: brand.colorDark, padding: '14px 16px' }}>
                <span style={{ color: '#fff', fontWeight: 900, fontSize: 16, letterSpacing: '.08em' }}>{brand.nameShort}</span>
                <span style={{ color: '#9ca3af', fontSize: 11, marginLeft: 8 }}>{brand.tagline}</span>
              </div>
              <div style={{ background: '#fff', padding: 16 }}>
                <p style={{ fontWeight: 800, color: brand.colorText, textTransform: 'uppercase', fontSize: 14 }}>Confirmation d'achat</p>
                <div style={{ background: brand.colorDark, color: '#fff', fontSize: 11, padding: '6px 10px', marginTop: 8 }}>Produit · Qté · Prix · Total</div>
                <p style={{ textAlign: 'right', fontWeight: 900, color: brand.colorPrimary, marginTop: 6 }}>Total : 163.40 $</p>
              </div>
              <div style={{ background: brand.colorBg, padding: '10px 16px', textAlign: 'center', fontSize: 10, color: brand.colorMuted }}>
                © {new Date().getFullYear()} {brand.nameLegal}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
