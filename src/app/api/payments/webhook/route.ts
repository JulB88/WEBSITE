import { NextRequest, NextResponse } from 'next/server'
import { getStripe, getWebhookSecret } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { createBCClient } from '@/lib/businesscentral'

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

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object

    try {
      // Find the order created by the client-side POST /api/orders
      const order = await prisma.order.findUnique({
        where: { stripePaymentIntentId: intent.id },
        include: {
          orderItems: {
            include: { product: { select: { bcItemNo: true, name: true } } },
          },
        },
      })

      if (!order) {
        // Race condition: webhook arrived before client posted to /api/orders.
        // Log it — the order will be created by the client and status set correctly there.
        console.warn(`[webhook] payment_intent.succeeded: no order found for PI ${intent.id}. Will be handled by client.`)
        return NextResponse.json({ received: true })
      }

      // Only update if still in PENDING (avoid overwriting PROCESSING set by client)
      if (order.status === 'PENDING') {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'PROCESSING' },
        })
      }

      // Push to Business Central (non-blocking — don't fail the webhook)
      if (order.orderItems.length > 0) {
        try {
          const bc = await createBCClient()
          const bcOrder = await bc.createSalesOrder({
            orderDate: new Date().toISOString().split('T')[0],
            salesLines: order.orderItems.map((oi) => ({
              itemNumber: oi.product.bcItemNo,
              description: oi.product.name,
              quantity: oi.quantity,
              unitPrice: oi.unitPrice,
            })),
          })

          await prisma.order.update({
            where: { id: order.id },
            data: { bcSalesOrderNo: bcOrder.number || bcOrder.id },
          })
        } catch (bcErr) {
          console.error('[webhook] BC sync failed (non-fatal):', bcErr)
        }
      }
    } catch (dbErr) {
      console.error('[webhook] DB error on payment_intent.succeeded:', dbErr)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object
    try {
      await prisma.order.updateMany({
        where: { stripePaymentIntentId: intent.id, status: { not: 'CANCELLED' } },
        data: { status: 'CANCELLED' },
      })
    } catch (err) {
      console.error('[webhook] Failed to cancel order on payment failure:', err)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
