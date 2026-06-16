import { SettingsService } from './SettingsService'

/**
 * EmailService — envoi de courriels transactionnels via l'API Resend.
 *
 * Configuration (page Settings) :
 *  - resend_api_key : clé API Resend (chiffrée en BD)
 *  - email_from     : adresse expéditeur (ex: "DSF Distribution <factures@dsf.com>")
 *
 * Si non configuré : les envois sont loggés et ignorés (no-op) — aucune
 * fonctionnalité ne plante en l'absence de configuration email.
 */

export interface InvoiceLine {
  name: string
  quantity: number
  unitPrice: number
}

export interface InvoiceData {
  invoiceNo: string
  orderId: string
  date: Date
  customerName: string
  companyName?: string | null
  lines: InvoiceLine[]
  total: number
  paymentMethod: 'CARD' | 'ON_ACCOUNT'
  /** true = facture finale (facturation au compte), false = facture d'achat */
  isFinal: boolean
}

export interface StatementOrderLine {
  invoiceNo: string | null
  orderId: string
  date: Date
  total: number
  paid: number
  status: string
}

export interface StatementData {
  companyName: string
  customerName: string
  period: string // "2026-06"
  lines: StatementOrderLine[]
  totalBilled: number
  totalPaid: number
  balance: number
  creditLimit: number
}

const CURRENCY = (n: number) => `${n.toFixed(2)} $`

