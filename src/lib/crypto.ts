/**
 * Secret encryption using AES-256-GCM (Web Crypto API).
 *
 * Compatible with both Edge runtime and Node.js 18+.
 * Key is derived from NEXTAUTH_SECRET via PBKDF2 (100 000 iterations).
 * Encrypted format: `enc:v1:<base64(iv + ciphertext)>`
 *
 * Backward-compatible: values that don't start with the prefix are returned
 * as-is (legacy plain-text), allowing a seamless migration.
 */

export const ENCRYPTION_PREFIX = 'enc:v1:'
// Fixed salt — the secret key provides the entropy, not the salt.
const PBKDF2_SALT = 'dsf-distribution-settings-v1'
const PBKDF2_ITERATIONS = 100_000
const IV_BYTES = 12 // AES-GCM standard

// Cache the derived CryptoKey per serverless instance (PBKDF2 is expensive).
let _keyPromise: Promise<CryptoKey> | null = null

async function getDerivedKey(): Promise<CryptoKey> {
  if (_keyPromise) return _keyPromise
  _keyPromise = (async () => {
    const secret = process.env.NEXTAUTH_SECRET
    if (!secret) throw new Error('NEXTAUTH_SECRET is required for secret encryption')

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    )

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode(PBKDF2_SALT),
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    )
  })()
  return _keyPromise
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
}

function base64ToUint8Array(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

/**
 * Encrypt a secret string.
 * Returns a prefixed base64 string ready for DB storage.
 * Already-encrypted values are returned unchanged (idempotent).
 */
export async function encryptSecret(plaintext: string): Promise<string> {
  if (!plaintext) return plaintext
  if (plaintext.startsWith(ENCRYPTION_PREFIX)) return plaintext // already encrypted

  const key = await getDerivedKey()
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext)
  )

  // Combine iv + ciphertext into a single buffer
  const combined = new Uint8Array(IV_BYTES + ciphertextBuffer.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertextBuffer), IV_BYTES)

  return ENCRYPTION_PREFIX + arrayBufferToBase64(combined.buffer)
}

/**
 * Decrypt a secret string.
 * Returns the original plaintext.
 * Values without the prefix are returned unchanged (legacy plain-text fallback).
 */
export async function decryptSecret(value: string): Promise<string> {
  if (!value) return value
  if (!value.startsWith(ENCRYPTION_PREFIX)) return value // legacy — not encrypted yet

  const key = await getDerivedKey()
  const combined = base64ToUint8Array(value.slice(ENCRYPTION_PREFIX.length))
  const iv = combined.slice(0, IV_BYTES)
  const ciphertext = combined.slice(IV_BYTES)

  try {
    const plaintextBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    )
    return new TextDecoder().decode(plaintextBuffer)
  } catch {
    // Decryption failed — value may be corrupted or key changed.
    // Return empty to avoid leaking partial data.
    console.error('[crypto] decryptSecret: decryption failed — key mismatch or corrupted value')
    return ''
  }
}

/** Returns true if the value was encrypted by this module. */
export function isEncrypted(value: string): boolean {
  return value.startsWith(ENCRYPTION_PREFIX)
}
