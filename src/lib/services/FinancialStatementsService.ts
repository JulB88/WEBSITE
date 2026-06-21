import { prisma } from '@/lib/prisma'
import type { AccountType } from '@prisma/client'

/**
 * FinancialStatementsService — bilan et état des résultats, dérivés du grand
 * livre (JournalLine postées), regroupés par type de compte.
 *
 * Conventions de solde :
 *   ASSET, EXPENSE  → solde débiteur  (débit − crédit)
 *   LIABILITY, EQUITY, REVENUE → solde créditeur (crédit − débit)
 */

const round = (n: number) => Math.round(n * 100) / 100

export interface StatementLine { code: string; name: string; amount: number }
export interface StatementSection { title: string; lines: StatementLine[]; total: number }

export interface BalanceSheet {
  asOf: string
  assets: StatementSection
  liabilities: StatementSection
  equity: StatementSection
  netIncome: number              // résultat courant (produits − charges) jusqu'à la date
  totalAssets: number
  totalLiabEquity: number        // passif + capitaux + résultat
  balanced: boolean
}

export interface IncomeStatement {
  from: string
  to: string
  revenue: StatementSection
  expenses: StatementSection
  netIncome: number
}

export class FinancialStatementsService {
  /** Soldes nets par compte (signés selon la nature) sur une fenêtre de dates. */
  private static async balancesByAccount(opts: { to: Date; from?: Date }) {
    const accounts = await prisma.ledgerAccount.findMany({ orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }] })
    const lines = await prisma.journalLine.findMany({
      where: { entry: { date: { ...(opts.from ? { gte: opts.from } : {}), lte: opts.to } } },
      select: { accountId: true, baseDebit: true, baseCredit: true },
    })

    const debit = new Map<string, number>()
    const credit = new Map<string, number>()
    for (const l of lines) {
      debit.set(l.accountId, (debit.get(l.accountId) ?? 0) + Number(l.baseDebit))
      credit.set(l.accountId, (credit.get(l.accountId) ?? 0) + Number(l.baseCredit))
    }

    return accounts.map((a) => {
      const d = debit.get(a.id) ?? 0
      const c = credit.get(a.id) ?? 0
      const creditNormal = a.type === 'LIABILITY' || a.type === 'EQUITY' || a.type === 'REVENUE'
      const amount = round(creditNormal ? c - d : d - c)
      return { code: a.code, name: a.name, type: a.type as AccountType, amount }
    })
  }

  private static section(title: string, rows: { code: string; name: string; amount: number }[]): StatementSection {
    const lines = rows.filter((r) => Math.abs(r.amount) > 0.005).map((r) => ({ code: r.code, name: r.name, amount: r.amount }))
    return { title, lines, total: round(lines.reduce((s, l) => s + l.amount, 0)) }
  }

  /** Bilan à une date donnée (cumul depuis le début). */
  static async balanceSheet(asOf: Date): Promise<BalanceSheet> {
    const bals = await this.balancesByAccount({ to: asOf })
    const by = (t: AccountType) => bals.filter((b) => b.type === t)

    const assets = this.section('Actif', by('ASSET'))
    const liabilities = this.section('Passif', by('LIABILITY'))
    const equity = this.section('Capitaux propres', by('EQUITY'))
    const revenue = by('REVENUE').reduce((s, b) => s + b.amount, 0)
    const expenses = by('EXPENSE').reduce((s, b) => s + b.amount, 0)
    const netIncome = round(revenue - expenses)

    const totalAssets = assets.total
    const totalLiabEquity = round(liabilities.total + equity.total + netIncome)
    return {
      asOf: asOf.toISOString().slice(0, 10),
      assets, liabilities, equity, netIncome,
      totalAssets, totalLiabEquity,
      balanced: Math.abs(totalAssets - totalLiabEquity) < 0.01,
    }
  }

  /** État des résultats sur une période. */
  static async incomeStatement(from: Date, to: Date): Promise<IncomeStatement> {
    const bals = await this.balancesByAccount({ from, to })
    const revenue = this.section('Produits', bals.filter((b) => b.type === 'REVENUE'))
    const expenses = this.section('Charges', bals.filter((b) => b.type === 'EXPENSE'))
    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      revenue, expenses,
      netIncome: round(revenue.total - expenses.total),
    }
  }
}
