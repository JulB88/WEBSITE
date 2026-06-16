import { NextRequest, NextResponse } from 'next/server'
import { BillingService } from '@/lib/services'

/**
 * GET /api/cron/monthly-statements
 * Génère et envoie les états de compte du mois précédent.
 * Déclenché par Vercel Cron (vercel.json) le 1er de chaque mois à 8h.
 *
 * Sécurité : Vercel envoie "Authorization: Bearer ${CRON_SECRET}".
 * La route est aussi appelable manuellement par un admin authentifié via
 * POST /api/admin/run-statements (voir route admin).
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[cron] CRON_SECRET non configuré — état de compte refusé')
    return NextResponse.json({ error: 'Cron not configured' }, { status: 500 })
  }

  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const results = await BillingService.generateMonthlyStatements()
    console.log('[cron] États de compte:', results)
    return NextResponse.json({ ok: true, ...results })
  } catch (err: any) {
    console.error('[cron] monthly-statements:', err)
    return NextResponse.json({ error: err.message || 'Statement generation failed' }, { status: 500 })
  }
}
