import { prisma } from '@/lib/prisma'

/**
 * CurrencyService — devises et taux de change (multi-devise).
 *
 * La devise de base est celle dans laquelle le grand livre est tenu.
 * Les taux expriment « unités de base pour 1 unité de la devise étrangère ».
 */
export class CurrencyService {
  /** Devise de base (défaut CAD si rien de configuré). */
  static async getBase(): Promise<{ code: string; symbol: string }> {
    const base = await prisma.currency.findFirst({ where: { isBase: true } })
    return base ? { code: base.code, symbol: base.symbol } : { code: 'CAD', symbol: '$' }
  }

  static async getCurrencies() {
    return prisma.currency.findMany({ orderBy: [{ isBase: 'desc' }, { code: 'asc' }] })
  }

  static async addCurrency(data: { code: string; symbol: string; name: string }) {
    return prisma.currency.create({
      data: { code: data.code.trim().toUpperCase(), symbol: data.symbol.trim(), name: data.name.trim() },
    })
  }

  /** Définit la devise de base (une seule). */
  static async setBase(code: string) {
    await prisma.$transaction([
      prisma.currency.updateMany({ data: { isBase: false } }),
      prisma.currency.update({ where: { code }, data: { isBase: true, isActive: true } }),
    ])
  }

  static async setRate(currencyCode: string, rate: number, asOf: Date) {
    return prisma.exchangeRate.create({ data: { currencyCode, rate, asOf } })
  }

  /** Dernier taux connu (≤ asOf) ; 1 pour la devise de base. */
  static async rateToBase(currencyCode: string, asOf: Date = new Date()): Promise<number> {
    const base = await this.getBase()
    if (currencyCode === base.code) return 1
    const r = await prisma.exchangeRate.findFirst({
      where: { currencyCode, asOf: { lte: asOf } },
      orderBy: { asOf: 'desc' },
    })
    return r?.rate ?? 1
  }

  static async convertToBase(amount: number, currencyCode: string, asOf?: Date): Promise<number> {
    const rate = await this.rateToBase(currencyCode, asOf)
    return Math.round(amount * rate * 100) / 100
  }
}
