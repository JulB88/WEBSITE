import { prisma } from '@/lib/prisma'
import { LedgerService } from './LedgerService'
import { JournalService, type LineInput } from './JournalService'

/**
 * PayablesService — comptes fournisseurs (achats, factures, paiements, dépenses).
 *
 * Postage :
 *   Facture fournisseur : Dr charges/actif + Dr CTI/RTI · Cr Comptes fournisseurs
 *   Paiement fournisseur : Dr Comptes fournisseurs · Cr Encaisse
 *   Dépense au comptant : Dr charge + Dr CTI/RTI · Cr Encaisse
 */

const round = (n: number) => Math.round(n * 100) / 100

interface BillLineInput { accountId: string; description?: string; amount: number; taxCodeId?: string | null }

export class PayablesService {
  // ─── Fournisseurs ──────────────────────────────────────────────────────────
  static async listVendors() {
    return prisma.vendor.findMany({ orderBy: { name: 'asc' } })
  }
  static async createVendor(data: { name: string; email?: string; phone?: string; contactName?: string; taxNumber?: string; termsDays?: number }) {
    return prisma.vendor.create({
      data: {
        name: data.name.trim(), email: data.email?.trim() || null, phone: data.phone?.trim() || null,
        contactName: data.contactName?.trim() || null, taxNumber: data.taxNumber?.trim() || null,
        termsDays: data.termsDays ?? 30,
      },
    })
  }
  static async updateVendor(id: string, data: any) {
    return prisma.vendor.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.email !== undefined && { email: data.email?.trim() || null }),
        ...(data.phone !== undefined && { phone: data.phone?.trim() || null }),
        ...(data.contactName !== undefined && { contactName: data.contactName?.trim() || null }),
        ...(data.taxNumber !== undefined && { taxNumber: data.taxNumber?.trim() || null }),
        ...(data.termsDays !== undefined && { termsDays: Number(data.termsDays) || 30 }),
        ...(data.isActive !== undefined && { isActive: !!data.isActive }),
      },
    })
  }

  // ─── Calcul des taxes récupérables d'une ligne ───────────────────────────────
  private static async taxFor(lines: BillLineInput[]) {
    const codeIds = [...new Set(lines.map((l) => l.taxCodeId).filter(Boolean))] as string[]
    const codes = codeIds.length ? await prisma.taxCode.findMany({ where: { id: { in: codeIds } } }) : []
    const byId = new Map(codes.map((c) => [c.id, c]))
    return { byId }
  }

  // ─── Factures d'achat ────────────────────────────────────────────────────────
  static async listBills() {
    return prisma.bill.findMany({
      orderBy: { date: 'desc' },
      include: { vendor: { select: { name: true } }, lines: true, payments: true },
    })
  }

  static async createBill(input: {
    vendorId: string; number?: string; date: Date; dueDate?: Date | null; memo?: string
    lines: BillLineInput[]; createdBy?: string
  }) {
    const { byId } = await this.taxFor(input.lines)
    const ap = await LedgerService.accountFor('ACCOUNTS_PAYABLE')

    // Construit les lignes d'écriture + total
    const jLines: LineInput[] = []
    let total = 0
    for (const l of input.lines) {
      const amount = round(l.amount)
      if (amount <= 0) continue
      jLines.push({ accountId: l.accountId, debit: amount, description: l.description ?? undefined, taxCodeId: l.taxCodeId ?? undefined })
      total += amount
      if (l.taxCodeId) {
        const code = byId.get(l.taxCodeId)
        if (code) {
          const tax = round(amount * code.rate)
          if (tax > 0) {
            if (!code.paidAccountId) throw new Error(`Compte de taxe à recevoir (CTI/RTI) non configuré pour ${code.code}.`)
            jLines.push({ accountId: code.paidAccountId, debit: tax, description: `${code.code} récupérable`, taxCodeId: code.id })
            total += tax
          }
        }
      }
    }
    total = round(total)
    if (jLines.length === 0) throw new Error('La facture doit comporter au moins une ligne.')

    // Crédit fournisseurs = total
    jLines.push({ accountId: ap.id, credit: total, description: 'Comptes fournisseurs' })

    // Crée la facture puis poste l'écriture (idempotent par bill:<id>)
    const bill = await prisma.bill.create({
      data: {
        vendorId: input.vendorId, number: input.number?.trim() || null, date: input.date,
        dueDate: input.dueDate ?? null, memo: input.memo?.trim() || null, total, status: 'UNPAID',
        lines: { create: input.lines.filter((l) => l.amount > 0).map((l) => ({ accountId: l.accountId, description: l.description?.trim() || null, amount: round(l.amount), taxCodeId: l.taxCodeId ?? null })) },
      },
      include: { vendor: { select: { name: true } } },
    })

    await JournalService.post({
      date: input.date, source: 'BILL', sourceRef: `bill:${bill.id}`,
      memo: `Facture fournisseur — ${bill.vendor.name}${bill.number ? ` (${bill.number})` : ''}`,
      createdBy: input.createdBy, lines: jLines,
    })

    return bill
  }

  static async recordBillPayment(billId: string, amount: number, opts: { method?: string; note?: string; recordedBy?: string } = {}) {
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Montant invalide.')
    const bill = await prisma.bill.findUnique({ where: { id: billId } })
    if (!bill) throw new Error('Facture introuvable')
    const remaining = round(bill.total - bill.paidAmount)
    if (amount > remaining + 0.01) throw new Error(`Le paiement (${amount}) dépasse le solde (${remaining}).`)

    const [ap, cash] = await Promise.all([
      LedgerService.accountFor('ACCOUNTS_PAYABLE'),
      LedgerService.accountFor('CASH'),
    ])

    const newPaid = round(bill.paidAmount + amount)
    const status = newPaid >= bill.total - 0.01 ? 'PAID' : 'PARTIAL'

    const [payment] = await prisma.$transaction([
      prisma.billPayment.create({ data: { billId, amount: round(amount), method: opts.method ?? 'autre', note: opts.note ?? null, recordedBy: opts.recordedBy ?? null } }),
      prisma.bill.update({ where: { id: billId }, data: { paidAmount: newPaid, status } }),
    ])

    await JournalService.post({
      date: new Date(), source: 'BILL_PAYMENT', sourceRef: `billpay:${payment.id}`,
      memo: 'Paiement fournisseur',
      createdBy: opts.recordedBy,
      lines: [
        { accountId: ap.id, debit: round(amount), description: 'Comptes fournisseurs' },
        { accountId: cash.id, credit: round(amount), description: 'Encaisse' },
      ],
    })

    return { payment, paidAmount: newPaid, status, remaining: round(bill.total - newPaid) }
  }

  // ─── Dépense au comptant ─────────────────────────────────────────────────────
  static async createExpense(input: {
    date: Date; accountId: string; amount: number; vendorName?: string; description?: string
    taxCodeId?: string | null; createdBy?: string
  }) {
    const amount = round(input.amount)
    if (amount <= 0) throw new Error('Montant invalide.')
    const cash = await LedgerService.accountFor('CASH')

    const jLines: LineInput[] = [{ accountId: input.accountId, debit: amount, description: input.description ?? undefined, taxCodeId: input.taxCodeId ?? undefined }]
    let total = amount
    if (input.taxCodeId) {
      const code = await prisma.taxCode.findUnique({ where: { id: input.taxCodeId } })
      if (code) {
        const tax = round(amount * code.rate)
        if (tax > 0) {
          if (!code.paidAccountId) throw new Error(`Compte CTI/RTI non configuré pour ${code.code}.`)
          jLines.push({ accountId: code.paidAccountId, debit: tax, description: `${code.code} récupérable`, taxCodeId: code.id })
          total += tax
        }
      }
    }
    jLines.push({ accountId: cash.id, credit: round(total), description: 'Encaisse' })

    const expense = await prisma.expense.create({
      data: {
        date: input.date, vendorName: input.vendorName?.trim() || null, accountId: input.accountId,
        description: input.description?.trim() || null, amount, taxCodeId: input.taxCodeId ?? null, createdBy: input.createdBy ?? null,
      },
    })

    await JournalService.post({
      date: input.date, source: 'EXPENSE', sourceRef: `expense:${expense.id}`,
      memo: `Dépense — ${input.vendorName ?? input.description ?? ''}`.trim(),
      createdBy: input.createdBy, lines: jLines,
    })

    return expense
  }

  // ─── Âge des comptes fournisseurs ────────────────────────────────────────────
  static async apAging(asOf: Date = new Date()) {
    const bills = await prisma.bill.findMany({
      where: { status: { not: 'PAID' } },
      include: { vendor: { select: { name: true } } },
    })
    const byVendor = new Map<string, { vendor: string; current: number; d31_60: number; d61_90: number; d90plus: number; total: number }>()
    for (const b of bills) {
      const due = round(b.total - b.paidAmount)
      if (due <= 0) continue
      const name = b.vendor.name
      const ageDays = Math.floor((asOf.getTime() - (b.dueDate ?? b.date).getTime()) / 86_400_000)
      const row = byVendor.get(name) ?? { vendor: name, current: 0, d31_60: 0, d61_90: 0, d90plus: 0, total: 0 }
      if (ageDays <= 30) row.current += due
      else if (ageDays <= 60) row.d31_60 += due
      else if (ageDays <= 90) row.d61_90 += due
      else row.d90plus += due
      row.total += due
      byVendor.set(name, row)
    }
    const rows = [...byVendor.values()].map((r) => ({
      vendor: r.vendor, current: round(r.current), d31_60: round(r.d31_60),
      d61_90: round(r.d61_90), d90plus: round(r.d90plus), total: round(r.total),
    })).sort((a, b) => b.total - a.total)
    const totals = {
      vendor: 'TOTAL',
      current: round(rows.reduce((s, r) => s + r.current, 0)),
      d31_60: round(rows.reduce((s, r) => s + r.d31_60, 0)),
      d61_90: round(rows.reduce((s, r) => s + r.d61_90, 0)),
      d90plus: round(rows.reduce((s, r) => s + r.d90plus, 0)),
      total: round(rows.reduce((s, r) => s + r.total, 0)),
    }
    return { rows, totals }
  }
}
