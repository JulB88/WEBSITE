import nodemailer from 'nodemailer'
import { prisma } from '@/lib/prisma'
import { SettingsService } from './SettingsService'
import { BrandService, type Brand } from './BrandService'
import { TaxService, type TaxRates, type TaxBreakdown } from './TaxService'

/**
 * EmailService — envoi SMTP (Nodemailer) + moteur de modèles & workflows.
 *
 * Modèles éditables (table EmailTemplate) : sujet + corps HTML avec variables {{var}}.
 * Déclencheurs (table EmailTrigger) : à quel événement système on envoie quel modèle,
 * avec un interrupteur on/off. Le tout est géré depuis /dashboard/emails.
 *
 * Configuration SMTP (page Paramètres) :
 *  - smtp_host / smtp_port / smtp_user / smtp_password / email_from
 *
 * Sans config SMTP : no-op (aucun plantage).
 */

// ─── Types de données ─────────────────────────────────────────────────────────

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
  isFinal: boolean
}

export interface PaymentData {
  invoiceNo: string
  customerName: string
  companyName?: string | null
  amountPaid: number
  total: number
  paidAmount: number
  remaining: number
  paymentStatus: 'PARTIAL' | 'PAID'
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
  period: string
  lines: StatementOrderLine[]
  totalBilled: number
  totalPaid: number
  balance: number
  creditLimit: number
}

// ─── Métadonnées des événements (pour l'UI + référence des variables) ─────────

export interface EmailEventMeta {
  event: string
  label: string
  description: string
  vars: string[] // variables disponibles dans le modèle
}

export const EMAIL_EVENTS: EmailEventMeta[] = [
  {
    event: 'purchase_invoice',
    label: "Confirmation d'achat",
    description: "Envoyé au client dès qu'une commande est passée (par carte ou portée au compte).",
    vars: ['companyName', 'customerName', 'invoiceNo', 'orderId', 'date', 'subtotal', 'gst', 'qst', 'total', 'paymentMethodLabel', 'lines_table'],
  },
  {
    event: 'final_invoice',
    label: 'Facture finale (au compte)',
    description: "Envoyé quand le personnel facture une commande portée au compte.",
    vars: ['companyName', 'customerName', 'invoiceNo', 'orderId', 'date', 'subtotal', 'gst', 'qst', 'total', 'lines_table'],
  },
  {
    event: 'payment_confirmation',
    label: 'Confirmation de paiement',
    description: "Envoyé au client quand un paiement est enregistré (complet ou partiel).",
    vars: ['companyName', 'customerName', 'invoiceNo', 'amountPaid', 'total', 'paidAmount', 'remaining', 'statusLabel'],
  },
  {
    event: 'monthly_statement',
    label: 'État de compte mensuel',
    description: "Envoyé automatiquement le 1er de chaque mois.",
    vars: ['companyName', 'customerName', 'period', 'statement_table', 'totalBilled', 'totalPaid', 'balance', 'creditLimit'],
  },
]

// Variables dont la valeur est du HTML de confiance (non échappée)
const RAW_VARS = new Set(['lines_table', 'statement_table', 'content'])

// Modèle spécial de mise en page (entête + pied), partagé par tous les courriels
export const EMAIL_LAYOUT_KEY = 'email_layout'
export const EMAIL_LAYOUT_VARS = { inline: ['storeName', 'year'], block: ['content'] }

const CURRENCY = (n: number) => `${n.toFixed(2)} $`

// ─── Modèles par défaut (corps = contenu interne, encadré par le layout DSF) ──

interface DefaultTemplate { event: string; systemKey: string; name: string; subject: string; body: string }

