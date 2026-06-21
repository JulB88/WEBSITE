import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'
import { PayablesService } from '@/lib/services'

/**
 * GET  /api/dashboard/accounting/payables — fournisseurs, factures, âge AP
 * POST /api/dashboard/accounting/payables — actions (vendor/bill/payment/expense)
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session.user.role as Role, 'accounting:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const [vendors, bills, aging] = await Promise.all([
    PayablesService.listVendors(),
    PayablesService.listBills(),
    PayablesService.apAging(),
  ])
  return NextResponse.json({ vendors, bills, aging })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session.user.role as Role, 'accounting:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json().catch(() => ({}))
  const by = session.user.email ?? undefined
  try {
    switch (body.action) {
      case 'vendor:create':
        return NextResponse.json(await PayablesService.createVendor(body.data))
      case 'vendor:update':
        return NextResponse.json(await PayablesService.updateVendor(body.id, body.data))
      case 'bill:create':
        return NextResponse.json(await PayablesService.createBill({
          vendorId: body.data.vendorId, number: body.data.number, date: new Date(body.data.date),
          dueDate: body.data.dueDate ? new Date(body.data.dueDate) : null, memo: body.data.memo,
          lines: body.data.lines, createdBy: by,
        }))
      case 'bill:pay':
        return NextResponse.json(await PayablesService.recordBillPayment(body.id, Number(body.amount), { method: body.method, note: body.note, recordedBy: by }))
      case 'expense:create':
        return NextResponse.json(await PayablesService.createExpense({
          date: new Date(body.data.date), accountId: body.data.accountId, amount: Number(body.data.amount),
          vendorName: body.data.vendorName, description: body.data.description, taxCodeId: body.data.taxCodeId || null, createdBy: by,
        }))
      default:
        return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
    }
  } catch (err: any) {
    console.error('[accounting/payables]', err)
    return NextResponse.json({ error: err.message || 'Erreur interne' }, { status: 400 })
  }
}
