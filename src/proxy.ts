/**
 * Next.js 16 Edge Proxy — point d'entrée global unique pour :
 *  1. Site-lock enforcement  (vérification cookie)
 *  2. Dashboard / Admin auth (vérification JWT via next-auth)
 *  3. Rate limiting sur les endpoints sensibles (auth, register, site-lock)
 *
 * Next.js 16 a renommé la convention "middleware.ts" → "proxy.ts".
 * L'export doit être nommé `proxy` (et non plus `middleware`).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { rateLimit, getClientIp, rateLimitKey } from '@/lib/rate-limit'
import { canAccessDashboard } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'

const LOCK_COOKIE = '__site_lock'

// ─── Paths qui contournent le site-lock ──────────────────────────────────────
const SITE_LOCK_BYPASS = [
  '/site-lock',
  '/api/site-lock',
  '/api/auth',
  '/_next',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap',
]

// ─── Politiques de rate limiting (par IP) ────────────────────────────────────
const RATE_POLICIES: Array<{
  method: string
  path: string
  slug: string
  limit: number
  windowMs: number
}> = [
  // Site-lock : 10 tentatives / 10 minutes
  { method: 'POST', path: '/api/site-lock', slug: 'site-lock', limit: 10, windowMs: 10 * 60_000 },
  // Login : 20 tentatives / 15 minutes
  { method: 'POST', path: '/api/auth/callback/credentials', slug: 'login', limit: 20, windowMs: 15 * 60_000 },
  // Inscription : 5 / heure
  { method: 'POST', path: '/api/register', slug: 'register', limit: 5, windowMs: 60 * 60_000 },
]

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const method = req.method

  // ── 0. Skip les assets statiques Next.js ──────────────────────────────────
  if (
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/image') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // ── 1. Rate limiting (avant tout) ─────────────────────────────────────────
  for (const policy of RATE_POLICIES) {
    if (method !== policy.method) continue
    if (!pathname.startsWith(policy.path)) continue

    const ip     = getClientIp(req)
    const key    = rateLimitKey(ip, policy.slug)
    const result = rateLimit(key, policy.limit, policy.windowMs)

    if (!result.allowed) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Réessayez plus tard.' },
        {
          status: 429,
          headers: {
            'Retry-After':        String(result.retryAfterSec),
            'X-RateLimit-Limit':  String(policy.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset':  String(Math.ceil(result.resetAt / 1000)),
          },
        }
      )
    }
    break // une seule politique peut correspondre par requête
  }

  // ── 2. Site-lock ──────────────────────────────────────────────────────────
  const siteToken = process.env.SITE_TOKEN
  if (siteToken) {
    const isBypassed = SITE_LOCK_BYPASS.some((p) => pathname.startsWith(p))
    if (!isBypassed) {
      const cookieValue = req.cookies.get(LOCK_COOKIE)?.value
      if (cookieValue !== siteToken) {
        // L'admin peut désactiver le verrou depuis le dashboard (setting site_lock_enabled).
        // Le check est fait via l'API (cachée 10 s) — Prisma n'est pas dispo en Edge runtime.
        let lockEnabled = true
        try {
          const checkRes = await fetch(new URL('/api/site-lock/check', req.url), {
            signal: AbortSignal.timeout(3_000),
          })
          if (checkRes.ok) {
            const data = (await checkRes.json()) as { enabled: boolean }
            lockEnabled = data.enabled
          }
        } catch {
          // BD/API indisponible → verrouillé par défaut (fail-safe)
        }

        if (lockEnabled) {
          const lockUrl = req.nextUrl.clone()
          lockUrl.pathname = '/site-lock'
          lockUrl.searchParams.set('from', pathname)
          return NextResponse.redirect(lockUrl)
        }
      }
    }
  }

  // ── 3. Auth sur les routes protégées ──────────────────────────────────────
  const isApiRoute      = pathname.startsWith('/api/')
  const isAdminPath     = pathname.startsWith('/admin')     || pathname.startsWith('/api/admin')
  const isDashboardPath = pathname.startsWith('/dashboard') || pathname.startsWith('/api/dashboard')
  const isProtectedPage = pathname.startsWith('/account')   || pathname.startsWith('/checkout')

  if (!isAdminPath && !isDashboardPath && !isProtectedPage) {
    return NextResponse.next()
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  // Pas de session — redirect pages, 401 pour les APIs
  if (!token) {
    if (isApiRoute) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const loginUrl = new URL('/auth/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const role = token.role as Role | undefined

  // Dashboard — rôle staff requis
  if (isDashboardPath) {
    if (!role || !canAccessDashboard(role)) {
      if (isApiRoute) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      return NextResponse.redirect(new URL('/?error=unauthorized', req.url))
    }
    return NextResponse.next()
  }

  // Admin — ADMIN / SUPER_ADMIN uniquement
  if (isAdminPath) {
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      if (isApiRoute) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      return NextResponse.redirect(new URL('/?error=unauthorized', req.url))
    }
    return NextResponse.next()
  }

  // Pages store protégées (/account, /checkout) — session quelconque suffisante
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
