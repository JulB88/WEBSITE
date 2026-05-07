import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getStripe } from '@/lib/stripe'
import { computeOrderTotal } from '@/lib/pricing'
import { prisma } from '@/lib/prisma'

const ALLOWED_CURRENCIES = new Set(['eur', 'usd', 'gbp', 'cad', 'chf'])

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { items, currency: rawCurrency } = body

    // --- Validate currency ---
    const currency = (rawCurrency ?? 'eur').toLowerCase()
    if (!ALLOWED_CURRENCIES.has(currency)) {
      return NextResponse.json({ error: 'Invalid currency' }, { status: 400 })
    }

    // --- Validate items shape ---
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }
    for (const item of items) {
      const qty = Number(item.quantity)
      if (!item.id || !Number.isInteger(qty) || qty < 1 || qty > 9999) {
        return NextResponse.json({ error: 'Invalid cart item' }, { status: 400 })
      }
    }

    // --- Compute total server-side — never trust the client's price ---
    const { lineItems, total, totalCents } = await computeOrderTotal(
      items.map((i: any) => ({ id: i.id, quantity: Number(i.quantity) })),
      session.user.businessCustomerId
    )

    if (totalCents < 50) {
      return NextResponse.json({ error: 'Order total is below the minimum charge amount' }, { status: 400 })
    }

    // Read currency symbol from settings for display
    const currencySetting = await prisma.setting.findUnique({ where: { key: 'store_currency' } })
    const displayCurrency = (currencySetting?.value ?? currency).toLowerCase()

    const stripe = await getStripe()
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: displayCurrency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        userId: session.user.id,
        businessCustomerId: session.user.businessCustomerId || '',
        itemCount: items.length.toString(),
      },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      amount: total,           // authoritative total — use this in the UI
      currency: displayCurrency, // matches what Stripe was charged in
    })
  } catch (err: any) {
    console.error('[create-intent]', err)
    // Never leak raw error messages to client
    return NextResponse.json({ error: 'Failed to create payment intent' }, { status: 500 })
  }
}
