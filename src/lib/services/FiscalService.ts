import { prisma } from '@/lib/prisma'
import type { FiscalPeriodStatus } from '@prisma/client'

/**
 * FiscalService — exercices et périodes comptables.
 *
 * Une période fermée (CLOSED) ou verrouillée (LOCKED) bloque tout nouveau
 * postage à une date comprise dans cette période (clôture de période).
 * S'il n'existe aucune période couvrant une date, le postage est permis
 * (les périodes sont des garde-fous optionnels).
 */
export class FiscalService {
  /** Crée un exercice de 12 mois + ses 12 périodes mensuelles (OPEN). */
  static async createYear(name: string, startDate: Date) {
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
    const end = new Date(start.getFullYear() + 1, start.getMonth(), 0)

    const year = await prisma.fiscalYear.create({ data: { name: name.trim(), startDate: start, endDate: end } })

    for (let i = 0; i < 12; i++) {
      const pStart = new Date(start.getFullYear(), start.getMonth() + i, 1)
      const pEnd = new Date(start.getFullYear(), start.getMonth() + i + 1, 0)
      const periodName = `${pStart.getFullYear()}-${String(pStart.getMonth() + 1).padStart(2, '0')}`
      await prisma.fiscalPeriod.create({
        data: { fiscalYearId: year.id, name: periodName, startDate: pStart, endDate: pEnd, status: 'OPEN' },
      })
    }
    return this.getYear(year.id)
  }

  static async getYear(id: string) {
    return prisma.fiscalYear.findUnique({ where: { id }, include: { periods: { orderBy: { startDate: 'asc' } } } })
  }

  static async listYears() {
    return prisma.fiscalYear.findMany({
      orderBy: { startDate: 'desc' },
      include: { periods: { orderBy: { startDate: 'asc' } } },
    })
  }

  static async setPeriodStatus(periodId: string, status: FiscalPeriodStatus) {
    return prisma.fiscalPeriod.update({ where: { id: periodId }, data: { status } })
  }

  /** Période couvrant une date (ou null). */
  static async periodForDate(date: Date) {
    return prisma.fiscalPeriod.findFirst({
      where: { startDate: { lte: date }, endDate: { gte: date } },
    })
  }

  /** Lance une erreur si la date tombe dans une période fermée/verrouillée. */
  static async assertOpen(date: Date): Promise<string | undefined> {
    const period = await this.periodForDate(date)
    if (!period) return undefined
    if (period.status !== 'OPEN') {
      throw new Error(`La période ${period.name} est ${period.status === 'LOCKED' ? 'verrouillée' : 'fermée'} — aucune écriture permise à cette date.`)
    }
    return period.id
  }
}
