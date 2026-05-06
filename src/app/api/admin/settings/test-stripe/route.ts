import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // Try DB first, then env var
    const dbKey = await prisma.setting.findUnique({ where: { key: 'stripe_secret_key' } })
    const secretKey = dbKey?.value || process.env.STRIPE_SECRET_KEY || ''

    if (!secretKey || secretKey.startsWith('sk_test_REPLACE')) {
      return NextResponse.json({ ok: false, message: 'No Stripe secret key configured.' })
    }

    const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' })
    // A simple read-only call to verify the key works
    const balance = await stripe.balance.retrieve()

    return NextResponse.json({
      ok: true,
      message: `Connected ✓  (${balance.livemode ? 'Live' : 'Test'} mode)`,
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message || 'Connection failed' })
  }
}
