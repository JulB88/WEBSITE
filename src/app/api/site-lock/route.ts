import { NextRequest, NextResponse } from 'next/server'
import { SettingsService } from '@/lib/services'
import { verifySync } from 'otplib'
import { rateLimit, getClientIp, rateLimitKey } from '@/lib/rate-limit'

const LOCK_COOKIE    = '__site_lock'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

// Defense-in-depth rate limiting (middleware already limits, this adds per-instance protection)
const ROUTE_LIMIT    = 10
const ROUTE_WINDOW   = 10 * 60_000 // 10 minutes

export async function POST(req: NextRequest) {
  try {
    // ── Rate limit ──────────────────────────────────────────────────────────
    const ip = getClientIp(req)
    const rl = rateLimit(rateLimitKey(ip, 'site-lock-route'), ROUTE_LIMIT, ROUTE_WINDOW)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      )
    }

    // ── Validate input ──────────────────────────────────────────────────────
    const body = await req.json().catch(() => null)
    const { code } = body ?? {}
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Code requis' }, { status: 400 })
    }

    const siteToken = process.env.SITE_TOKEN
    if (!siteToken) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 })
    }

    const clean = code.replace(/\s/g, '')

    // ── 1. TOTP verification (preferred) ────────────────────────────────────
    const totpSecret = await SettingsService.get('site_totp_secret')
    if (totpSecret) {
      const isValid = verifySync({ token: clean, secret: totpSecret })
      if (!isValid) {
        return NextResponse.json({ error: 'Code incorrect.' }, { status: 401 })
      }
    } else {
      // ── 2. Plain password fallback (before TOTP is configured) ─────────────
      const sitePassword = await SettingsService.get('site_password')
      if (!sitePassword || clean !== sitePassword) {
        return NextResponse.json({ error: 'Code incorrect.' }, { status: 401 })
      }
    }

    // ── Success — set cookie ────────────────────────────────────────────────
    const res = NextResponse.json({ ok: true })
    res.cookies.set(LOCK_COOKIE, siteToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   COOKIE_MAX_AGE,
      path:     '/',
    })
    return res
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
}
