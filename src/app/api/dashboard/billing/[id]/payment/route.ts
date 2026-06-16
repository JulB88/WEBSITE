import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { hasPermission } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'
import { BillingService } from '@/lib/services'

const secret = process.env.NEXTAUTH_SECRET
type Context = { params: Promise<{ id: string }> }

const VALID_METHODS = ['cheque', 'virement', 'carte', 'comptant', 'autre']

/**
 * POST /api/dashboard/billing/[id]/payment
 * Enregistre un paiement (complet ou partiel) sur une commande au compte.
 * Body : { amount: number, method?: string, note?: string }
 */
export async function POST(req: NextRequest, { params }: Context) {
  try {
    const { id } = await params
    const token = await getToken({ req, secret })
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!hasPermission(token.role as Role, 'orders:write')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const amount = Number(body.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Montant invalide.' }, { status: 400 })
    }
    const method = VALID_METHODS.includes(body.method) ? body.method : 'autre'
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) || null : null

    const result = await BillingService.recordPayment(id, Math.round(amount * 100) / 100, {
      method,
      note: note ?? undefined,
      recordedBy: (token.email as string) ?? undefined,
    })

    return NextResponse.json({
      ok: true,
      payment: result.payment,
      paidAmount: result.paidAmount,
      paymentStatus: result.paymentStatus,
      remaining: result.remaining,
      message:
        result.paymentStatus === 'PAID'
          ? 'Paiement enregistré — commande entièrement payée ✓'
          : `Paiement partiel enregistré — reste ${result.remaining.toFixed(2)} $ à payer.`,
    })
  } catch (err: any) {
    console.error('[billing payment POST]', err)
    return NextResponse.json({ error: err.message || 'Erreur interne.' }, { status: 400 })
  }
}