const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    event: 'purchase_invoice',
    systemKey: 'default_purchase_invoice',
    name: "Confirmation d'achat (par défaut)",
    subject: "Confirmation d'achat {{invoiceNo}} — DSF Distribution",
    body: `<h2 style="margin:0 0 4px;color:#1f2232;text-transform:uppercase;letter-spacing:.05em;">Confirmation d'achat</h2>
<p style="margin:0 0 20px;color:#6b7280;font-size:13px;">N° {{invoiceNo}} — {{date}}</p>
<p style="font-size:14px;color:#374151;">{{companyName}},<br/>merci pour votre commande. En voici le détail :</p>
{{lines_table}}
<p style="font-size:13px;color:#6b7280;">{{paymentMethodLabel}}</p>
<p style="font-size:12px;color:#9ca3af;">Référence commande : {{orderId}}</p>`,
  },
  {
    event: 'final_invoice',
    systemKey: 'default_final_invoice',
    name: 'Facture finale (par défaut)',
    subject: 'Facture {{invoiceNo}} — DSF Distribution',
    body: `<h2 style="margin:0 0 4px;color:#1f2232;text-transform:uppercase;letter-spacing:.05em;">Facture</h2>
<p style="margin:0 0 12px;color:#6b7280;font-size:13px;">N° {{invoiceNo}} — {{date}}</p>
<p style="background:#fef3c7;border:1px solid #fcd34d;color:#92400e;padding:10px 14px;font-size:13px;">Cette facture a été portée à votre compte client. Merci de la régler selon les modalités convenues.</p>
<p style="font-size:14px;color:#374151;">{{companyName}},<br/>voici votre facture finale.</p>
{{lines_table}}
<p style="font-size:12px;color:#9ca3af;">Référence commande : {{orderId}}</p>`,
  },
  {
    event: 'payment_confirmation',
    systemKey: 'default_payment_confirmation',
    name: 'Confirmation de paiement (par défaut)',
    subject: 'Confirmation de paiement — {{invoiceNo}} — DSF Distribution',
    body: `<h2 style="margin:0 0 16px;color:#1f2232;text-transform:uppercase;letter-spacing:.05em;">Confirmation de paiement</h2>
<p style="font-size:14px;color:#374151;">{{companyName}},<br/>nous confirmons la réception de votre paiement.</p>
<table style="width:100%;font-size:13px;margin:16px 0;border-collapse:collapse;">
  <tr><td style="padding:6px 12px;color:#6b7280;">Facture</td><td style="text-align:right;font-weight:600;">{{invoiceNo}}</td></tr>
  <tr><td style="padding:6px 12px;color:#6b7280;">Montant reçu</td><td style="text-align:right;font-weight:700;color:#16a34a;">{{amountPaid}}</td></tr>
  <tr><td style="padding:6px 12px;color:#6b7280;">Total de la facture</td><td style="text-align:right;">{{total}}</td></tr>
  <tr><td style="padding:6px 12px;color:#6b7280;">Déjà payé</td><td style="text-align:right;">{{paidAmount}}</td></tr>
  <tr><td style="padding:8px 12px;font-weight:700;color:#1f2232;border-top:2px solid #1f2232;">Solde restant</td><td style="text-align:right;font-weight:900;color:#e51937;border-top:2px solid #1f2232;">{{remaining}}</td></tr>
</table>
<p style="font-size:13px;color:#6b7280;">Statut : {{statusLabel}}</p>`,
  },
  {
    event: 'monthly_statement',
    systemKey: 'default_monthly_statement',
    name: 'État de compte (par défaut)',
    subject: 'État de compte {{period}} — DSF Distribution',
    body: `<h2 style="margin:0 0 4px;color:#1f2232;text-transform:uppercase;letter-spacing:.05em;">État de compte</h2>
<p style="margin:0 0 20px;color:#6b7280;font-size:13px;">Période : {{period}}</p>
<p style="font-size:14px;color:#374151;">{{companyName}},<br/>voici le sommaire de votre compte client.</p>
{{statement_table}}
<table style="width:100%;font-size:13px;margin:8px 0;">
  <tr><td style="padding:4px 12px;color:#6b7280;">Facturé au compte (période)</td><td style="text-align:right;font-weight:600;">{{totalBilled}}</td></tr>
  <tr><td style="padding:4px 12px;color:#6b7280;">Paiements reçus (période)</td><td style="text-align:right;font-weight:600;">{{totalPaid}}</td></tr>
  <tr><td style="padding:8px 12px;font-weight:700;color:#1f2232;border-top:2px solid #1f2232;">Solde à payer</td><td style="text-align:right;font-weight:900;color:#e51937;border-top:2px solid #1f2232;">{{balance}}</td></tr>
  <tr><td style="padding:4px 12px;color:#9ca3af;font-size:12px;">Limite de crédit</td><td style="text-align:right;color:#9ca3af;font-size:12px;">{{creditLimit}}</td></tr>
</table>`,
  },
]

