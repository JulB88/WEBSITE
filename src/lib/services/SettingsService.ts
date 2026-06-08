import { prisma } from '@/lib/prisma'

/**
 * SettingsService — centralise toutes les opérations de configuration.
 * Les paramètres sont stockés en BD (table Setting) avec fallback env.
 */
export class SettingsService {
  // Clés autorisées à être persistées en BD
  static readonly ALLOWED_KEYS = new Set([
    'store_name', 'store_currency', 'store_email',
    'stripe_publishable_key', 'stripe_secret_key', 'stripe_webhook_secret',
    'bc_tenant_id', 'bc_client_id', 'bc_client_secret', 'bc_environment', 'bc_company_id',
    'site_lock_enabled', 'site_password', 'site_totp_secret',
  ])

  // Clés dont la valeur doit être masquée en lecture
  static readonly SECRET_KEYS = new Set([
    'stripe_secret_key', 'stripe_webhook_secret', 'bc_client_secret', 'site_totp_secret',
  ])

  // Map clé BD → variable d'environnement (fallback)
  private static readonly ENV_MAP: Record<string, string> = {
    bc_tenant_id:     'BC_TENANT_ID',
    bc_client_id:     'BC_CLIENT_ID',
    bc_client_secret: 'BC_CLIENT_SECRET',
    bc_environment:   'BC_ENVIRONMENT',
    bc_company_id:    'BC_COMPANY_ID',
    site_password:    'SITE_PASSWORD',
  }

  /** Lit un paramètre — BD en priorité, sinon variable d'env */
  static async get(key: string): Promise<string> {
    try {
      const row = await prisma.setting.findUnique({ where: { key } })
      if (row?.value) return row.value
    } catch {}
    return process.env[this.ENV_MAP[key] ?? ''] ?? ''
  }

  /** Lit plusieurs paramètres d'un coup */
  static async getMany(keys: string[]): Promise<Record<string, string>> {
    const rows = await prisma.setting.findMany({ where: { key: { in: keys } } })
    const dbMap = Object.fromEntries(rows.map(r => [r.key, r.value]))
    const result: Record<string, string> = {}
    for (const key of keys) {
      result[key] = dbMap[key] ?? process.env[this.ENV_MAP[key] ?? ''] ?? ''
    }
    return result
  }

  /** Retourne tous les paramètres autorisés (secrets masqués) */
  static async getAll(maskSecrets = false): Promise<Record<string, string>> {
    const keys = [...this.ALLOWED_KEYS].filter(k => k !== 'site_totp_secret')
    const raw = await this.getMany(keys)
    if (!maskSecrets) return raw
    return Object.fromEntries(
      Object.entries(raw).map(([k, v]) =>
        [k, this.SECRET_KEYS.has(k) && v ? this.maskSecret(v) : v]
      )
    )
  }

  /** Écrit un paramètre en BD */
  static async set(key: string, value: string): Promise<void> {
    if (!this.ALLOWED_KEYS.has(key)) return
    await prisma.setting.upsert({
      where:  { key },
      update: { value },
      create: { key, value },
    })
  }

  /** Écrit plusieurs paramètres en une fois */
  static async setMany(settings: Record<string, string>): Promise<void> {
    const valid = Object.entries(settings).filter(([k]) => this.ALLOWED_KEYS.has(k))
    await Promise.all(valid.map(([k, v]) => this.set(k, v)))
  }

  /** Masque une valeur secrète (ex: sk_live_XXXX → sk_l••••4xyz) */
  static maskSecret(value: string): string {
    if (value.length <= 8) return '••••••••'
    return value.slice(0, 4) + '••••••••' + value.slice(-4)
  }

  /** Teste si un secret semble configuré (non vide et non placeholder) */
  static isConfigured(value: string): boolean {
    if (!value) return false
    const placeholders = ['REPLACE_ME', 'YOUR_KEY', 'PLACEHOLDER']
    return !placeholders.some(p => value.toUpperCase().includes(p))
  }
}
