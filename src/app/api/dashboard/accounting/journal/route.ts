import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { JournalService } from '@/lib/services'

/**
 * GET  /api/dashboard/accounting/journal — liste des écritures (avec lignes)
 * POST /api/dashboard/accounting/journal — { action: 'manual' | 'reverse', … }
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session.user.role as Role, 'accounting:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '100', 10)))

  const entries = await prisma.journalEntry.findMany({
    orderBy: { number: 'desc' },
    take: limit,
    include: { lines: { include: { account: { select: { code: true, name: true } } } } },
  })
  return NextResponse.json({ entries })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session.user.role as Role, 'accounting:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  try {
    if (body.action === 'reverse') {
      const entry = await JournalService.reverse(body.entryId, { createdBy: session.user.email ?? undefined })
      return NextResponse.json({ ok: true, entry })
    }
    if (body.action === 'manual') {
      const entry = await JournalService.manualEntry({
        date: new Date(body.date || Date.now()),
        memo: body.memo?.trim() || undefined,
        createdBy: session.user.email ?? undefined,
        lines: (body.lines ?? []).map((l: any) => ({
          accountId: l.accountId,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
          description: l.description?.trim() || undefined,
        })),
      })
      return NextResponse.json({ ok: true, entry })
    }
    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
  } catch (err: any) {
    console.error('[accounting/journal]', err)
    return NextResponse.json({ error: err.message || 'Erreur interne' }, { status: 400 })
  }
}
