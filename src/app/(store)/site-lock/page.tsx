'use client'

import { useState, FormEvent, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function SiteLockForm() {
  const searchParams = useSearchParams()
  const [digits, setDigits]   = useState(['', '', '', '', '', ''])
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  function handleChange(index: number, value: string) {
    const clean = value.replace(/\D/g, '').slice(-1)
    const next  = [...digits]
    next[index] = clean
    setDigits(next)
    setError('')
    if (clean && index < 5) {
      inputs.current[index + 1]?.focus()
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
    // Allow paste via Ctrl+V / Cmd+V
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') return
  }

  function handlePaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!text) return
    e.preventDefault()
    const next = [...digits]
    for (let i = 0; i < 6; i++) next[i] = text[i] || ''
    setDigits(next)
    inputs.current[Math.min(text.length, 5)]?.focus()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const code = digits.join('')
    if (code.length < 6) { setError('Entrez les 6 chiffres complets.'); return }

    setLoading(true)
    setError('')

    const res = await fetch('/api/site-lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })

    if (res.ok) {
      window.location.href = searchParams.get('from') || '/'
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Code incorrect.')
      setDigits(['', '', '', '', '', ''])
      setLoading(false)
      inputs.current[0]?.focus()
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Icône + titre */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Accès restreint</h1>
          <p className="mt-1 text-sm text-gray-400">Entrez le code Microsoft Authenticator</p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl space-y-5">

          {/* Champs 6 chiffres */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3 text-center">
              Code à 6 chiffres
            </label>
            <div className="flex gap-2 justify-center" onPaste={handlePaste}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => { inputs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  autoFocus={i === 0}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className={`w-11 h-14 text-center text-xl font-bold rounded-lg border
                    bg-gray-800 text-white caret-blue-400
                    focus:outline-none focus:ring-2 focus:ring-blue-500
                    ${error ? 'border-red-500' : 'border-gray-700'}
                    transition-colors`}
                />
              ))}
            </div>
            {/* Séparateur visuel entre les groupes de 3 */}
            <p className="text-center text-xs text-gray-600 mt-2">
              Se renouvelle toutes les 30 secondes
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2 text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || digits.join('').length < 6}
            className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500
                       disabled:opacity-40 text-white font-medium transition-colors"
          >
            {loading ? 'Vérification…' : 'Accéder'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-600">
          DSF Distribution — Site privé
        </p>
      </div>
    </div>
  )
}

export default function SiteLockPage() {
  return (
    <Suspense>
      <SiteLockForm />
    </Suspense>
  )
}
