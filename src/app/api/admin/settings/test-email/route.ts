import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { EmailService, SettingsService } from '@/lib/services'

/**
 * POST /api/admin/settings/test-email
 * Envoie un courriel de test à l'adresse de l'admin connecté, en utilisant
 * la configuration SMTP enregistrée. Retourne le message d'erreur SMTP exact
 * en cas d'échec (utile pour diagnostiquer une mauvaise config Gmail/M365).
 *
 * Important : la config doit être SAUVEGARDÉE avant le test (lecture depuis la BD).
 */
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session || !['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const to = session.user.email
  if (!to) {
    return NextResponse.json({ ok: false, message: "Aucune adresse courriel sur ton compte." })
  }

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
      <div style="height:4px;background:#e51937;"></div>
      <div style="background:#1f2232;padding:16px 20px;">
        <span style="color:#fff;font-size:18px;font-weight:900;letter-spacing:.08em;">DSF</span>
      </div>
      <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:24px 20px;">
        <h2 style="color:#1f2232;margin:0 0 12px;">✓ Configuration SMTP réussie</h2>
        <p style="color:#374151;font-size:14px;">
          Ce courriel de test confirme que l'envoi automatique des factures,
          confirmations de paiement et états de compte fonctionne correctement.
        </p>
        <p style="color:#9ca3af;font-size:12px;margin-top:16px;">
          Tu peux ignorer ce message — il sert uniquement à valider la configuration.
        </p>
      </div>
    </div>`

  try {
    const sent = await EmailService.send(to, 'Test SMTP — DSF Distribution', html)
    if (!sent) {
      await SettingsService.set('smtp_verified', '')
      return NextResponse.json({
        ok: false,
        message: "SMTP non configuré. Remplis serveur / port / utilisateur / mot de passe, puis Sauvegarde avant de tester.",
      })
    }
    // Succès → marque le SMTP comme vérifié (débloque les tests de modèles)
    await SettingsService.set('smtp_verified', 'true')
    return NextResponse.json({ ok: true, message: `Courriel de test envoyé à ${to} ✓  Vérifie ta boîte de réception.` })
  } catch (err: any) {
    // Échec → retire la vérification + surface le vrai message SMTP
    await SettingsService.set('smtp_verified', '').catch(() => {})
    return NextResponse.json({
      ok: false,
      message: `Échec SMTP : ${err?.message || 'erreur inconnue'}`,
    })
  }
}
