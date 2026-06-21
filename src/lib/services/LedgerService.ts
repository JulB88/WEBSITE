import { prisma } from '@/lib/prisma'
import type { AccountType } from '@prisma/client'

/**
 * LedgerService — plan comptable (chart of accounts) + mappages de comptes.
 *
 * Tout est éditable et configurable (white-label). seedDefaults() crée un plan
 * comptable PME générique, les mappages système, la devise de base (CAD) et les
 * codes de taxe TPS/TVQ — qu'un acheteur peut entièrement reconfigurer.
 */

interface DefaultAccount { code: string; name: string; type: AccountType; sort: number }

const DEFAULT_ACCOUNTS: DefaultAccount[] = [
  { code: '1000', name: 'Encaisse',                      type: 'ASSET',     sort: 10 },
  { code: '1100', name: 'Comptes clients',               type: 'ASSET',     sort: 20 },
  { code: '1200', name: 'Stocks',                        type: 'ASSET',     sort: 30 },
  { code: '1300', name: 'CTI / RTI à recevoir',          type: 'ASSET',     sort: 40 },
  { code: '1500', name: 'Immobilisations',               type: 'ASSET',     sort: 50 },
  { code: '2100', name: 'Comptes fournisseurs',          type: 'LIABILITY', sort: 60 },
  { code: '2310', name: 'TPS à payer',                   type: 'LIABILITY', sort: 70 },
  { code: '2320', name: 'TVQ à payer',                   type: 'LIABILITY', sort: 80 },
  { code: '3000', name: 'Capital social',                type: 'EQUITY',    sort: 90 },
  { code: '3100', name: 'Bénéfices non répartis',        type: 'EQUITY',    sort: 100 },
  { code: '4000', name: 'Ventes',                        type: 'REVENUE',   sort: 110 },
  { code: '4100', name: 'Escomptes et rendus sur ventes', type: 'REVENUE',  sort: 120 },
  { code: '5000', name: 'Coût des marchandises vendues', type: 'EXPENSE',   sort: 130 },
  { code: '6000', name: "Frais d'exploitation",          type: 'EXPENSE',   sort: 140 },
  { code: '6100', name: 'Frais bancaires',               type: 'EXPENSE',   sort: 150 },
  { code: '6900', name: "Écart d'arrondi",               type: 'EXPENSE',   sort: 160 },
  { code: '6950', name: 'Gain / perte de change',        type: 'EXPENSE',   sort: 170 },
]

interface DefaultMapping { key: string; label: string; code: string }

export const MAPPING_KEYS = [
  'SALES_REVENUE', 'ACCOUNTS_RECEIVABLE', 'CASH', 'ACCOUNTS_PAYABLE',
  'DEFAULT_EXPENSE', 'COGS', 'INVENTORY', 'SALES_DISCOUNTS', 'ROUNDING', 'RETAINED_EARNINGS', 'FX_GAIN_LOSS',
] as const

const DEFAULT_MAPPINGS: DefaultMapping[] = [
  { key: 'SALES_REVENUE',       label: 'Ventes (produits)',          code: '4000' },
  { key: 'ACCOUNTS_RECEIVABLE', label: 'Comptes clients',            code: '1100' },
  { key: 'CASH',                label: 'Encaisse / banque',          code: '1000' },
  { key: 'ACCOUNTS_PAYABLE',    label: 'Comptes fournisseurs',       code: '2100' },
  { key: 'DEFAULT_EXPENSE',     label: 'Charge par défaut',          code: '6000' },
  { key: 'COGS',                label: 'Coût des marchandises vendues', code: '5000' },
  { key: 'INVENTORY',           label: 'Stocks',                     code: '1200' },
  { key: 'SALES_DISCOUNTS',     label: 'Escomptes sur ventes',       code: '4100' },
  { key: 'ROUNDING',            label: "Écart d'arrondi",            code: '6900' },
  { key: 'RETAINED_EARNINGS',   label: 'Bénéfices non répartis',     code: '3100' },
  { key: 'FX_GAIN_LOSS',        label: 'Gain / perte de change',     code: '6950' },
]

interface DefaultTaxCode { code: string; name: string; rate: number; jurisdiction: string; collectedCode: string; paidCode: string; sort: number }

const DEFAULT_TAX_CODES: DefaultTaxCode[] = [
  { code: 'TPS', name: 'Taxe sur les produits et services (5 %)', rate: 0.05,    jurisdiction: 'CA-QC', collectedCode: '2310', paidCode: '1300', sort: 10 },
  { code: 'TVQ', name: 'Taxe de vente du Québec (9,975 %)',       rate: 0.09975, jurisdiction: 'CA-QC', collectedCode: '2320', paidCode: '1300', sort: 20 },
]

