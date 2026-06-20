import { SettingsService } from './SettingsService'
import { prisma } from '@/lib/prisma'

/**
 * TaxService — taxes de vente canadiennes (TPS/TVQ par défaut, Québec).
 *
 * Les prix du site sont considérés TAXE INCLUSE (cohérent avec « Taxes incluses »
 * au paiement). Le service ventile le montant total en sous-total + TPS + TVQ
 * pour la facturation et la comptabilité — sans changer le montant facturé.
 *
 * Au Québec, la TVQ est calculée sur le sous-total (et non sur la TPS) depuis 2013.
 */

export interface TaxRates {
  gstRate:   number  // ex. 0.05  (TPS)
  qstRate:   number  // ex. 0.09975 (TVQ)
  gstNumber: string  // n° d'inscription TPS
  qstNumber: string  // n° d'inscription TVQ
  included:  boolean // les prix incluent-ils la taxe (true par défaut)
}

export interface TaxBreakdown {
  subtotal: number
  gst:      number
  qst:      number
  total:    number
}

export class TaxService {
  static readonly DEFAULTS: TaxRates = {
    gstRate:   0.05,
    qstRate:   0.09975,
    gstNumber: '',
    qstNumber: '',
    included:  true,
  }

  static async getRates(): Promise<TaxRates> {
    const s = await SettingsService.getMany([
      'tax_gst_rate', 'tax_qst_rate', 'tax_gst_number', 'tax_qst_number', 'tax_included',
    ])
    const num = (v: string, d: number) => {
      const n = parseFloat(v)
      return Number.isFinite(n) ? n : d
    }
    return {
      gstRate:   num(s.tax_gst_rate, this.DEFAULTS.gstRate),
      qstRate:   num(s.tax_qst_rate, this.DEFAULTS.qstRate),
      gstNumber: s.tax_gst_number || '',
      qstNumber: s.tax_qst_number || '',
      included:  s.tax_included ? s.tax_included !== 'false' : true,
    }
  }

  /** Arrondit à 2 décimales. */
  private static round(n: number): number {
    return Math.round(n * 100) / 100
  }

  /**
   * Ventile un montant TAXE INCLUSE en sous-total + TPS + TVQ.
   * total = sous-total × (1 + tpsRate + tvqRate)
   */
  static breakdownFromTotal(total: number, rates: TaxRates): TaxBreakdown {
    const divisor = 1 + rates.gstRate + rates.qstRate
    const subtotal = this.round(total / divisor)
    const gst = this.round(subtotal * rates.gstRate)
    // La TVQ absorbe l'arrondi pour que la somme égale exactement le total
    const qst = this.round(total - subtotal - gst)
    return { subtotal, gst, qst, total: this.round(total) }
  }

  /**
   * Ajoute la taxe à un sous-total (taxe en sus — pour usage futur).
   */
  static breakdownFromSubtotal(subtotal: number, rates: TaxRates): TaxBreakdown {
    const gst = this.round(subtotal * rates.gstRate)
    const qst = this.round(subtotal * rates.qstRate)
    return { subtotal: this.round(subtotal), gst, qst, total: this.round(subtotal + gst + qst) }
  }

  /** Ventile selon le mode configuré (inclus vs en sus). */
  static breakdown(amount: number, rates: TaxRates): TaxBreakdown {
    return rates.included
      ? this.breakdownFromTotal(amount, rates)
      : this.breakdownFromSubtotal(amount, rates)
  }

  // ─── Codes de taxe configurables (multi-juridiction) ─────────────────────────

  /**
   * Lit les rates depuis les TaxCode actifs en BD si disponibles, sinon repli
   * sur les réglages (tax_gst_rate / tax_qst_rate). Garde la rétrocompatibilité.
   */
  static async getEffectiveRates(): Promise<TaxRates> {
    try {
      const codes = await prisma.taxCode.findMany({ where: { isActive: true } })
      if (codes.length > 0) {
        // Mappe les codes connus (TPS→gst, TVQ→qst) ; fallback : somme par position
        const gst = codes.find((c) => /TPS|GST/i.test(c.code))?.rate
        const qst = codes.find((c) => /TVQ|QST/i.test(c.code))?.rate
        const base = await this.getRates()
        return {
          ...base,
          gstRate: gst ?? base.gstRate,
          qstRate: qst ?? base.qstRate,
        }
      }
    } catch {
      // table absente / non seedée → réglages
    }
    return this.getRates()
  }

  /** Liste des codes de taxe actifs (pour l'UI et les rapports par code). */
  static async getActiveTaxCodes() {
    return prisma.taxCode.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    })
  }

  /**
   * Ventile un total taxe incluse selon une liste de codes (non composés).
   * total = sous-total × (1 + Σ taux). Le dernier code absorbe l'arrondi.
   */
  static breakdownByCodes(total: number, codes: { code: string; rate: number }[]): {
    subtotal: number; taxes: { code: string; rate: number; amount: number }[]; total: number
  } {
    const sumRates = codes.reduce((s, c) => s + c.rate, 0)
    const subtotal = this.round(total / (1 + sumRates))
    let allocated = 0
    const taxes = codes.map((c, i) => {
      const amount = i === codes.length - 1
        ? this.round(total - subtotal - allocated)
        : this.round(subtotal * c.rate)
      allocated += amount
      return { code: c.code, rate: c.rate, amount }
    })
    return { subtotal, taxes, total: this.round(total) }
  }
}
