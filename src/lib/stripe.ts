import Stripe from 'stripe'
import { prisma } from './prisma'

let _stripe: Stripe | null = null

/**
 * Returns a Stripe client, reading the secret key from the DB first
 * (set via Admin → Settings) then falling back to the env var.
 * Lazy — never throws at module load time.
 */
export async function getStripe(): Promise<Stripe> {
  // Always re-check DB key so settings-page changes take effect without restart
  try {
    const row = await prisma.setting.findUnique({ where: { key: 'stripe_secret_key' } })
    if (row?.value) {
      return new Stripe(row.value, { apiVersion: '2024-06-20', typescript: true })
    }
  } catch {
    // DB unavailable — fall through to env var
  }

  const key = process.env.STRIPE_SECRET_KEY
  if (!key || key.startsWith('sk_test_REPLACE')) {
    throw new Error('Stripe is not configured. Go to Admin → Settings to add your secret key.')
  }

  if (!_stripe) {
    _stripe = new Stripe(key, { apiVersion: '2024-06-20', typescript: true })
  }
  return _stripe
}

/**
 * Webhook secret — DB first, then env var.
 */
export async function getWebhookSecret(): Promise<string> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: 'stripe_webhook_secret' } })
    if (row?.value) return row.value
  } catch {}
  return process.env.STRIPE_WEBHOOK_SECRET || ''
}
