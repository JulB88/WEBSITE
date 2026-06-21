import { prisma } from '@/lib/prisma'
import { SettingsService } from './SettingsService'
import { createBCClient } from '@/lib/businesscentral'

/**
 * BcSyncService — synchronisation des écritures du grand livre vers le journal
 * général de Business Central (optionnelle, activable).
 *
 * La comptabilité interne reste autonome ; si la synchronisation est activée,
 * chaque écriture postée est exportée vers BC (best-effort, non bloquant).
 * Pré-requis côté BC : un journal général (batch) dont le code correspond au
 * réglage `bc_journal_batch`, et des numéros de compte du grand livre BC
 * identiques aux codes du plan comptable de l'application.
 */
export class BcSyncService {
  static async isEnabled(): Promise<boolean> {
    return (await SettingsService.get('accounting_bc_sync_enabled')) === 'true'
  }

  /** Exporte une écriture vers BC. Retourne {synced|skipped|error}. */
  static async syncEntry(entryId: string): Promise<{ synced?: boolean; skipped?: boolean; error?: string }> {
    if (!(await this.isEnabled())) return { skipped: true }

    const entry = await prisma.journalEntry.findUnique({
      where: { id: entryId },
      include: { lines: { include: { account: { select: { code: true } } } } },
    })
    if (!entry || entry.status !== 'POSTED') return { skipped: true }
    if (entry.bcSyncedAt) return { skipped: true } // déjà synchronisée

    try {
      const bc = await createBCClient()
      const batch = await SettingsService.get('bc_journal_batch')
      const journal = await bc.findJournal(batch || undefined)
      if (!journal) throw new Error('Aucun journal général trouvé dans Business Central.')

      const postingDate = entry.date.toISOString().slice(0, 10)
      const docNumber = `JE-${entry.number}`
      for (const l of entry.lines) {
        const amount = Math.round((Number(l.baseDebit) - Number(l.baseCredit)) * 100) / 100
        if (amount === 0) continue
        await bc.createJournalLine(journal.id, {
          accountNumber: l.account.code,
          postingDate,
          documentNumber: docNumber,
          description: l.description ?? entry.memo ?? `Écriture ${entry.number}`,
          amount,
        })
      }

      await prisma.journalEntry.update({ where: { id: entry.id }, data: { bcSyncedAt: new Date(), bcError: null } })
      return { synced: true }
    } catch (err: any) {
      const msg = err?.message?.slice(0, 300) ?? 'Erreur inconnue'
      await prisma.journalEntry.update({ where: { id: entry.id }, data: { bcError: msg } }).catch(() => {})
      return { error: msg }
    }
  }

  /** Synchronise toutes les écritures postées non encore synchronisées. */
  static async syncPending(limit = 200): Promise<{ synced: number; errors: number; skipped: number; message: string }> {
    if (!(await this.isEnabled())) {
      return { synced: 0, errors: 0, skipped: 0, message: 'Synchronisation BC désactivée.' }
    }
    const pending = await prisma.journalEntry.findMany({
      where: { status: 'POSTED', bcSyncedAt: null },
      orderBy: { number: 'asc' },
      take: limit,
      select: { id: true },
    })
    let synced = 0, errors = 0
    for (const e of pending) {
      const r = await this.syncEntry(e.id)
      if (r.synced) synced++
      else if (r.error) errors++
    }
    return { synced, errors, skipped: 0, message: `BC : ${synced} écriture(s) synchronisée(s), ${errors} erreur(s).` }
  }
}
