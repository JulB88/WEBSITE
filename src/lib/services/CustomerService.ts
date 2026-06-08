import { prisma } from '@/lib/prisma'
import { createBCClient } from '@/lib/businesscentral'

/**
 * CustomerService — gestion des clients et synchronisation vers BC.
 */
export class CustomerService {
  /**
   * Crée ou lie un client BC pour un BusinessCustomer local.
   * Cherche d'abord par email, puis crée si introuvable.
   */
  static async syncToBC(businessCustomerId: string): Promise<string> {
    const bizCustomer = await prisma.businessCustomer.findUnique({
      where: { id: businessCustomerId },
      include: { user: { select: { name: true, email: true } } },
    })
    if (!bizCustomer) throw new Error(`BusinessCustomer ${businessCustomerId} not found`)
    if (bizCustomer.customerNo) return bizCustomer.customerNo

    const bc = await createBCClient()
    const email = bizCustomer.user.email

    const existing = await bc.findCustomerByEmail(email)
    if (existing) {
      await prisma.businessCustomer.update({
        where: { id: businessCustomerId },
        data:  { customerNo: existing.number },
      })
      return existing.number
    }

    const created = await bc.createCustomer({
      displayName:          bizCustomer.companyName,
      email,
      taxRegistrationNumber: bizCustomer.vatNumber ?? undefined,
    })

    await prisma.businessCustomer.update({
      where: { id: businessCustomerId },
      data:  { customerNo: created.number },
    })

    return created.number
  }

  /**
   * Synchronise en lot tous les clients sans numéro BC.
   */
  static async syncAllToBC(limit = 50): Promise<{ synced: number; errors: number }> {
    const customers = await prisma.businessCustomer.findMany({
      where: { customerNo: null },
      include: { user: { select: { name: true, email: true } } },
      take: limit,
    })

    const results = { synced: 0, errors: 0 }
    for (const c of customers) {
      try {
        await this.syncToBC(c.id)
        results.synced++
      } catch { results.errors++ }
    }
    return results
  }

  /** Retourne les clients B2B sans numéro BC (à synchroniser) */
  static async getPendingBCSync() {
    return prisma.businessCustomer.findMany({
      where: { customerNo: null },
      include: { user: { select: { name: true, email: true } } },
    })
  }

  /** Retourne les informations de pricing d'un client */
  static async getPricing(businessCustomerId: string) {
    return prisma.businessCustomer.findUnique({
      where: { id: businessCustomerId },
      include: {
        priceList: {
          include: { priceListItems: { include: { product: true } }, categoryDiscounts: true },
        },
      },
    })
  }
}
