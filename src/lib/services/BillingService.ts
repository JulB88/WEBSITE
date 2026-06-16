import { prisma } from '@/lib/prisma'
import { computeOrderTotal } from '@/lib/pricing'
import { EmailService } from './EmailService'
import type { InvoiceData, StatementData } from './EmailService'

export interface CreditStatus {
  creditLimit: number
  /** Total des commandes au compte non payées (totalAmount - paidAmount) */
  outstanding: number
  /** Crédit restant disponible */
  available: number
  /** true si le client peut porter des achats à son compte */
  onAccountEnabled: boolean
}

/**
 * BillingService — achats au compte, facturation, paiements et états de compte.
 *
 * Cycle de vie d'une commande au compte :
 *  1. Achat « porté au compte » (vérification de la limite de crédit)
 *     → facture de confirmation envoyée par courriel
 *  2. Le personnel « facture » la commande (invoicedAt + invoiceNo)
 *     → facture finale envoyée par courriel
 *  3. Le personnel enregistre les paiements (complets ou partiels)
 *     → paymentStatus passe à PARTIAL puis PAID
 *  4. Le 1er du mois : état de compte automatique par courriel
 */
export class BillingService {
  // ──────────────────────────────────────────────────────────────────────────
  // Crédit
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Solde impayé d'un client = somme (totalAmount - paidAmount) de ses
   * commandes au compte non annulées et non entièrement payées.
   */
  static async getOutstandingBalance(businessCustomerId: string): Promise<number> {
    const orders = await prisma.order.findMany({
      where: {
        businessCustomerId,
        paymentMethod: 'ON_ACCOUNT',
        status: { not: 'CANCELLED' },
        paymentStatus: { not: 'PAID' },
      },
      select: { totalAmount: true, paidAmount: true },
    })
    const sum = orders.reduce((s, o) => s + (o.totalAmount - o.paidAmount), 0)
    return Math.round(sum * 100) / 100
  }

