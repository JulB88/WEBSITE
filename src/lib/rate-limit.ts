/**
 * In-memory sliding-window rate limiter.
 * Edge-runtime compatible (no Node.js-specific APIs — uses Map + Date).
 *
 * Limitation: state is per serverless instance, not globally distributed.
 * For true global rate limiting add Upstash Redis.
 * Per-instance protection still defeats single-client brute-force attacks.
 */

interface WindowEntry {
  count: number
  resetAt: number // timestamp ms
}

const store = new Map<string, WindowEntry>()
let lastCleanup = Date.now()

/** Remove expired entries to prevent unbounded memory growth. */
function maybeCleanup() {
  const now = Date.now()
  if (now - lastCleanup < 5 * 60_000) return // every 5 min
  lastCleanup = now
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key)
  }
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number // ms timestamp
  retryAfterSec: number
}

/**
 * Check and increment the counter for `key`.
 *
 * @param key       Unique identifier (e.g. `ip:/api/site-lock`)
 * @param limit     Maximum requests allowed in the window
 * @param windowMs  Window duration in milliseconds
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  maybeCleanup()
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    const resetAt = now + windowMs
    store.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: limit - 1, resetAt, retryAfterSec: 0 }
  }

  entry.count++
  const allowed = entry.count <= limit
  const remaining = Math.max(0, limit - entry.count)
  const retryAfterSec = allowed ? 0 : Math.ceil((entry.resetAt - now) / 1000)

  return { allowed, remaining, resetAt: entry.resetAt, retryAfterSec }
}

/**
 * Extract the best available client IP from request headers.
 * Handles Vercel's `x-forwarded-for` correctly.
 */
export function getClientIp(req: Request): string {
  // Vercel sets x-forwarded-for to a comma-separated list; first entry = client IP
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}

/**
 * Build a rate-limit key combining IP + path slug.
 * Example: `192.168.1.1:site-lock`
 */
export function rateLimitKey(ip: string, slug: string): string {
  return `${ip}:${slug}`
}
