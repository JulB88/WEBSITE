import { prisma } from '@/lib/prisma'
import { TaxService, type TaxRates } from './TaxService'

/**
 * AccountingService — cycle comptable de la facturation (comptes clients).
 *
 * Tout est DÉRIVÉ des données existantes (commandes + paiements) en
 * comptabilité en partie double, sans table additionnelle :
 *   Vente au compte : Dr Comptes clients / Cr Ventes + TPS + TVQ
 *   Vente par carte : Dr Encaisse        / Cr Ventes + TPS + TVQ
 *   Encaissement     : Dr Encaisse        / Cr Comptes clients
 *
 * Rapports : journal des ventes, journal des encaissements, rapport de taxes,
 * balance chronologique (âge des comptes), grand livre, balance de vérification.
 */

// ─── Plan comptable ────────────────────────────────────────────────────────────
export const CHART_OF_ACCOUNTS = [
  { code: '1000', name: 'Encaisse',         type: 'Actif'   },
  { code: '1100', name: 'Comptes clients',  type: 'Actif'   },
  { code: '2310', name: 'TPS à payer',      type: 'Passif'  },
  { code: '2320', name: 'TVQ à payer',      type: 'Passif'  },
  { code: '4000', name: 'Ventes',           type: 'Produit' },
] as const

const ACC = { CASH: '1000', AR: '1100', GST: '2310', QST: '2320', SALES: '4000' }

export interface Period { from: Date; to: Date }

export interface SalesJournalRow {
  date: string; invoiceNo: string; customer: string; method: string
  subtotal: number; gst: number; qst: number; total: number
}
export interface ReceiptRow {
  date: string; customer: string; invoiceNo: string; method: string; amount: number
}
export interface AgingRow {
  customer: string; current: number; d31_60: number; d61_90: number; d90plus: number; total: number
}
export interface JournalLine {
  date: string; ref: string; account: string; accountName: string; label: string; debit: number; credit: number
}
export interface TrialBalanceRow {
  code: string; name: string; type: string; debit: number; credit: number
}

const round = (n: number) => Math.round(n * 100) / 100
const dstr  = (d: Date) => d.toISOString().slice(0, 10)
const accName = (code: string) => CHART_OF_ACCOUNTS.find((a) => a.code === code)?.name ?? code

