'use client'

import { useState } from 'react'

type Status = 'idle' | 'loading' | 'ok' | 'error'

interface Props {
  /** Effectue le test. Reçoit un signal d'annulation (timeout 15s). Retourne {ok, message}. */
  onTest: (signal: AbortSignal) => Promise<{ ok: boolean; message: string }>
  /** Désactive le bouton (préconditions non remplies). */
  disabled?: boolean
  /** Message d'avertissement affiché en bulle au survol quand désactivé. */
  disabledReason?: string
  label?: string
}

const TIMEOUT_MS = 15_000

/**
 * Bouton de test d'envoi de courriel :
 *  - désactivé tant que les préconditions ne sont pas remplies (+ bulle d'avertissement)
 *  - ✓ vert si le site détecte l'envoi
 *  - ✗ rouge en cas d'erreur OU si aucune confirmation après 15 secondes (avec raison)
 */
export default function TestSendButton({ onTest, disabled = false, disabledReason, label = '✉ Envoyer un test' }: Props) {
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

  async function run() {
    if (disabled || status === 'loading') return
    setStatus('loading'); setMessage('')

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const res = await onTest(controller.signal)
      clearTimeout(timer)
      setStatus(res.ok ? 'ok' : 'error')
      setMessage(res.message)
    } catch {
      clearTimeout(timer)
      setStatus('error')
      setMessage(
        controller.signal.aborted
          ? "Aucune confirmation après 15 secondes — vérifie ta configuration SMTP (serveur, port, identifiants)."
          : 'Erreur réseau — réessaie.'
      )
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="relative inline-block group">
        <button
          type="button"
          onClick={run}
          disabled={disabled || status === 'loading'}
          className={`text-sm border rounded-lg px-4 py-2 transition-colors flex items-center gap-2
            ${disabled
              ? 'border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
        >
          {status === 'loading' && (
            <span className="inline-block w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          )}
          {status === 'loading' ? 'Envoi…' : label}
        </button>

        {/* Bulle d'avertissement quand désactivé */}
        {disabled && disabledReason && (
          <div className="hidden group-hover:block absolute z-30 bottom-full left-0 mb-2 w-64 px-3 py-2
                          bg-gray-900 text-white text-xs rounded-lg shadow-lg">
            {disabledReason}
            <div className="absolute top-full left-4 -mt-1 w-2 h-2 bg-gray-900 rotate-45" />
          </div>
        )}
      </div>

      {/* Résultat */}
      {status === 'ok' && (
        <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600">✓</span>
          {message || 'Courriel envoyé'}
        </span>
      )}
      {status === 'error' && (
        <span className="flex items-center gap-1.5 text-sm text-red-600 font-medium">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-600">✗</span>
          {message || 'Échec'}
        </span>
      )}
    </div>
  )
}
