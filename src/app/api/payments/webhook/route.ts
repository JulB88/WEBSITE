import { NextRequest, NextResponse } from 'next/server'
import { getStripe, getWebhookSecret } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { createBCClient, resolveOrCreateBCCustomer } from '@/lib/businesscentral'

// Terminal order statuses — never overwrite these from a webhook
const TERMINAL_STATUSES = new Set(['DELIVERED', 'CANCELLED'])

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const sig = req.headers.get('stripe-signature') || ''
  const webhookSecret = await getWebhookSecret()

  if (!webhookSecret) {
    console.error('[webhook] No webhook secret configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  let event: any
  try {
    const stripe = await getStripe()
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err: any) {
    console.error('[webhook] Signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // ── Exactly-once processing — Stripe delivers at-least-once ────────────────
  // Use upsert: if this event ID already exists → skip processing (idempotent).
  const isNew = await markEventProcessed(event.id, event.type)
  if (!isNew) {
    console.log(`[webhook] Duplicate event ${event.id} (${event.type}) — skipping`)
    return NextResponse.json({ received: true })
  }

  // ── payment_intent.succeeded ───────────────────────────────────────────────
  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object
    try {
      const order = await prisma.order.findUnique({
        where: { stripePaymentIntentId: intent.id },
        include: {
          orderItems: {
            include: { product: { select: { bcItemNo: true, name: true } } },
          },
        },
      })

      if (!order) {
        console.warn(`[webhook] payment_intent.succeeded: no order for PI ${intent.id}`)
        return NextResponse.json({ received: true })
      }

      // Only advance status from PENDING — never overwrite terminal states
      if (order.status === 'PENDING') {
        await prisma.order.update({
          where: { id: order.id },
          data:  { status: 'PROCESSING' },
        })
      }

      // Push to BC — non-blocking, only if not already pushed
      if (order.orderItems.length > 0 && !order.bcSalesOrderNo) {
        pushOrderToBC(order).catch((err) =>
          console.error('[webhook] BC push failed (non-fatal):', err)
        )
      }
    } catch (dbErr) {
      console.error('[webhook] DB error on payment_intent.succeeded:', dbErr)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
  }

  // ── payment_intent.payment_failed ──────────────────────────────────────────
  if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object
    try {
      // Only cancel non-terminal orders
      await prisma.order.updateMany({
        where: {
          stripePaymentIntentId: intent.id,
          status: { notIn: ['DELIVERED', 'CANCELLED'] },
        },
        data: { status: 'CANCELLED' },
      })
    } catch (err) {
      console.error('[webhook] Failed to cancel order on payment failure:', err)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Atomically records a Stripe event as processed.
 * Returns true if this is the first time we're seeing this event ID.
 * Returns false if it was already processed (duplicate delivery).
 */
async function markEventProcessed(eventId: string, eventType: string): Promise<boolean> {
  try {
    await prisma.stripeWebhookEvent.create({
      data: { id: eventId, type: eventType },
    })
    return true // successfully inserted → first time
  } catch (err: any) {
    if (err?.code === 'P2002') return false // unique constraint → duplicate
    throw err // unexpected error — rethrow
  }
}

async function pushOrderToBC(order: {
  id: string
  userId: string
  businessCustomerId: string | null
  orderItems: { product: { bcItemNo: string | null; name: string }; quantity: number; unitPrice: number }[]
}) {
  const bc = await createBCClient()

  const customerNumber = await resolveOrCreateBCCustomer(
    bc,
    order.userId,
    order.businessCustomerId
  )

  const bcOrder = await bc.createSalesOrder({
    customerNumber,
    orderDate:              new Date().toISOString().split('T')[0],
    externalDocumentNumber: order.id.slice(0, 35),
    salesLines: order.orderItems
      .filter((oi) => oi.product.bcItemNo)
      .map((oi) => ({
        itemNumber:  oi.product.bcItemNo!,
        description: oi.product.name,
        quantity:    oi.quantity,
        unitPrice:   oi.unitPrice,
      })),
  })

  await prisma.order.update({
    where: { id: order.id },
    data:  { bcSalesOrderNo: bcOrder.number },
  })

  console.log(`[webhook] BC sales order ${bcOrder.number} created for order ${order.id}`)
}
