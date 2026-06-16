import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { BillingService } from '@/lib/services'

/**
 * GET /api/account/credit
 * Statut de crédit du client connecté : limite, solde impayé, disponible.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const businessCustomerId = session.user.businessCustomerId
    if (!businessCustomerId) {
      return NextResponse.json({ onAccountEnabled: false, creditLimit: 0, outstanding: 0, available: 0 })
    }

    const credit = await BillingService.getCreditStatus(businessCustomerId)
    return NextResponse.json(credit)
  } catch (err) {
    console.error('[account/credit GET]', err)
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 })
  }
}