// Mise en page par défaut (entête + pied) — {{content}} = corps du courriel.
// Éditable depuis /dashboard/emails. Encadré ensuite par htmlShell() (non éditable).
const DEFAULT_LAYOUT_BODY = `<div style="max-width:640px;margin:0 auto;padding:24px 16px;">
  <div style="height:4px;background:{{brand_primary}};"></div>
  <div style="background:{{brand_dark}};padding:18px 24px;">
    <span style="color:#ffffff;font-size:20px;font-weight:900;letter-spacing:.08em;">{{nameShort}}</span>
    <span style="color:#9ca3af;font-size:12px;margin-left:8px;letter-spacing:.06em;">{{tagline}}</span>
  </div>
  <div style="background:#ffffff;padding:28px 24px;border:1px solid #e5e7eb;border-top:none;">
    {{content}}
  </div>
  <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:16px;">
    © {{year}} {{nameLegal}} — Ce courriel a été généré automatiquement, merci de ne pas y répondre.
  </p>
</div>`

// ──────────────────────────────────────────────────────────────────────────────

export class EmailService {
  // ─── Transport SMTP ─────────────────────────────────────────────────────────

  /** Envoie un courriel par SMTP. Retourne true si envoyé, false si non configuré. */
  static async send(to: string, subject: string, html: string): Promise<boolean> {
    const cfg = await SettingsService.getMany([
      'smtp_host', 'smtp_port', 'smtp_user', 'smtp_password', 'email_from',
    ])
    const host = cfg.smtp_host
    const user = cfg.smtp_user
    const pass = cfg.smtp_password
    const port = Number(cfg.smtp_port) || 587
    const from = cfg.email_from || user

    if (!host || !user || !pass) {
      console.warn(`[email] SMTP non configuré — courriel "${subject}" pour ${to} non envoyé`)
      return false
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // 465 = SSL implicite ; 587/autres = STARTTLS
      auth: { user, pass },
      connectionTimeout: 15_000,
      greetingTimeout: 10_000,
    })

