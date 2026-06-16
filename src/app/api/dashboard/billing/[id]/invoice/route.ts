import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { hasPermission } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'
import { BillingService } from '@/lib/services'

const secret = process.env.NEXTAUTH_SECRET
type Context = { params: Promise<{ id: string }> }

/**
 * POST /api/dashboard/billing/[id]/invoice
 * Facture une commande au compte : invoicedAt + invoiceNo + facture finale par courriel.
 */
export async function POST(req: NextRequest, { params }: Context) {
  try {
    const { id } = await params
    const token = await getToken({ req, secret })
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!hasPermission(token.role as Role, 'orders:write')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const result = await BillingService.invoiceOrder(id)
    return NextResponse.json({
      ok: true,
      invoiceNo: result.invoiceNo,
      emailSent: result.emailSent,
      message: result.emailSent
        ? `Facture ${result.invoiceNo} envoyée au client.`
        : `Facture ${result.invoiceNo} créée (courriel non configuré ou déjà facturée).`,
    })
  } catch (err: any) {
    console.error('[billing invoice POST]', err)
    return NextResponse.json({ error: err.message || 'Erreur interne.' }, { status: 400 })
  }
}
