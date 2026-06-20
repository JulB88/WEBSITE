/**
 * Backfill comptable — génère les écritures de grand livre pour l'historique
 * des commandes (ventes) et des paiements (encaissements).
 *
 * Idempotent : ré-exécutable sans doublon (clé source+sourceRef).
 * Usage : npx tsx scripts/backfill-accounting.mts
 */
import { prisma } from '../src/lib/prisma'
import { LedgerService } from '../src/lib/services/LedgerService'
import { JournalService } from '../src/lib/services/JournalService'

async function main() {
  await LedgerService.seedDefaults()
  console.log('Plan comptable vérifié.')

  // ── Ventes (commandes reconnues) ──────────────────────────────────────────
  const orders = await prisma.order.findMany({
    where: { status: { notIn: ['PENDING', 'CANCELLED'] } },
    include: { user: { select: { name: true, email: true } }, businessCustomer: { select: { companyName: true } } },
    orderBy: { createdAt: 'asc' },
  })
  let sales = 0, salesErr = 0
  for (const o of orders) {
    try {
      await JournalService.postSale({
        orderId: o.id,
        date: o.invoicedAt ?? o.createdAt,
        total: o.totalAmount,
        toKey: o.paymentMethod === 'CARD' ? 'CASH' : 'ACCOUNTS_RECEIVABLE',
        customerName: o.businessCustomer?.companyName ?? o.user.name ?? o.user.email,
        businessCustomerId: o.businessCustomerId,
      })
      sales++
    } catch (e: any) { salesErr++; console.error(`  vente ${o.id.slice(-8)}: ${e.message}`) }
  }
  console.log(`Ventes postées : ${sales} (${salesErr} erreurs)`)

  // ── Encaissements (paiements au compte) ───────────────────────────────────
  const payments = await prisma.payment.findMany({ orderBy: { createdAt: 'asc' } })
  let pays = 0, paysErr = 0
  for (const p of payments) {
    try {
      await JournalService.postPayment({ paymentId: p.id, date: p.createdAt, amount: p.amount })
      pays++
    } catch (e: any) { paysErr++; console.error(`  paiement ${p.id.slice(-8)}: ${e.message}`) }
  }
  console.log(`Encaissements postés : ${pays} (${paysErr} erreurs)`)

  // ── Vérification : balance de vérification équilibrée ─────────────────────
  const lines = await prisma.journalLine.findMany({ select: { baseDebit: true, baseCredit: true } })
  const totalDebit = lines.reduce((s, l) => s + Number(l.baseDebit), 0)
  const totalCredit = lines.reduce((s, l) => s + Number(l.baseCredit), 0)
  const entries = await prisma.journalEntry.count()
  console.log(`\nÉcritures totales : ${entries}`)
  console.log(`Balance : débits ${totalDebit.toFixed(2)} = crédits ${totalCredit.toFixed(2)} → ${Math.abs(totalDebit - totalCredit) < 0.01 ? 'ÉQUILIBRÉE ✓' : 'DÉSÉQUILIBRE ✗'}`)

  await prisma.$disconnect()
}
main().catch((e) => { console.error('ERREUR:', e); process.exit(1) })
