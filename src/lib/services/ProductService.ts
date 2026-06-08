import { prisma } from '@/lib/prisma'
import { createBCClient } from '@/lib/businesscentral'

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE'

/**
 * ProductService — gestion des produits et synchronisation BC → store.
 */
export class ProductService {
  /** Synchronise les produits depuis Business Central */
  static async syncFromBC(): Promise<{ count: number }> {
    const bc = await createBCClient()
    const count = await bc.syncProductsToDb()
    return { count }
  }

  /** Calcule le statut d'un produit selon la complétude de ses données */
  static computeStatus(product: {
    name?: string | null
    price?: number | null
    bcItemNo?: string | null
    active?: boolean
  }): ProductStatus {
    if (!product.active) return 'INACTIVE'
    const isComplete = !!(product.name && product.price != null && product.bcItemNo)
    return isComplete ? 'ACTIVE' : 'DRAFT'
  }

  /** Retourne les produits actifs pour le storefront */
  static async getActive(categoryId?: string) {
    return prisma.product.findMany({
      where: {
        active: true,
        status: 'ACTIVE',
        ...(categoryId ? { categoryId } : {}),
      },
      orderBy: { name: 'asc' },
    })
  }

  /** Retourne un produit par son ID BC */
  static async getByBCItemNo(bcItemNo: string) {
    return prisma.product.findUnique({ where: { bcItemNo } })
  }

  /** Désactive les produits sans stock depuis un certain seuil */
  static async deactivateOutOfStock(stockThreshold = 0) {
    return prisma.product.updateMany({
      where: { stock: { lte: stockThreshold }, active: true, source: 'BC' },
      data:  { status: 'INACTIVE' },
    })
  }
}