export class LedgerService {
  /** Crée le plan comptable, les mappages, la devise de base et les codes de taxe par défaut (idempotent). */
  static async seedDefaults(): Promise<void> {
    // 1. Comptes
    for (const a of DEFAULT_ACCOUNTS) {
      await prisma.ledgerAccount.upsert({
        where:  { code: a.code },
        update: {}, // préserve les modifications de l'utilisateur
        create: { code: a.code, name: a.name, type: a.type, isSystem: true, sortOrder: a.sort },
      })
    }
    const accounts = await prisma.ledgerAccount.findMany({ select: { id: true, code: true } })
    const idByCode = new Map(accounts.map((a) => [a.code, a.id]))

    // 2. Mappages
    for (const m of DEFAULT_MAPPINGS) {
      await prisma.accountMapping.upsert({
        where:  { key: m.key },
        update: { label: m.label }, // garde le compte choisi par l'utilisateur, rafraîchit le libellé
        create: { key: m.key, label: m.label, accountId: idByCode.get(m.code) ?? null },
      })
    }

    // 3. Devise de base
    await prisma.currency.upsert({
      where:  { code: 'CAD' },
      update: {},
      create: { code: 'CAD', symbol: '$', name: 'Dollar canadien', isBase: true },
    })

    // 4. Codes de taxe
    for (const t of DEFAULT_TAX_CODES) {
      const tc = await prisma.taxCode.upsert({
        where:  { code: t.code },
        update: {},
        create: {
          code: t.code, name: t.name, rate: t.rate, jurisdiction: t.jurisdiction,
          isSystem: true, sortOrder: t.sort,
          collectedAccountId: idByCode.get(t.collectedCode) ?? null,
          paidAccountId: idByCode.get(t.paidCode) ?? null,
        },
      })
      // Mise à niveau unique : ajoute le compte CTI/RTI si absent (codes seedés avant la phase 4)
      if (!tc.paidAccountId) {
        await prisma.taxCode.update({ where: { id: tc.id }, data: { paidAccountId: idByCode.get(t.paidCode) ?? null } })
      }
    }
  }

  // ─── Plan comptable ──────────────────────────────────────────────────────────
  static async getAccounts() {
    return prisma.ledgerAccount.findMany({ orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }] })
  }

  static async createAccount(data: { code: string; name: string; type: AccountType; description?: string }) {
    return prisma.ledgerAccount.create({
      data: { code: data.code.trim(), name: data.name.trim(), type: data.type, description: data.description?.trim() || null },
    })
  }

  static async updateAccount(id: string, data: { code?: string; name?: string; type?: AccountType; description?: string; isActive?: boolean }) {
    return prisma.ledgerAccount.update({
      where: { id },
      data: {
        ...(data.code !== undefined && { code: data.code.trim() }),
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.description !== undefined && { description: data.description.trim() || null }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    })
  }

  /** Supprime un compte non système (les comptes système sont protégés). */
  static async deleteAccount(id: string): Promise<void> {
    const acc = await prisma.ledgerAccount.findUnique({ where: { id } })
    if (!acc) throw new Error('Compte introuvable')
    if (acc.isSystem) throw new Error('Les comptes système ne peuvent pas être supprimés (désactive-les plutôt).')
    await prisma.ledgerAccount.delete({ where: { id } })
  }

  // ─── Mappages ────────────────────────────────────────────────────────────────
  static async getMappings() {
    return prisma.accountMapping.findMany({ include: { account: true }, orderBy: { key: 'asc' } })
  }

  static async setMapping(key: string, accountId: string | null) {
    return prisma.accountMapping.update({ where: { key }, data: { accountId } })
  }

  /** Résout le compte associé à un rôle système. Auto-seed si jamais initialisé. */
  static async accountFor(key: string) {
    let m = await prisma.accountMapping.findUnique({ where: { key }, include: { account: true } })
    if (!m) {
      // Premières écritures avant toute visite de la page config → seed à la volée
      await this.seedDefaults()
      m = await prisma.accountMapping.findUnique({ where: { key }, include: { account: true } })
    }
    if (!m?.account) throw new Error(`Aucun compte mappé pour « ${key} ». Configure-le dans Comptabilité → Paramètres → Mappages.`)
    return m.account
  }
}