    await transporter.sendMail({ from, to, subject, html })
    return true
  }

  // ─── Modèles : seed des défauts ──────────────────────────────────────────────

  /** Crée les modèles et déclencheurs par défaut s'ils n'existent pas (idempotent). */
  static async seedDefaults(): Promise<void> {
    for (const d of DEFAULT_TEMPLATES) {
      const tpl = await prisma.emailTemplate.upsert({
        where:  { systemKey: d.systemKey },
        update: {}, // ne JAMAIS écraser les modifications de l'utilisateur
        create: { systemKey: d.systemKey, name: d.name, subject: d.subject, bodyHtml: d.body },
      })
      await prisma.emailTrigger.upsert({
        where:  { event: d.event },
        update: {}, // ne pas écraser le choix de modèle / enabled de l'utilisateur
        create: { event: d.event, templateId: tpl.id, enabled: true },
      })
    }

    // Modèle de mise en page (entête + pied) — pas de déclencheur, utilisé partout
    await prisma.emailTemplate.upsert({
      where:  { systemKey: EMAIL_LAYOUT_KEY },
      update: {},
      create: { systemKey: EMAIL_LAYOUT_KEY, name: 'Entête et pied de page', subject: 'Mise en page', bodyHtml: DEFAULT_LAYOUT_BODY },
    })

    // ── Mise à niveau unique : faire suivre la palette de marque aux modèles système ──
    const systemTemplates = await prisma.emailTemplate.findMany({ where: { systemKey: { not: null } } })
    for (const t of systemTemplates) {
      if (t.systemKey === EMAIL_LAYOUT_KEY) {
        // Ancienne mise en page (hex/noms littéraux) → version à jetons de marque
        if (!t.bodyHtml.includes('{{nameShort}}')) {
          await prisma.emailTemplate.update({ where: { id: t.id }, data: { bodyHtml: DEFAULT_LAYOUT_BODY } })
        }
      } else if (!t.bodyHtml.includes('{{brand_') && (t.bodyHtml.includes('#1f2232') || t.bodyHtml.includes('#e51937'))) {
        // Remplace les couleurs de marque littérales par des jetons (une seule fois)
        const upgraded = t.bodyHtml.split('#1f2232').join('{{brand_dark}}').split('#e51937').join('{{brand_primary}}')
        await prisma.emailTemplate.update({ where: { id: t.id }, data: { bodyHtml: upgraded } })
      }
    }
  }

  // ─── Mise en page (entête + pied) ─────────────────────────────────────────────

  /** Encadre le corps d'un courriel avec le modèle de mise en page éditable. */
  static async wrapInLayout(innerHtml: string): Promise<string> {
    let layout = await prisma.emailTemplate.findUnique({ where: { systemKey: EMAIL_LAYOUT_KEY } })
    if (!layout) {
      await this.seedDefaults()
      layout = await prisma.emailTemplate.findUnique({ where: { systemKey: EMAIL_LAYOUT_KEY } })
    }
    const brand = await BrandService.get()
    const storeName = (await SettingsService.get('store_name')) || brand.nameLegal
    const year = String(new Date().getFullYear())
    const filled = renderTemplate(layout?.bodyHtml ?? DEFAULT_LAYOUT_BODY, {
      content: innerHtml, year, storeName, ...brandTokens(brand),
    })
    return htmlShell(filled)
  }

  // ─── Dispatch piloté par les déclencheurs ────────────────────────────────────

  /**
   * Envoie le courriel associé à un événement, selon la config du déclencheur.
   * Respecte enabled + le modèle choisi. No-op silencieux si désactivé.
   */
  static async dispatch(
    event: string,
    to: string,
    vars: Record<string, string>
  ): Promise<boolean> {
    let trigger = await prisma.emailTrigger.findUnique({ where: { event }, include: { template: true } })
    if (!trigger) {
      await this.seedDefaults()
      trigger = await prisma.emailTrigger.findUnique({ where: { event }, include: { template: true } })
    }

    if (!trigger || !trigger.enabled) {
      console.log(`[email] Événement "${event}" désactivé — aucun courriel envoyé`)
      return false
    }
    if (!trigger.template) {
      console.warn(`[email] Événement "${event}" sans modèle assigné — aucun courriel envoyé`)
      return false
    }

    const subject = renderTemplate(trigger.template.subject, vars)
    const inner   = renderTemplate(trigger.template.bodyHtml, vars)
    return this.send(to, subject, await this.wrapInLayout(inner))
  }

  // ─── Builders de variables → dispatch ────────────────────────────────────────

  static async dispatchInvoice(event: 'purchase_invoice' | 'final_invoice', to: string, data: InvoiceData): Promise<boolean> {
    const [brand, rates] = await Promise.all([BrandService.get(), TaxService.getRates()])
    return this.dispatch(event, to, { ...this.invoiceVars(data, brand, rates), ...brandTokens(brand) })
  }

  static async dispatchPayment(to: string, data: PaymentData): Promise<boolean> {
    const brand = await BrandService.get()
    return this.dispatch('payment_confirmation', to, { ...this.paymentVars(data), ...brandTokens(brand) })
  }

  static async dispatchStatement(to: string, data: StatementData): Promise<boolean> {
    const brand = await BrandService.get()
    return this.dispatch('monthly_statement', to, { ...this.statementVars(data, brand), ...brandTokens(brand) })
  }

  // ─── Construction des variables ──────────────────────────────────────────────

  static invoiceVars(data: InvoiceData, brand: Brand = BrandService.DEFAULTS, rates: TaxRates = TaxService.DEFAULTS): Record<string, string> {
    const paymentMethodLabel =
      data.paymentMethod === 'CARD'
        ? 'Payée par carte de crédit'
        : data.isFinal
          ? 'Portée au compte — paiement selon vos modalités'
          : 'Portée au compte — une facture finale suivra'
    const tax = TaxService.breakdownFromTotal(data.total, rates)
    return {
      customerName:       data.customerName,
      companyName:        data.companyName || data.customerName,
      invoiceNo:          data.invoiceNo,
      orderId:            data.orderId,
      date:               data.date.toLocaleDateString('fr-CA'),
      total:              CURRENCY(data.total),
      subtotal:           CURRENCY(tax.subtotal),
      gst:                CURRENCY(tax.gst),
      qst:                CURRENCY(tax.qst),
      lines_table:        linesTableHtml(data.lines, brand, tax),
      paymentMethodLabel,
    }
  }

  static paymentVars(data: PaymentData): Record<string, string> {
    return {
      customerName: data.customerName,
      companyName:  data.companyName || data.customerName,
      invoiceNo:    data.invoiceNo,
      amountPaid:   CURRENCY(data.amountPaid),
      total:        CURRENCY(data.total),
      paidAmount:   CURRENCY(data.paidAmount),
      remaining:    CURRENCY(data.remaining),
      statusLabel:  data.paymentStatus === 'PAID' ? 'Payée en totalité' : 'Paiement partiel',
    }
  }

  static statementVars(data: StatementData, brand: Brand = BrandService.DEFAULTS): Record<string, string> {
    return {
      companyName:     data.companyName,
      customerName:    data.customerName,
      period:          data.period,
      statement_table: statementTableHtml(data.lines, brand),
      totalBilled:     CURRENCY(data.totalBilled),
      totalPaid:       CURRENCY(data.totalPaid),
      balance:         CURRENCY(data.balance),
      creditLimit:     CURRENCY(data.creditLimit),
    }
  }

  // ─── Rendu (pour aperçu / test serveur) ──────────────────────────────────────

  /** Aperçu d'un modèle d'événement (corps encadré par la mise en page enregistrée). */
  static async renderEmailPreview(subject: string, bodyHtml: string, event: string): Promise<{ subject: string; html: string }> {
    const [brand, rates] = await Promise.all([BrandService.get(), TaxService.getRates()])
    const vars = { ...sampleVars(event, brand, rates), ...brandTokens(brand) }
    const inner = renderTemplate(bodyHtml, vars)
    return { subject: renderTemplate(subject, vars), html: await this.wrapInLayout(inner) }
  }

  /** Aperçu du modèle de mise en page lui-même, avec un corps de courriel d'exemple. */
  static async renderLayoutPreview(layoutBody: string): Promise<{ subject: string; html: string }> {
    const [brand, rates] = await Promise.all([BrandService.get(), TaxService.getRates()])
    const tokens = brandTokens(brand)
    const sampleInner = renderTemplate(DEFAULT_TEMPLATES[0].body, { ...sampleVars('purchase_invoice', brand, rates), ...tokens })
    const filled = renderTemplate(layoutBody, {
      content: sampleInner,
      year: String(new Date().getFullYear()),
      storeName: brand.nameLegal,
      ...tokens,
    })
    return { subject: 'Aperçu — Entête et pied de page', html: htmlShell(filled) }
  }
}

