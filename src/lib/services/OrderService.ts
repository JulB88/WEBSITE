import { prisma } from '@/lib/prisma'
import { createBCClient, resolveOrCreateBCCustomer, mapBCStatusToOrderStatus } from '@/lib/businesscentral'

export type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'

/**
 * OrderService — création de commandes, push vers BC et sync de statuts.
 */
export class OrderService {
  /**
   * Pousse une commande locale vers Business Central.
   * Résout ou crée le client BC automatiquement.
   */
  static async pushToBC(orderId: string): Promise<string> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: { product: { select: { bcItemNo: true, name: true } } },
        },
      },
    })
    if (!order) throw new Error(`Order ${orderId} not found`)
    if (order.bcSalesOrderNo) return order.bcSalesOrderNo // déjà poussé

    const bc = await createBCClient()
    const customerNumber = await resolveOrCreateBCCustomer(bc, order.userId, order.businessCustomerId)

    const lines = order.orderItems
      .filter(oi => oi.product.bcItemNo)
      .map(oi => ({
        itemNumber:  oi.product.bcItemNo!,
        description: oi.product.name,
        quantity:    oi.quantity,
        unitPrice:   oi.unitPrice,
      }))

    if (lines.length === 0) throw new Error('No BC items in order')

    const bcOrder = await bc.createSalesOrder({
      customerNumber,
      orderDate: new Date().toISOString().split('T')[0],
      externalDocumentNumber: orderId.slice(0, 35),
      salesLines: lines,
    })

    await prisma.order.update({
      where: { id: orderId },
      data:  { bcSalesOrderNo: bcOrder.number },
    })

    return bcOrder.number
  }

  /**
   * Synchronise les statuts des commandes depuis BC.
   * Met à jour les commandes locales selon le statut/expédition BC.
   */
  static async syncStatusesFromBC(limit = 500): Promise<{ updated: number; retried: number; errors: number }> {
    const bc = await createBCClient()
    const results = { updated: 0, retried: 0, errors: 0 }

    // 1. Mettre à jour les statuts des commandes existantes
    const bcOrders = await bc.fetchRecentSalesOrders(limit)
    const bcByNumber = new Map(bcOrders.map(o => [o.number, o]))

    const localOrders = await prisma.order.findMany({
      where: { bcSalesOrderNo: { not: null }, status: { notIn: ['DELIVERED', 'CANCELLED'] } },
      select: { id: true, status: true, bcSalesOrderNo: true },
    })

    for (const order of localOrders) {
      const bcOrder = bcByNumber.get(order.bcSalesOrderNo!)
      if (!bcOrder) continue
      const newStatus = mapBCStatusToOrderStatus(bcOrder.status, bcOrder.shipmentStatus)
      if (newStatus && newStatus !== order.status) {
        try {
          await prisma.order.update({ where: { id: order.id }, data: { status: newStatus } })
          results.updated++
        } catch { results.errors++ }
      }
    }

    // 2. Réessayer les commandes PROCESSING sans numéro BC
    const pending = await prisma.order.findMany({
      where: { bcSalesOrderNo: null, status: 'PROCESSING' },
      include: { orderItems: { include: { product: { select: { bcItemNo: true, name: true } } } } },
      take: 20,
      orderBy: { createdAt: 'desc' },
    })

    for (const order of pending) {
      try {
        await this.pushToBC(order.id)
        results.retried++
      } catch { results.errors++ }
    }

    return results
  }

  /** Annule une commande localement */
  static async cancel(orderId: string): Promise<void> {
    await prisma.order.update({
      where: { id: orderId },
      data:  { status: 'CANCELLED' },
    })
  }

  /** Met à jour le statut d'une commande */
  static async updateStatus(orderId: string, status: OrderStatus): Promise<void> {
    await prisma.order.update({ where: { id: orderId }, data: { status } })
  }
}
