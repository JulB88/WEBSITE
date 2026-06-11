import Stripe from 'stripe'
import { SettingsService } from '@/lib/services'

/**
 * Returns a Stripe client.
 * Reads the secret key from the DB first (via SettingsService — auto-decrypts),
 * then falls back to the STRIPE_SECRET_KEY env var.
 */
export async function getStripe(): Promise<Stripe> {
  const secretKey = await SettingsService.get('stripe_secret_key')

  if (secretKey && !secretKey.startsWith('sk_test_REPLACE')) {
    return new Stripe(secretKey, { apiVersion: '2024-06-20', typescript: true })
  }

  throw new Error('Stripe is not configured. Go to Settings to add your secret key.')
}

/**
 * Webhook secret — DB first (auto-decrypted), then env var.
 */
export async function getWebhookSecret(): Promise<string> {
  return SettingsService.get('stripe_webhook_secret')
}
