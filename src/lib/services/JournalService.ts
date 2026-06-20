import { prisma } from '@/lib/prisma'
import type { JournalSource } from '@prisma/client'
import { LedgerService } from './LedgerService'
import { TaxService } from './TaxService'
import { CurrencyService } from './CurrencyService'

/**
 * JournalService — moteur de postage en partie double.
 *
 * Garanties :
 *  - chaque écriture est équilibrée (Σ débits = Σ crédits) — vérifié avant insertion
 *  - écritures postées immuables ; correction = contre-passation (reverse)
 *  - idempotence des écritures automatiques via (source, sourceRef)
 *  - montants convertis en devise de base pour les rapports
 */

export interface LineInput {
  accountId: string
  debit?: number
  credit?: number
  description?: string
  taxCodeId?: string
  businessCustomerId?: string
}

export interface EntryInput {
  date: Date
  memo?: string
  source?: JournalSource
  sourceRef?: string
  currencyCode?: string
  createdBy?: string
  lines: LineInput[]
}

const round = (n: number) => Math.round(n * 100) / 100

export class JournalService {
  /** Poste une écriture équilibrée. Idempotent si (source, sourceRef) déjà postés. */
  static async post(input: EntryInput) {
    const source = input.source ?? 'MANUAL'

    // Idempotence (écritures automatiques)
    if (input.sourceRef) {
      const existing = await prisma.journalEntry.findFirst({ where: { source, sourceRef: input.sourceRef } })
      if (existing) return existing
    }

    const lines = input.lines.filter((l) => (l.debit ?? 0) !== 0 || (l.credit ?? 0) !== 0)
    if (lines.length < 2) throw new Error('Une écriture requiert au moins 2 lignes.')

    // Validation : chaque ligne a un débit OU un crédit (positif)
    for (const l of lines) {
      const d = l.debit ?? 0, c = l.credit ?? 0
      if (d < 0 || c < 0) throw new Error('Les montants doivent être positifs.')
      if (d > 0 && c > 0) throw new Error('Une ligne ne peut avoir à la fois un débit et un crédit.')
    }

    const totalDebit = round(lines.reduce((s, l) => s + (l.debit ?? 0), 0))
    const totalCredit = round(lines.reduce((s, l) => s + (l.credit ?? 0), 0))
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(`Écriture déséquilibrée : débits ${totalDebit} ≠ crédits ${totalCredit}.`)
    }

    const currencyCode = input.currencyCode ?? (await CurrencyService.getBase()).code
    const rate = await CurrencyService.rateToBase(currencyCode, input.date)

