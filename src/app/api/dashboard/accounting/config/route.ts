import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { LedgerService, CurrencyService } from '@/lib/services'

/**
 * GET  /api/dashboard/accounting/config — seed + plan comptable, mappages, taxes, devises
 * POST /api/dashboard/accounting/config — mutations par action (entité + action)
 *
 * Lecture : accounting:read · Écriture : accounting:write
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session.user.role as Role, 'accounting:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await LedgerService.seedDefaults()

  const [accounts, mappings, taxCodes, currencies, base] = await Promise.all([
    LedgerService.getAccounts(),
    LedgerService.getMappings(),
    prisma.taxCode.findMany({ orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }] }),
    CurrencyService.getCurrencies(),
    CurrencyService.getBase(),
  ])

  return NextResponse.json({ accounts, mappings, taxCodes, currencies, base })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session.user.role as Role, 'accounting:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const { entity, action } = body

  try {
    switch (`${entity}:${action}`) {
      // ── Comptes ──────────────────────────────────────────────────────────
      case 'account:create':
        return NextResponse.json(await LedgerService.createAccount(body.data))
      case 'account:update':
        return NextResponse.json(await LedgerService.updateAccount(body.id, body.data))
      case 'account:delete':
        await LedgerService.deleteAccount(body.id)
        return NextResponse.json({ ok: true })

      // ── Mappages ─────────────────────────────────────────────────────────
      case 'mapping:set':
        return NextResponse.json(await LedgerService.setMapping(body.key, body.accountId || null))

      // ── Codes de taxe ────────────────────────────────────────────────────
      case 'taxCode:create':
        return NextResponse.json(await prisma.taxCode.create({
          data: {
            code: String(body.data.code).trim(), name: String(body.data.name).trim(),
            rate: Number(body.data.rate) || 0, jurisdiction: body.data.jurisdiction?.trim() || null,
            registrationNumber: body.data.registrationNumber?.trim() || null,
            collectedAccountId: body.data.collectedAccountId || null,
            paidAccountId: body.data.paidAccountId || null,
          },
        }))
      case 'taxCode:update':
        return NextResponse.json(await prisma.taxCode.update({
          where: { id: body.id },
          data: {
            ...(body.data.code !== undefined && { code: String(body.data.code).trim() }),
            ...(body.data.name !== undefined && { name: String(body.data.name).trim() }),
            ...(body.data.rate !== undefined && { rate: Number(body.data.rate) || 0 }),
            ...(body.data.jurisdiction !== undefined && { jurisdiction: body.data.jurisdiction?.trim() || null }),
            ...(body.data.registrationNumber !== undefined && { registrationNumber: body.data.registrationNumber?.trim() || null }),
            ...(body.data.collectedAccountId !== undefined && { collectedAccountId: body.data.collectedAccountId || null }),
            ...(body.data.paidAccountId !== undefined && { paidAccountId: body.data.paidAccountId || null }),
            ...(body.data.isActive !== undefined && { isActive: !!body.data.isActive }),
          },
        }))
      case 'taxCode:delete': {
        const tc = await prisma.taxCode.findUnique({ where: { id: body.id } })
        if (tc?.isSystem) return NextResponse.json({ error: 'Code de taxe système non supprimable (désactive-le).' }, { status: 400 })
        await prisma.taxCode.delete({ where: { id: body.id } })
        return NextResponse.json({ ok: true })
      }

      // ── Devises ──────────────────────────────────────────────────────────
      case 'currency:create':
        return NextResponse.json(await CurrencyService.addCurrency(body.data))
      case 'currency:setBase':
        await CurrencyService.setBase(body.code)
        return NextResponse.json({ ok: true })
      case 'currency:setRate':
        return NextResponse.json(await CurrencyService.setRate(body.code, Number(body.rate) || 1, new Date(body.asOf || Date.now())))

      default:
        return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
    }
  } catch (err: any) {
    if (err?.code === 'P2002') return NextResponse.json({ error: 'Ce code existe déjà.' }, { status: 409 })
    console.error('[accounting/config]', err)
    return NextResponse.json({ error: err.message || 'Erreur interne' }, { status: 400 })
  }
}