  /** Statut de crédit complet d'un client. */
  static async getCreditStatus(businessCustomerId: string): Promise<CreditStatus> {
    const bc = await prisma.businessCustomer.findUnique({
      where: { id: businessCustomerId },
      select: { creditLimit: true },
    })
    const creditLimit = bc?.creditLimit ?? 0
    const outstanding = await this.getOutstandingBalance(businessCustomerId)
    const available = Math.max(0, Math.round((creditLimit - outstanding) * 100) / 100)
    return {
      creditLimit,
      outstanding,
      available,
      onAccountEnabled: creditLimit > 0,
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Achat au compte
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Crée une commande portée au compte client après vérification du crédit.
   * Lance une erreur CREDIT_EXCEEDED si la limite serait dépassée.
   */
  static async createOnAccountOrder(
    userId: string,
    businessCustomerId: string,
    items: { id: string; quantity: number }[]
  ) {
    const { lineItems, total } = await computeOrderTotal(items, businessCustomerId)

    // ── Vérification de la limite de crédit ──────────────────────────────────
    const credit = await this.getCreditStatus(businessCustomerId)
    if (!credit.onAccountEnabled) {
      const err = new Error("Les achats au compte ne sont pas activés pour votre compte.")
      ;(err as any).code = 'ON_ACCOUNT_DISABLED'
      throw err
    }
    if (total > credit.available) {
      const err = new Error(
        `Limite de crédit dépassée. Disponible : ${credit.available.toFixed(2)} $ — ` +
        `commande : ${total.toFixed(2)} $. Veuillez payer par carte de crédit ou régler votre solde.`
      )
      ;(err as any).code = 'CREDIT_EXCEEDED'
      ;(err as any).available = credit.available
      throw err
    }

    // ── Création de la commande ──────────────────────────────────────────────
    const order = await prisma.order.create({
      data: {
        userId,
        businessCustomerId,
        totalAmount: total,
        status: 'PROCESSING',
        paymentMethod: 'ON_ACCOUNT',
        paymentStatus: 'UNPAID',
        paidAmount: 0,
        invoiceNo: null, // attribué à la facturation
        orderItems: {
          create: lineItems.map((li) => ({
            productId: li.productId,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
          })),
        },
      },
      include: {
        orderItems: { include: { product: { select: { id: true, name: true, bcItemNo: true } } } },
        user: { select: { name: true, email: true } },
        businessCustomer: { select: { companyName: true } },
      },
    })

    return order
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Facturation
  // ──────────────────────────────────────────────────────────────────────────

  /** Génère un numéro de facture lisible et stable à partir de l'ID de commande. */
  static makeInvoiceNo(orderId: string, date = new Date()): string {
    const ym = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`
    return `FAC-${ym}-${orderId.slice(-6).toUpperCase()}`
  }

  /**
   * Facture une commande au compte : pose invoicedAt + invoiceNo,
   * puis envoie la facture finale par courriel.
   */
  static async invoiceOrder(orderId: string): Promise<{ invoiceNo: string; emailSent: boolean }> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: { include: { product: { select: { name: true } } } },
        user: { select: { name: true, email: true } },
        businessCustomer: { select: { companyName: true } },
      },
    })
    if (!order) throw new Error(`Commande ${orderId} introuvable`)
    if (order.paymentMethod !== 'ON_ACCOUNT') {
      throw new Error('Seules les commandes au compte peuvent être facturées.')
    }
    if (order.invoicedAt) {
      return { invoiceNo: order.invoiceNo!, emailSent: false } // déjà facturée — idempotent
    }

    const invoiceNo = order.invoiceNo ?? this.makeInvoiceNo(order.id)
    await prisma.order.update({
      where: { id: orderId },
      data: { invoicedAt: new Date(), invoiceNo },
    })

    // Facture finale par courriel (non bloquant pour l'appelant si échec)
    let emailSent = false
    try {
      emailSent = await EmailService.sendInvoice(order.user.email, {
        invoiceNo,
        orderId: order.id,
        date: new Date(),
        customerName: order.user.name ?? order.user.email,
        companyName: order.businessCustomer?.companyName,
        lines: order.orderItems.map((oi) => ({
          name: oi.product.name,
          quantity: oi.quantity,
          unitPrice: oi.unitPrice,
        })),
        total: order.totalAmount,
        paymentMethod: 'ON_ACCOUNT',
        isFinal: true,
      })
    } catch (err) {
      console.error('[billing] Envoi facture finale échoué (non-fatal):', err)
    }

    return { invoiceNo, emailSent }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Paiements
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Enregistre un paiement (complet ou partiel) sur une commande au compte.
   * Met à jour paidAmount et paymentStatus (UNPAID → PARTIAL → PAID).
   */
  static async recordPayment(
    orderId: string,
    amount: number,
    options: { method?: string; note?: string; recordedBy?: string } = {}
  ) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Le montant du paiement doit être supérieur à 0.')
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, totalAmount: true, paidAmount: true, paymentMethod: true, status: true },
    })
    if (!order) throw new Error(`Commande ${orderId} introuvable`)
    if (order.paymentMethod !== 'ON_ACCOUNT') {
      throw new Error('Les paiements manuels ne concernent que les commandes au compte.')
    }
    if (order.status === 'CANCELLED') {
      throw new Error('Impossible d\'enregistrer un paiement sur une commande annulée.')
    }

    const remaining = Math.round((order.totalAmount - order.paidAmount) * 100) / 100
    if (amount > remaining + 0.01) {
      throw new Error(
        `Le paiement (${amount.toFixed(2)} $) dépasse le solde restant (${remaining.toFixed(2)} $).`
      )
    }

    const newPaid = Math.round((order.paidAmount + amount) * 100) / 100
    const isPaid = newPaid >= order.totalAmount - 0.01
    const newStatus = isPaid ? 'PAID' : 'PARTIAL'

    // Transaction : créer le paiement + mettre à jour la commande atomiquement
    const [payment] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          orderId,
          amount,
          method: options.method ?? 'autre',
          note: options.note ?? null,
          recordedBy: options.recordedBy ?? null,
        },
      }),
      prisma.order.update({
        where: { id: orderId },
        data: { paidAmount: newPaid, paymentStatus: newStatus },
      }),
    ])

    return { payment, paidAmount: newPaid, paymentStatus: newStatus, remaining: Math.round((order.totalAmount - newPaid) * 100) / 100 }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // États de compte mensuels
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Génère et envoie les états de compte pour le mois précédent.
   * Idempotent : un seul état de compte par client par période (contrainte unique).
   */
  static async generateMonthlyStatements(): Promise<{ sent: number; skipped: number; errors: number }> {
    const now = new Date()
    // Période = mois précédent
    const periodDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const period = `${periodDate.getFullYear()}-${String(periodDate.getMonth() + 1).padStart(2, '0')}`
    const periodStart = new Date(periodDate.getFullYear(), periodDate.getMonth(), 1)
    const periodEnd = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 1)

    const results = { sent: 0, skipped: 0, errors: 0 }

    // Clients avec crédit OU avec des commandes au compte existantes
    const customers = await prisma.businessCustomer.findMany({
      where: {
        OR: [
          { creditLimit: { gt: 0 } },
          { orders: { some: { paymentMethod: 'ON_ACCOUNT' } } },
        ],
      },
      include: { user: { select: { name: true, email: true } } },
    })

    for (const customer of customers) {
      try {
        // Déjà généré pour cette période ? (idempotence)
        const existing = await prisma.accountStatement.findUnique({
          where: { businessCustomerId_period: { businessCustomerId: customer.id, period } },
        })
        if (existing) { results.skipped++; continue }

        // Commandes au compte facturées durant la période
        const billedOrders = await prisma.order.findMany({
          where: {
            businessCustomerId: customer.id,
            paymentMethod: 'ON_ACCOUNT',
            status: { not: 'CANCELLED' },
            invoicedAt: { gte: periodStart, lt: periodEnd },
          },
          select: { id: true, invoiceNo: true, invoicedAt: true, totalAmount: true, paidAmount: true, paymentStatus: true, createdAt: true },
        })

        // Paiements reçus durant la période
        const payments = await prisma.payment.findMany({
          where: {
            createdAt: { gte: periodStart, lt: periodEnd },
            order: { businessCustomerId: customer.id },
          },
          select: { amount: true },
        })

        // Toutes les commandes impayées (pour le solde total et le détail)
        const openOrders = await prisma.order.findMany({
          where: {
            businessCustomerId: customer.id,
            paymentMethod: 'ON_ACCOUNT',
            status: { not: 'CANCELLED' },
            paymentStatus: { not: 'PAID' },
          },
          select: { id: true, invoiceNo: true, invoicedAt: true, totalAmount: true, paidAmount: true, paymentStatus: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        })

        const totalBilled = Math.round(billedOrders.reduce((s, o) => s + o.totalAmount, 0) * 100) / 100
        const totalPaid   = Math.round(payments.reduce((s, p) => s + p.amount, 0) * 100) / 100
        const balance     = Math.round(openOrders.reduce((s, o) => s + (o.totalAmount - o.paidAmount), 0) * 100) / 100

        // Aucune activité ET aucun solde → pas d'état de compte
        if (totalBilled === 0 && totalPaid === 0 && balance === 0) { results.skipped++; continue }

        // Lignes du relevé : commandes facturées durant la période + impayées antérieures
        const lineMap = new Map<string, typeof openOrders[0]>()
        for (const o of [...billedOrders, ...openOrders]) lineMap.set(o.id, o)
        const statementData: StatementData = {
          companyName: customer.companyName,
          customerName: customer.user.name ?? customer.user.email,
          period,
          lines: [...lineMap.values()]
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
            .map((o) => ({
              invoiceNo: o.invoiceNo,
              orderId: o.id,
              date: o.invoicedAt ?? o.createdAt,
              total: o.totalAmount,
              paid: o.paidAmount,
              status: o.paymentStatus,
            })),
          totalBilled,
          totalPaid,
          balance,
          creditLimit: customer.creditLimit,
        }

        const emailSent = await EmailService.sendStatement(customer.user.email, statementData)

        await prisma.accountStatement.create({
          data: {
            businessCustomerId: customer.id,
            period,
            totalBilled,
            totalPaid,
            balance,
            sentAt: emailSent ? new Date() : null,
          },
        })

        results.sent++
      } catch (err) {
        console.error(`[billing] État de compte échoué pour ${customer.companyName}:`, err)
        results.errors++
      }
    }

    return results
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Facture d'achat (confirmation initiale — carte ou compte)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Envoie la facture/confirmation d'achat par courriel (fire-and-forget conseillé).
   * Pour les achats par carte, pose aussi le invoiceNo + paymentStatus PAID.
   */
  static async sendPurchaseInvoice(orderId: string): Promise<boolean> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: { include: { product: { select: { name: true } } } },
        user: { select: { name: true, email: true } },
        businessCustomer: { select: { companyName: true } },
      },
    })
    if (!order) throw new Error(`Commande ${orderId} introuvable`)

    let invoiceNo = order.invoiceNo
    // Achat carte : payé immédiatement → numéro de facture + statut PAID dès l'achat
    if (order.paymentMethod === 'CARD' && !invoiceNo) {
      invoiceNo = this.makeInvoiceNo(order.id)
      await prisma.order.update({
        where: { id: orderId },
        data: {
          invoiceNo,
          invoicedAt: new Date(),
          paymentStatus: 'PAID',
          paidAmount: order.totalAmount,
        },
      })
    }

    const data: InvoiceData = {
      invoiceNo: invoiceNo ?? `CMD-${order.id.slice(-6).toUpperCase()}`,
      orderId: order.id,
      date: order.createdAt,
      customerName: order.user.name ?? order.user.email,
      companyName: order.businessCustomer?.companyName,
      lines: order.orderItems.map((oi) => ({
        name: oi.product.name,
        quantity: oi.quantity,
        unitPrice: oi.unitPrice,
      })),
      total: order.totalAmount,
      paymentMethod: order.paymentMethod as 'CARD' | 'ON_ACCOUNT',
      isFinal: false,
    }

    return EmailService.sendInvoice(order.user.email, data)
  }
}
