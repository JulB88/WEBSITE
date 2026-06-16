import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { BillingService } from '@/lib/services'

/**
 * POST /api/orders/on-account
 * Crée une commande portée au compte client (sans paiement par carte).
 * Réservé aux comptes BUSINESS avec une limite de crédit suffisante.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const businessCustomerId = session.user.businessCustomerId
    if (!businessCustomerId) {
      return NextResponse.json(
        { error: 'Les achats au compte sont réservés aux comptes entrepreneur.' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { items } = body
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Le panier est vide.' }, { status: 400 })
    }

    const cartItems = items.map((i: any) => ({
      id: String(i.id),
      quantity: Math.max(1, Math.min(9999, parseInt(i.quantity, 10) || 1)),
    }))

    const order = await BillingService.createOnAccountOrder(
      session.user.id,
      businessCustomerId,
      cartItems
    )

    // Facture de confirmation par courriel — non bloquant
    BillingService.sendPurchaseInvoice(order.id).catch((err) =>
      console.error('[on-account] Envoi facture achat échoué (non-fatal):', err)
    )

    return NextResponse.json(order, { status: 201 })
  } catch (err: any) {
    if (err?.code === 'CREDIT_EXCEEDED' || err?.code === 'ON_ACCOUNT_DISABLED') {
      // 402 Payment Required — le client doit payer par carte
      return NextResponse.json({ error: err.message, code: err.code }, { status: 402 })
    }
    console.error('[on-account POST]', err)
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 })
  }
}
