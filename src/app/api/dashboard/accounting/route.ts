import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'
import { AccountingService, TaxService, CHART_OF_ACCOUNTS } from '@/lib/services'

/**
 * GET /api/dashboard/accounting?report=<nom>&from=YYYY-MM-DD&to=YYYY-MM-DD
 * report : summary | sales | receipts | tax | aging | journal | trial
 * Réservé aux rôles avec orders:read (personnel).
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session.user.role as Role, 'accounting:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const report = searchParams.get('report') || 'summary'

  // Période — défaut : mois courant
  const now = new Date()
  const defFrom = new Date(now.getFullYear(), now.getMonth(), 1)
  const defTo   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  const parseDate = (v: string | null, fallback: Date) => {
    if (!v) return fallback
    const d = new Date(v)
    return isNaN(d.getTime()) ? fallback : d
  }
  const from = parseDate(searchParams.get('from'), defFrom)
  const to   = new Date(parseDate(searchParams.get('to'), defTo).setHours(23, 59, 59, 999))
  const period = { from, to }

  const rates = await TaxService.getRates()

  try {
    switch (report) {
      case 'summary':
        return NextResponse.json({ summary: await AccountingService.summary(period, rates), rates })
      case 'sales':
        return NextResponse.json({ rows: await AccountingService.salesJournal(period, rates) })
      case 'receipts':
        return NextResponse.json({ rows: await AccountingService.receiptsJournal(period) })
      case 'tax':
        return NextResponse.json({ report: await AccountingService.taxReport(period, rates), rates })
      case 'aging':
        return NextResponse.json(await AccountingService.aging())
      case 'journal':
        return NextResponse.json({ rows: await AccountingService.journalEntries(period, rates) })
      case 'trial':
        return NextResponse.json({ ...(await AccountingService.trialBalance(period, rates)), chart: CHART_OF_ACCOUNTS })
      default:
        return NextResponse.json({ error: 'Rapport inconnu' }, { status: 400 })
    }
  } catch (err: any) {
    console.error('[accounting]', err)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
