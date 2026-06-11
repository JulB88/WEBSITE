import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStripe } from '@/lib/stripe'
import { computeOrderTotal } from '@/lib/pricing'
import { hasPermission } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'

const MAX_LIMIT = 100

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const canViewAll = hasPermission(session.user.role as Role, 'orders:read') &&
      ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CUSTOMER_SERVICE'].includes(session.user.role)
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)))

    const where = canViewAll ? {} : { userId: session.user.id }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          orderItems: {
            include: {
              product: {
                select: { id: true, name: true, imageUrl: true, bcItemNo: true },
              },
            },
          },
          user: { select: { name: true, email: true } },
          businessCustomer: { select: { companyName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.order.count({ where }),
    ])

    return NextResponse.json({ orders, total, page, pages: Math.ceil(total / limit) })
  } catch (err: any) {
    console.error('[orders GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { items, stripePaymentIntentId } = body

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items are required' }, { status: 400 })
    }
    if (!stripePaymentIntentId || typeof stripePaymentIntentId !== 'string') {
      return NextResponse.json({ error: 'stripePaymentIntentId is required' }, { status: 400 })
    }

    // --- Verify PaymentIntent with Stripe ---
    let stripe: Awaited<ReturnType<typeof getStripe>>
    try {
      stripe = await getStripe()
    } catch {
      return NextResponse.json({ error: 'Payment provider not configured' }, { status: 500 })
    }

    let pi: Awaited<ReturnType<typeof stripe.paymentIntents.retrieve>>
    try {
      pi = await stripe.paymentIntents.retrieve(stripePaymentIntentId)
    } catch {
      return NextResponse.json({ error: 'Invalid payment reference' }, { status: 400 })
    }

    if (pi.status !== 'succeeded') {
      return NextResponse.json({ error: 'Payment has not been completed' }, { status: 400 })
    }

    // Prevent duplicate order for the same payment intent
    const existing = await prisma.order.findUnique({
      where: { stripePaymentIntentId },
    })
    if (existing) {
      return NextResponse.json(existing)  // idempotent — return the existing order
    }

    // --- Compute authoritative total server-side ---
    const cartItems = items.map((i: any) => ({
      id: String(i.id),
      quantity: Math.max(1, Math.min(9999, parseInt(i.quantity, 10) || 1)),
    }))

    const { lineItems, totalCents } = await computeOrderTotal(
      cartItems,
      session.user.businessCustomerId
    )

    // Verify the amount charged by Stripe matches our computed total (allow ±1 cent rounding)
    if (Math.abs(pi.amount - totalCents) > 1) {
      console.error(
        `[orders POST] Amount mismatch: Stripe charged ${pi.amount} cents, computed ${totalCents} cents`,
        { userId: session.user.id, piId: stripePaymentIntentId }
      )
      return NextResponse.json({ error: 'Payment amount mismatch — please contact support' }, { status: 400 })
    }

    // --- Create order with server-computed prices ---
    // Catch P2002 (unique constraint on stripePaymentIntentId) to handle the
    // TOCTOU race condition: two concurrent requests both pass the findUnique
    // check above, but only one succeeds the insert. The loser gets P2002
    // and we return the winner's order idempotently.
    let order: Awaited<ReturnType<typeof prisma.order.findUnique>> & object | null = null
    try {
      order = await prisma.order.create({
        data: {
          userId:               session.user.id,
          businessCustomerId:   session.user.businessCustomerId || null,
          totalAmount:          pi.amount / 100,
          stripePaymentIntentId,
          status: 'PROCESSING',
          orderItems: {
            create: lineItems.map((li) => ({
              productId: li.productId,
              quantity:  li.quantity,
              unitPrice: li.unitPrice,
            })),
          },
        },
        include: {
          orderItems: {
            include: { product: { select: { id: true, name: true, bcItemNo: true } } },
          },
        },
      })
    } catch (createErr: any) {
      if (createErr?.code === 'P2002') {
        // Race condition — another request already created this order
        const raceWinner = await prisma.order.findUnique({
          where: { stripePaymentIntentId },
          include: {
            orderItems: {
              include: { product: { select: { id: true, name: true, bcItemNo: true } } },
            },
          },
        })
        if (raceWinner) return NextResponse.json(raceWinner)
      }
      throw createErr
    }

    return NextResponse.json(order, { status: 201 })
  } catch (err: any) {
    console.error('[orders POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
