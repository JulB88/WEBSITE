import { SettingsService } from './SettingsService'

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
}