    // Transaction : numéro séquentiel + écriture + lignes
    return prisma.$transaction(async (tx) => {
      const last = await tx.journalEntry.findFirst({ orderBy: { number: 'desc' }, select: { number: true } })
      const number = (last?.number ?? 0) + 1

      return tx.journalEntry.create({
        data: {
          number, date: input.date, memo: input.memo ?? null,
          source, sourceRef: input.sourceRef ?? null,
          status: 'POSTED', currencyCode, exchangeRate: rate,
          createdBy: input.createdBy ?? null, postedAt: new Date(),
          lines: {
            create: lines.map((l) => ({
              accountId: l.accountId,
              debit:  round(l.debit ?? 0),
              credit: round(l.credit ?? 0),
              baseDebit:  round((l.debit ?? 0) * rate),
              baseCredit: round((l.credit ?? 0) * rate),
              description: l.description ?? null,
              taxCodeId: l.taxCodeId ?? null,
              businessCustomerId: l.businessCustomerId ?? null,
            })),
          },
        },
        include: { lines: true },
      })
    })
  }

  /** Contre-passe une écriture (inverse débits/crédits) et marque l'originale VOID. */
  static async reverse(entryId: string, opts: { date?: Date; createdBy?: string } = {}) {
    const original = await prisma.journalEntry.findUnique({ where: { id: entryId }, include: { lines: true } })
    if (!original) throw new Error('Écriture introuvable')
    if (original.status === 'VOID') throw new Error('Écriture déjà contre-passée')

    const reversal = await prisma.$transaction(async (tx) => {
      const last = await tx.journalEntry.findFirst({ orderBy: { number: 'desc' }, select: { number: true } })
      const number = (last?.number ?? 0) + 1
      const entry = await tx.journalEntry.create({
        data: {
          number, date: opts.date ?? new Date(),
          memo: `Contre-passation de l'écriture n° ${original.number}`,
          source: 'REVERSAL', status: 'POSTED',
          currencyCode: original.currencyCode, exchangeRate: original.exchangeRate,
          createdBy: opts.createdBy ?? null, postedAt: new Date(),
          reversalOfId: original.id,
          lines: {
            create: original.lines.map((l) => ({
              accountId: l.accountId,
              debit:  l.credit, credit: l.debit,          // inversion
              baseDebit: l.baseCredit, baseCredit: l.baseDebit,
              description: `Contre-passation : ${l.description ?? ''}`.trim(),
              taxCodeId: l.taxCodeId, businessCustomerId: l.businessCustomerId,
            })),
          },
        },
        include: { lines: true },
      })
      await tx.journalEntry.update({ where: { id: original.id }, data: { status: 'VOID' } })
      return entry
    })
    return reversal
  }

  /** Écriture manuelle (source MANUAL). */
  static async manualEntry(input: Omit<EntryInput, 'source'>) {
    return this.post({ ...input, source: 'MANUAL' })
  }

  // ─── Helpers de postage métier (utilisés par BillingService / backfill) ──────

  /**
   * Poste une vente : Dr (encaisse OU comptes clients) total ; Cr Ventes + taxes.
   * @param toKey 'CASH' (carte) ou 'ACCOUNTS_RECEIVABLE' (au compte)
   */
  static async postSale(opts: {
    orderId: string; date: Date; total: number; toKey: 'CASH' | 'ACCOUNTS_RECEIVABLE'
    customerName?: string; businessCustomerId?: string | null; currencyCode?: string
  }) {
    const [debitAcct, salesAcct, taxCodes] = await Promise.all([
      LedgerService.accountFor(opts.toKey),
      LedgerService.accountFor('SALES_REVENUE'),
      TaxService.getActiveTaxCodes(),
    ])

    const bd = TaxService.breakdownByCodes(opts.total, taxCodes.map((c) => ({ code: c.code, rate: c.rate })))

    // Débit = somme exacte des crédits (sous-total + taxes) → équilibre garanti
    const debitTotal = round(bd.subtotal + bd.taxes.reduce((s, t) => s + t.amount, 0))

    const lines: LineInput[] = [
      { accountId: debitAcct.id, debit: debitTotal, description: `Vente — ${opts.customerName ?? ''}`.trim(), businessCustomerId: opts.businessCustomerId ?? undefined },
      { accountId: salesAcct.id, credit: bd.subtotal, description: 'Ventes' },
    ]
    for (const t of bd.taxes) {
      if (t.amount === 0) continue
      const code = taxCodes.find((c) => c.code === t.code)!
      if (!code.collectedAccountId) throw new Error(`Compte de taxe perçue non configuré pour ${t.code}.`)
      lines.push({ accountId: code.collectedAccountId, credit: t.amount, description: `${t.code} perçue`, taxCodeId: code.id })
    }

    return this.post({
      date: opts.date, source: 'SALE', sourceRef: `sale:${opts.orderId}`,
      currencyCode: opts.currencyCode, memo: `Vente ${opts.orderId.slice(-8).toUpperCase()}`, lines,
    })
  }

  /** Poste un encaissement client : Dr Encaisse ; Cr Comptes clients. */
  static async postPayment(opts: {
    paymentId: string; date: Date; amount: number; customerName?: string; businessCustomerId?: string | null
  }) {
    const [cash, ar] = await Promise.all([
      LedgerService.accountFor('CASH'),
      LedgerService.accountFor('ACCOUNTS_RECEIVABLE'),
    ])
    return this.post({
      date: opts.date, source: 'PAYMENT', sourceRef: `payment:${opts.paymentId}`,
      memo: `Encaissement — ${opts.customerName ?? ''}`.trim(),
      lines: [
        { accountId: cash.id, debit: opts.amount, description: 'Encaissement' },
        { accountId: ar.id, credit: opts.amount, description: 'Comptes clients', businessCustomerId: opts.businessCustomerId ?? undefined },
      ],
    })
  }
}
