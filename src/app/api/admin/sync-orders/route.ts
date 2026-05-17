import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createBCClient, mapBCStatusToOrderStatus } from '@/lib/businesscentral'

/**
 * POST /api/admin/sync-orders
 * Pulls recent sales orders from BC and updates local order statuses.
 * Also re-tries BC order creation for any PROCESSING orders that never got a bcSalesOrderNo.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const bc = await createBCClient()
    const results = { updated: 0, retried: 0, errors: 0 }

    // 1. Pull recent BC orders and update local statuses
    const bcOrders = await bc.fetchRecentSalesOrders(500)
    const bcByNumber = new Map(bcOrders.map((o) => [o.number, o]))

    // Find local orders that have a BC sales order number
    const localOrders = await prisma.order.findMany({
      where: {
        bcSalesOrderNo: { not: null },
        status: { notIn: ['DELIVERED', 'CANCELLED'] },
      },
      select: { id: true, status: true, bcSalesOrderNo: true },
    })

    for (const order of localOrders) {
      const bcOrder = bcByNumber.get(order.bcSalesOrderNo!)
      if (!bcOrder) continue

      const newStatus = mapBCStatusToOrderStatus(bcOrder.status, bcOrder.shipmentStatus)
      if (newStatus && newStatus !== order.status) {
        try {
          await prisma.order.update({
            where: { id: order.id },
            data: { status: newStatus },
          })
          results.updated++
        } catch (err) {
          console.error(`[sync-orders] Failed to update order ${order.id}:`, err)
          results.errors++
        }
      }
    }

    // 2. Retry BC order creation for PROCESSING orders without a BC number
    const pendingBCSync = await prisma.order.findMany({
      where: {
        bcSalesOrderNo: null,
        status: 'PROCESSING',
      },
      include: {
        orderItems: {
          include: { product: { select: { bcItemNo: true, name: true } } },
        },
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
    })

    const { resolveOrCreateBCCustomer } = await import('@/lib/businesscentral')

    for (const order of pendingBCSync) {
      try {
        const customerNumber = await resolveOrCreateBCCustomer(
          bc,
          order.userId,
          order.businessCustomerId
        )

        const lines = order.orderItems
          .filter((oi) => oi.product.bcItemNo)
          .map((oi) => ({
            itemNumber: oi.product.bcItemNo!,
            description: oi.product.name,
            quantity: oi.quantity,
            unitPrice: oi.unitPrice,
          }))

        if (lines.length === 0) continue

        const bcOrder = await bc.createSalesOrder({
          customerNumber,
          orderDate: new Date().toISOString().split('T')[0],
          externalDocumentNumber: order.id.slice(0, 35),
          salesLines: lines,
        })

        await prisma.order.update({
          where: { id: order.id },
          data: { bcSalesOrderNo: bcOrder.number },
        })

        results.retried++
      } catch (err) {
        console.error(`[sync-orders] Retry failed for order ${order.id}:`, err)
        results.errors++
      }
    }

    return NextResponse.json({
      message: `Sync complete: ${results.updated} status updates, ${results.retried} orders pushed to BC, ${results.errors} errors`,
      ...results,
    })
  } catch (err: any) {
    console.error('[sync-orders]', err)
    return NextResponse.json({ error: err.message || 'Sync failed' }, { status: 500 })
  }
}