export class AccountingService {
  /** Commandes reconnues comme ventes (hors panier en attente / annulées). */
  private static async recognizedOrders(period: Period) {
    return prisma.order.findMany({
      where: {
        status: { notIn: ['PENDING', 'CANCELLED'] },
        // date de facturation dans la période
        OR: [
          { invoicedAt: { gte: period.from, lte: period.to } },
          { invoicedAt: null, createdAt: { gte: period.from, lte: period.to } },
        ],
      },
      include: {
        user: { select: { name: true, email: true } },
        businessCustomer: { select: { companyName: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
  }

  private static customerName(o: { businessCustomer: { companyName: string } | null; user: { name: string | null; email: string } }) {
    return o.businessCustomer?.companyName ?? o.user.name ?? o.user.email
  }

  // ─── Journal des ventes ──────────────────────────────────────────────────────
  static async salesJournal(period: Period, rates: TaxRates): Promise<SalesJournalRow[]> {
    const orders = await this.recognizedOrders(period)
    return orders.map((o) => {
      const b = TaxService.breakdownFromTotal(o.totalAmount, rates)
      return {
        date: dstr(o.invoicedAt ?? o.createdAt),
        invoiceNo: o.invoiceNo ?? o.id.slice(-8).toUpperCase(),
        customer: this.customerName(o),
        method: o.paymentMethod === 'CARD' ? 'Carte' : 'Au compte',
        subtotal: b.subtotal, gst: b.gst, qst: b.qst, total: b.total,
      }
    })
  }

  // ─── Journal des encaissements ───────────────────────────────────────────────
  static async receiptsJournal(period: Period): Promise<ReceiptRow[]> {
    // Paiements manuels (commandes au compte)
    const payments = await prisma.payment.findMany({
      where: { createdAt: { gte: period.from, lte: period.to } },
      include: {
        order: {
          select: {
            invoiceNo: true,
            user: { select: { name: true, email: true } },
            businessCustomer: { select: { companyName: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })
    const fromPayments: ReceiptRow[] = payments.map((p) => ({
      date: dstr(p.createdAt),
      customer: p.order.businessCustomer?.companyName ?? p.order.user.name ?? p.order.user.email,
      invoiceNo: p.order.invoiceNo ?? '—',
      method: p.method,
      amount: round(p.amount),
    }))

    // Ventes par carte = encaissées au moment de l'achat
    const cardOrders = await prisma.order.findMany({
      where: {
        paymentMethod: 'CARD', status: { notIn: ['PENDING', 'CANCELLED'] },
        createdAt: { gte: period.from, lte: period.to },
      },
      include: {
        user: { select: { name: true, email: true } },
        businessCustomer: { select: { companyName: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
    const fromCards: ReceiptRow[] = cardOrders.map((o) => ({
      date: dstr(o.createdAt),
      customer: this.customerName(o),
      invoiceNo: o.invoiceNo ?? o.id.slice(-8).toUpperCase(),
      method: 'carte',
      amount: round(o.totalAmount),
    }))

    return [...fromPayments, ...fromCards].sort((a, b) => a.date.localeCompare(b.date))
  }

  // ─── Rapport de taxes (à remettre) ───────────────────────────────────────────
  static async taxReport(period: Period, rates: TaxRates) {
    const rows = await this.salesJournal(period, rates)
    const gst = round(rows.reduce((s, r) => s + r.gst, 0))
    const qst = round(rows.reduce((s, r) => s + r.qst, 0))
    const subtotal = round(rows.reduce((s, r) => s + r.subtotal, 0))
    return { subtotal, gst, qst, total: round(subtotal + gst + qst), count: rows.length, gstNumber: rates.gstNumber, qstNumber: rates.qstNumber }
  }

  // ─── Balance chronologique (âge des comptes clients) ─────────────────────────
  static async aging(asOf: Date = new Date()): Promise<{ rows: AgingRow[]; totals: AgingRow }> {
    const orders = await prisma.order.findMany({
      where: { paymentMethod: 'ON_ACCOUNT', status: { not: 'CANCELLED' }, paymentStatus: { not: 'PAID' } },
      include: {
        user: { select: { name: true, email: true } },
        businessCustomer: { select: { companyName: true } },
      },
    })

    const byCustomer = new Map<string, AgingRow>()
    for (const o of orders) {
      const name = this.customerName(o)
      const due = round(o.totalAmount - o.paidAmount)
      if (due <= 0) continue
      const ageDays = Math.floor((asOf.getTime() - (o.invoicedAt ?? o.createdAt).getTime()) / 86_400_000)
      const row = byCustomer.get(name) ?? { customer: name, current: 0, d31_60: 0, d61_90: 0, d90plus: 0, total: 0 }
      if (ageDays <= 30)      row.current += due
      else if (ageDays <= 60) row.d31_60 += due
      else if (ageDays <= 90) row.d61_90 += due
      else                    row.d90plus += due
      row.total += due
      byCustomer.set(name, row)
    }

    const rows = [...byCustomer.values()].map((r) => ({
      customer: r.customer,
      current: round(r.current), d31_60: round(r.d31_60),
      d61_90: round(r.d61_90), d90plus: round(r.d90plus), total: round(r.total),
    })).sort((a, b) => b.total - a.total)

    const totals: AgingRow = {
      customer: 'TOTAL',
      current: round(rows.reduce((s, r) => s + r.current, 0)),
      d31_60:  round(rows.reduce((s, r) => s + r.d31_60, 0)),
      d61_90:  round(rows.reduce((s, r) => s + r.d61_90, 0)),
      d90plus: round(rows.reduce((s, r) => s + r.d90plus, 0)),
      total:   round(rows.reduce((s, r) => s + r.total, 0)),
    }
    return { rows, totals }
  }

  // ─── Écritures de journal (grand livre) ──────────────────────────────────────
  static async journalEntries(period: Period, rates: TaxRates): Promise<JournalLine[]> {
    const lines: JournalLine[] = []
    const push = (date: string, ref: string, account: string, label: string, debit: number, credit: number) =>
      lines.push({ date, ref, account, accountName: accName(account), label, debit: round(debit), credit: round(credit) })

    // Ventes
    const orders = await this.recognizedOrders(period)
    for (const o of orders) {
      const b = TaxService.breakdownFromTotal(o.totalAmount, rates)
      const date = dstr(o.invoicedAt ?? o.createdAt)
      const ref = o.invoiceNo ?? o.id.slice(-8).toUpperCase()
      const debitAcct = o.paymentMethod === 'CARD' ? ACC.CASH : ACC.AR
      push(date, ref, debitAcct, `Vente — ${this.customerName(o)}`, b.total, 0)
      push(date, ref, ACC.SALES, 'Ventes', 0, b.subtotal)
      if (b.gst) push(date, ref, ACC.GST, 'TPS perçue', 0, b.gst)
      if (b.qst) push(date, ref, ACC.QST, 'TVQ perçue', 0, b.qst)
    }

    // Encaissements (paiements au compte)
    const payments = await prisma.payment.findMany({
      where: { createdAt: { gte: period.from, lte: period.to } },
      include: { order: { select: { invoiceNo: true, user: { select: { name: true, email: true } }, businessCustomer: { select: { companyName: true } } } } },
      orderBy: { createdAt: 'asc' },
    })
    for (const p of payments) {
      const date = dstr(p.createdAt)
      const ref = p.order.invoiceNo ?? '—'
      const cust = p.order.businessCustomer?.companyName ?? p.order.user.name ?? p.order.user.email
      push(date, ref, ACC.CASH, `Encaissement — ${cust}`, p.amount, 0)
      push(date, ref, ACC.AR, 'Comptes clients', 0, p.amount)
    }

    return lines.sort((a, b) => a.date.localeCompare(b.date))
  }

  // ─── Balance de vérification ─────────────────────────────────────────────────
  static async trialBalance(period: Period, rates: TaxRates): Promise<{ rows: TrialBalanceRow[]; totalDebit: number; totalCredit: number }> {
    const lines = await this.journalEntries(period, rates)
    const map = new Map<string, TrialBalanceRow>()
    for (const acc of CHART_OF_ACCOUNTS) map.set(acc.code, { code: acc.code, name: acc.name, type: acc.type, debit: 0, credit: 0 })
    for (const l of lines) {
      const row = map.get(l.account)!
      row.debit += l.debit
      row.credit += l.credit
    }
    const rows = [...map.values()].map((r) => ({ ...r, debit: round(r.debit), credit: round(r.credit) }))
    return {
      rows,
      totalDebit: round(rows.reduce((s, r) => s + r.debit, 0)),
      totalCredit: round(rows.reduce((s, r) => s + r.credit, 0)),
    }
  }

  // ─── Sommaire ────────────────────────────────────────────────────────────────
  static async summary(period: Period, rates: TaxRates) {
    const [sales, receipts, agingData] = await Promise.all([
      this.salesJournal(period, rates),
      this.receiptsJournal(period),
      this.aging(),
    ])
    return {
      salesSubtotal: round(sales.reduce((s, r) => s + r.subtotal, 0)),
      gstCollected:  round(sales.reduce((s, r) => s + r.gst, 0)),
      qstCollected:  round(sales.reduce((s, r) => s + r.qst, 0)),
      salesTotal:    round(sales.reduce((s, r) => s + r.total, 0)),
      salesCount:    sales.length,
      receipts:      round(receipts.reduce((s, r) => s + r.amount, 0)),
      receiptsCount: receipts.length,
      arOutstanding: agingData.totals.total,
    }
  }
}