/** Jetons de marque disponibles dans tous les modèles de courriels. */
function brandTokens(brand: Brand): Record<string, string> {
  return {
    brand_primary:      brand.colorPrimary,
    brand_primary_dark: brand.colorPrimaryDark,
    brand_dark:         brand.colorDark,
    brand_text:         brand.colorText,
    brand_muted:        brand.colorMuted,
    brand_bg:           brand.colorBg,
    nameShort:          brand.nameShort,
    nameLegal:          brand.nameLegal,
    tagline:            brand.tagline,
    logoUrl:            brand.logoUrl,
  }
}

// ─── Helpers de rendu ─────────────────────────────────────────────────────────

function renderTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
    const v = vars[key]
    if (v == null) return ''
    return RAW_VARS.has(key) ? v : escapeHtml(v)
  })
}

function linesTableHtml(lines: InvoiceLine[], brand: Brand, tax?: TaxBreakdown): string {
  const rows = lines.map((l) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(l.name)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${l.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${CURRENCY(l.unitPrice)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">${CURRENCY(l.unitPrice * l.quantity)}</td>
    </tr>`).join('')
  const total = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0)

  // Pied : ventilation des taxes si fournie, sinon total seul
  const footer = tax
    ? `<tr><td colspan="3" style="padding:6px 12px;text-align:right;color:#6b7280;">Sous-total</td>
         <td style="padding:6px 12px;text-align:right;">${CURRENCY(tax.subtotal)}</td></tr>
       <tr><td colspan="3" style="padding:6px 12px;text-align:right;color:#6b7280;">TPS</td>
         <td style="padding:6px 12px;text-align:right;">${CURRENCY(tax.gst)}</td></tr>
       <tr><td colspan="3" style="padding:6px 12px;text-align:right;color:#6b7280;">TVQ</td>
         <td style="padding:6px 12px;text-align:right;">${CURRENCY(tax.qst)}</td></tr>
       <tr><td colspan="3" style="padding:12px;text-align:right;font-weight:700;color:${brand.colorDark};border-top:2px solid ${brand.colorDark};">TOTAL</td>
         <td style="padding:12px;text-align:right;font-weight:900;color:${brand.colorPrimary};font-size:16px;border-top:2px solid ${brand.colorDark};">${CURRENCY(tax.total)}</td></tr>`
    : `<tr><td colspan="3" style="padding:12px;text-align:right;font-weight:700;color:${brand.colorDark};">TOTAL</td>
         <td style="padding:12px;text-align:right;font-weight:900;color:${brand.colorPrimary};font-size:16px;">${CURRENCY(total)}</td></tr>`

  return `<table style="width:100%;border-collapse:collapse;font-size:13px;margin:16px 0;">
    <thead><tr style="background:${brand.colorDark};color:#fff;">
      <th style="padding:10px 12px;text-align:left;">Produit</th>
      <th style="padding:10px 12px;text-align:center;">Qté</th>
      <th style="padding:10px 12px;text-align:right;">Prix unitaire</th>
      <th style="padding:10px 12px;text-align:right;">Total</th>
    </tr></thead>
    <tbody>${rows}</tbody>
    <tfoot>${footer}</tfoot>
  </table>`
}

function statementTableHtml(lines: StatementOrderLine[], brand: Brand): string {
  const rows = lines.map((l) => {
    const color = l.status === 'PAID' ? '#16a34a' : l.status === 'PARTIAL' ? '#d97706' : '#dc2626'
    const label = l.status === 'PAID' ? 'Payée' : l.status === 'PARTIAL' ? 'Partielle' : 'Impayée'
    return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(l.invoiceNo ?? l.orderId.slice(-8).toUpperCase())}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${l.date.toLocaleDateString('fr-CA')}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${CURRENCY(l.total)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${CURRENCY(l.paid)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${CURRENCY(l.total - l.paid)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;color:${color};font-weight:600;">${label}</td>
    </tr>`
  }).join('')
  return `<table style="width:100%;border-collapse:collapse;font-size:13px;margin:16px 0;">
    <thead><tr style="background:${brand.colorDark};color:#fff;">
      <th style="padding:10px 12px;text-align:left;">Facture</th>
      <th style="padding:10px 12px;text-align:left;">Date</th>
      <th style="padding:10px 12px;text-align:right;">Montant</th>
      <th style="padding:10px 12px;text-align:right;">Payé</th>
      <th style="padding:10px 12px;text-align:right;">Solde</th>
      <th style="padding:10px 12px;text-align:center;">Statut</th>
    </tr></thead>
    <tbody>${rows || '<tr><td colspan="6" style="padding:16px;text-align:center;color:#9ca3af;">Aucune activité ce mois-ci</td></tr>'}</tbody>
  </table>`
}

/** Données d'exemple pour l'aperçu / le test d'un modèle. */
function sampleVars(event: string, brand: Brand = BrandService.DEFAULTS, rates: TaxRates = TaxService.DEFAULTS): Record<string, string> {
  switch (event) {
    case 'payment_confirmation':
      return EmailService.paymentVars({
        invoiceNo: 'FAC-202606-A1B2C3', customerName: 'Jean Tremblay', companyName: 'Construction Tremblay inc.',
        amountPaid: 100, total: 163.40, paidAmount: 100, remaining: 63.40, paymentStatus: 'PARTIAL',
      })
    case 'monthly_statement':
      return EmailService.statementVars({
        companyName: 'Construction Tremblay inc.', customerName: 'Jean Tremblay', period: '2026-05',
        lines: [
          { invoiceNo: 'FAC-202605-A1B2C3', orderId: 'cmexemple1', date: new Date(2026, 4, 12), total: 250, paid: 100, status: 'PARTIAL' },
          { invoiceNo: 'FAC-202605-D4E5F6', orderId: 'cmexemple2', date: new Date(2026, 4, 24), total: 89.95, paid: 0, status: 'UNPAID' },
        ],
        totalBilled: 339.95, totalPaid: 100, balance: 239.95, creditLimit: 1000,
      }, brand)
    case 'final_invoice':
      return EmailService.invoiceVars(sampleInvoice(true), brand, rates)
    case 'purchase_invoice':
    default:
      return EmailService.invoiceVars(sampleInvoice(false), brand, rates)
  }
}

function sampleInvoice(isFinal: boolean): InvoiceData {
  return {
    invoiceNo: 'FAC-202606-A1B2C3', orderId: 'cmexempleorder123', date: new Date(2026, 5, 15),
    customerName: 'Jean Tremblay', companyName: 'Construction Tremblay inc.',
    lines: [
      { name: 'Panneau de gypse 1/2"', quantity: 10, unitPrice: 12.95 },
      { name: 'Vis à gypse 1-1/4" (boîte 1000)', quantity: 2, unitPrice: 16.95 },
    ],
    total: 163.40, paymentMethod: 'ON_ACCOUNT', isFinal,
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Enveloppe HTML minimale et non éditable (doctype + body). Le visible vit dans le layout. */
function htmlShell(inner: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
${inner}
</body>
</html>`
}
