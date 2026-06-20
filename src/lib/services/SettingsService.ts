import { prisma } from '@/lib/prisma'
import { encryptSecret, decryptSecret } from '@/lib/crypto'

/**
 * SettingsService — centralise toutes les opérations de configuration.
 *
 * Fonctionnalités :
 *  - Stockage BD avec fallback variable d'environnement
 *  - Chiffrement AES-256-GCM automatique des clés secrètes (SECRET_KEYS)
 *  - Masquage pour affichage côté client
 *  - Une seule requête BD pour lire plusieurs paramètres (getMany)
 */
export class SettingsService {
  // ─── Clés autorisées en BD ─────────────────────────────────────────────────
  static readonly ALLOWED_KEYS = new Set([
    'store_name', 'store_currency', 'store_email',
    'stripe_publishable_key', 'stripe_secret_key', 'stripe_webhook_secret',
    'bc_tenant_id', 'bc_client_id', 'bc_client_secret', 'bc_environment', 'bc_company_id',
    'site_lock_enabled', 'site_password', 'site_totp_secret',
    'smtp_host', 'smtp_port', 'smtp_user', 'smtp_password', 'email_from', 'smtp_verified',
    'brand_name_short', 'brand_name_legal', 'brand_tagline', 'brand_logo_url',
    'brand_color_primary', 'brand_color_primary_dark', 'brand_color_dark',
    'brand_color_text', 'brand_color_muted', 'brand_color_bg',
    'tax_gst_rate', 'tax_qst_rate', 'tax_gst_number', 'tax_qst_number', 'tax_included',
  ])

  // ─── Clés chiffrées en BD + masquées en lecture ────────────────────────────
  static readonly SECRET_KEYS = new Set([
    'stripe_secret_key',
    'stripe_webhook_secret',
    'bc_client_secret',
    'site_totp_secret',
    'site_password',
    'smtp_password',
  ])

  // ─── Fallback variable d'environnement par clé BD ─────────────────────────
  private static readonly ENV_MAP: Record<string, string> = {
    bc_tenant_id:          'BC_TENANT_ID',
    bc_client_id:          'BC_CLIENT_ID',
    bc_client_secret:      'BC_CLIENT_SECRET',
    bc_environment:        'BC_ENVIRONMENT',
    bc_company_id:         'BC_COMPANY_ID',
    stripe_secret_key:     'STRIPE_SECRET_KEY',
    stripe_webhook_secret: 'STRIPE_WEBHOOK_SECRET',
    site_password:         'SITE_PASSWORD',
    smtp_host:             'SMTP_HOST',
    smtp_port:             'SMTP_PORT',
    smtp_user:             'SMTP_USER',
    smtp_password:         'SMTP_PASSWORD',
    email_from:            'EMAIL_FROM',
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Lecture
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Lit un paramètre — BD en priorité, sinon variable d'env.
   * Déchiffre automatiquement les clés secrètes.
   */
  static async get(key: string): Promise<string> {
    try {
      const row = await prisma.setting.findUnique({ where: { key } })
      if (row?.value) {
        return this.SECRET_KEYS.has(key)
          ? await decryptSecret(row.value)
          : row.value
      }
    } catch {
      // DB unavailable — fall through to env
    }
    return process.env[this.ENV_MAP[key] ?? ''] ?? ''
  }

  /**
   * Lit plusieurs paramètres en une seule requête BD.
   * Déchiffre automatiquement les clés secrètes.
   */
  static async getMany(keys: string[]): Promise<Record<string, string>> {
    const rows = await prisma.setting.findMany({ where: { key: { in: keys } } })
    const dbMap = Object.fromEntries(rows.map((r) => [r.key, r.value]))

    const result: Record<string, string> = {}
    await Promise.all(
      keys.map(async (key) => {
        const rawValue = dbMap[key]
        if (rawValue) {
          result[key] = this.SECRET_KEYS.has(key)
            ? await decryptSecret(rawValue)
            : rawValue
        } else {
          result[key] = process.env[this.ENV_MAP[key] ?? ''] ?? ''
        }
      })
    )
    return result
  }

  /**
   * Retourne tous les paramètres autorisés.
   * Les secrets sont masqués si `maskSecrets = true`.
   * site_totp_secret est toujours exclu (ne doit jamais être transmis au client).
   */
  static async getAll(maskSecrets = false): Promise<Record<string, string>> {
    const keys = [...this.ALLOWED_KEYS].filter((k) => k !== 'site_totp_secret')
    const raw = await this.getMany(keys)
    if (!maskSecrets) return raw
    return Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [
        k,
        this.SECRET_KEYS.has(k) && v ? this.maskSecret(v) : v,
      ])
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Écriture
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Écrit un paramètre en BD.
   * Chiffre automatiquement les clés secrètes avant stockage.
   */
  static async set(key: string, value: string): Promise<void> {
    if (!this.ALLOWED_KEYS.has(key)) return

    const toStore = this.SECRET_KEYS.has(key) && value
      ? await encryptSecret(value)
      : value

    await prisma.setting.upsert({
      where:  { key },
      update: { value: toStore },
      create: { key, value: toStore },
    })
  }

  /**
   * Écrit plusieurs paramètres en parallèle.
   */
  static async setMany(settings: Record<string, string>): Promise<void> {
    const valid = Object.entries(settings).filter(([k]) => this.ALLOWED_KEYS.has(k))
    await Promise.all(valid.map(([k, v]) => this.set(k, v)))
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Utilitaires
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Masque une valeur secrète pour l'affichage.
   * Ex: `sk_live_XXXX1234` → `sk_l••••••••1234`
   */
  static maskSecret(value: string): string {
    if (value.length <= 8) return '••••••••'
    return value.slice(0, 4) + '••••••••' + value.slice(-4)
  }

  /**
   * Vérifie si une valeur semble correctement configurée
   * (non vide, non placeholder).
   */
  static isConfigured(value: string): boolean {
    if (!value) return false
    const placeholders = ['REPLACE_ME', 'YOUR_KEY', 'PLACEHOLDER']
    return !placeholders.some((p) => value.toUpperCase().includes(p))
  }
}