export class EmailService {
  /** Envoie un courriel via Resend. Retourne true si envoyé, false si non configuré. */
  static async send(to: string, subject: string, html: string): Promise<boolean> {
    const { resend_api_key: apiKey, email_from: from } = await SettingsService.getMany([
      'resend_api_key',
      'email_from',
    ])

    if (!apiKey || !from) {
      console.warn(`[email] Non configuré — courriel "${subject}" pour ${to} non envoyé`)
      return false
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
      signal: AbortSignal.timeout(15_000),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Resend API ${res.status}: ${body}`)
    }
    return true
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Facture (achat ou finale)
  // ──────────────────────────────────────────────────────────────────────────

  static async sendInvoice(to: string, data: InvoiceData): Promise<boolean> {
    const title = data.isFinal ? 'Facture' : "Confirmation d'achat"
    const subject = `${title} ${data.invoiceNo} — DSF Distribution`
    return this.send(to, subject, this.invoiceHtml(data))
  }

  private static invoiceHtml(data: InvoiceData): string {
    const rows = data.lines
      .map(
        (l) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(l.name)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${l.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${CURRENCY(l.unitPrice)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">${CURRENCY(l.unitPrice * l.quantity)}</td>
        </tr>`
      )
      .join('')

    const methodLabel =
      data.paymentMethod === 'CARD'
        ? 'Payée par carte de crédit'
        : data.isFinal
          ? 'Portée au compte — paiement selon vos modalités'
          : 'Portée au compte — une facture finale suivra'

    const banner = data.isFinal
      ? `<p style="background:#fef3c7;border:1px solid #fcd34d;color:#92400e;padding:10px 14px;font-size:13px;">
           Cette facture a été portée à votre compte client. Merci de la régler selon les modalités convenues.
         </p>`
      : ''

    return baseLayout(`
      <h2 style="margin:0 0 4px;color:#1f2232;text-transform:uppercase;letter-spacing:.05em;">
        ${data.isFinal ? 'Facture' : "Confirmation d'achat"}
      </h2>
      <p style="margin:0 0 20px;color:#6b7280;font-size:13px;">
        N° ${escapeHtml(data.invoiceNo)} — ${data.date.toLocaleDateString('fr-CA')}
      </p>
      ${banner}
      <p style="font-size:14px;color:#374151;">
        ${escapeHtml(data.companyName || data.customerName)},<br/>
        ${data.isFinal ? 'voici votre facture finale.' : 'merci pour votre commande. En voici le détail :'}
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin:16px 0;">
        <thead>
          <tr style="background:#1f2232;color:#fff;">
            <th style="padding:10px 12px;text-align:left;">Produit</th>
            <th style="padding:10px 12px;text-align:center;">Qté</th>
            <th style="padding:10px 12px;text-align:right;">Prix unitaire</th>
            <th style="padding:10px 12px;text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding:12px;text-align:right;font-weight:700;color:#1f2232;">TOTAL</td>
            <td style="padding:12px;text-align:right;font-weight:900;color:#e51937;font-size:16px;">${CURRENCY(data.total)}</td>
          </tr>
        </tfoot>
      </table>
      <p style="font-size:13px;color:#6b7280;">${methodLabel}</p>
      <p style="font-size:12px;color:#9ca3af;">Référence commande : ${escapeHtml(data.orderId)}</p>
    `)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // État de compte mensuel
  // ──────────────────────────────────────────────────────────────────────────

  static async sendStatement(to: string, data: StatementData): Promise<boolean> {
    const subject = `État de compte ${data.period} — DSF Distribution`
    return this.send(to, subject, this.statementHtml(data))
  }

  private static statementHtml(data: StatementData): string {
    const rows = data.lines
      .map((l) => {
        const statusColor =
          l.status === 'PAID' ? '#16a34a' : l.status === 'PARTIAL' ? '#d97706' : '#dc2626'
        const statusLabel =
          l.status === 'PAID' ? 'Payée' : l.status === 'PARTIAL' ? 'Partielle' : 'Impayée'
        return `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(l.invoiceNo ?? l.orderId.slice(-8).toUpperCase())}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${l.date.toLocaleDateString('fr-CA')}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${CURRENCY(l.total)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${CURRENCY(l.paid)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${CURRENCY(l.total - l.paid)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;color:${statusColor};font-weight:600;">${statusLabel}</td>
        </tr>`
      })
      .join('')

    return baseLayout(`
      <h2 style="margin:0 0 4px;color:#1f2232;text-transform:uppercase;letter-spacing:.05em;">État de compte</h2>
      <p style="margin:0 0 20px;color:#6b7280;font-size:13px;">Période : ${escapeHtml(data.period)}</p>
      <p style="font-size:14px;color:#374151;">${escapeHtml(data.companyName)},<br/>voici le sommaire de votre compte client.</p>

      <table style="width:100%;border-collapse:collapse;font-size:13px;margin:16px 0;">
        <thead>
          <tr style="background:#1f2232;color:#fff;">
            <th style="padding:10px 12px;text-align:left;">Facture</th>
            <th style="padding:10px 12px;text-align:left;">Date</th>
            <th style="padding:10px 12px;text-align:right;">Montant</th>
            <th style="padding:10px 12px;text-align:right;">Payé</th>
            <th style="padding:10px 12px;text-align:right;">Solde</th>
            <th style="padding:10px 12px;text-align:center;">Statut</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="6" style="padding:16px;text-align:center;color:#9ca3af;">Aucune activité ce mois-ci</td></tr>'}</tbody>
      </table>

      <table style="width:100%;font-size:13px;margin:8px 0;">
        <tr><td style="padding:4px 12px;color:#6b7280;">Facturé au compte (période)</td><td style="text-align:right;font-weight:600;">${CURRENCY(data.totalBilled)}</td></tr>
        <tr><td style="padding:4px 12px;color:#6b7280;">Paiements reçus (période)</td><td style="text-align:right;font-weight:600;">${CURRENCY(data.totalPaid)}</td></tr>
        <tr><td style="padding:8px 12px;font-weight:700;color:#1f2232;border-top:2px solid #1f2232;">SOLDE À PAYER</td>
            <td style="text-align:right;font-weight:900;color:#e51937;font-size:16px;border-top:2px solid #1f2232;">${CURRENCY(data.balance)}</td></tr>
        <tr><td style="padding:4px 12px;color:#9ca3af;font-size:12px;">Limite de crédit</td><td style="text-align:right;color:#9ca3af;font-size:12px;">${CURRENCY(data.creditLimit)}</td></tr>
      </table>
    `)
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:640px;margin:0 auto;padding:24px 16px;">
    <div style="height:4px;background:#e51937;"></div>
    <div style="background:#1f2232;padding:18px 24px;">
      <span style="color:#fff;font-size:20px;font-weight:900;letter-spacing:.08em;">DSF</span>
      <span style="color:#9ca3af;font-size:12px;margin-left:8px;letter-spacing:.06em;">DISTRIBUTION</span>
    </div>
    <div style="background:#ffffff;padding:28px 24px;border:1px solid #e5e7eb;border-top:none;">
      ${content}
    </div>
    <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:16px;">
      DSF Distribution — Ce courriel a été généré automatiquement, merci de ne pas y répondre.
    </p>
  </div>
</body>
</html>`
}
