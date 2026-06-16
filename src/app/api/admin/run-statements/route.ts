import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { BillingService } from '@/lib/services'

/**
 * POST /api/admin/run-statements
 * Déclenchement manuel des états de compte mensuels (ADMIN+).
 * Utile pour tester ou rattraper un cron manqué. Idempotent par période.
 */
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session || !['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const results = await BillingService.generateMonthlyStatements()
    return NextResponse.json({
      ok: true,
      ...results,
      message: `États de compte : ${results.sent} envoyés, ${results.skipped} ignorés (déjà générés ou sans activité), ${results.errors} erreurs.`,
    })
  } catch (err: any) {
    console.error('[run-statements]', err)
    return NextResponse.json({ error: err.message || 'Erreur interne.' }, { status: 500 })
  }
}
