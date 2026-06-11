/**
 * Next.js Edge Middleware — single global chokepoint for:
 *  1. Site-lock enforcement  (cookie check)
 *  2. Dashboard / Admin auth (JWT role check via next-auth)
 *  3. Rate limiting on auth-sensitive endpoints
 *
 * Supersedes the old src/proxy.ts (dead code — was never invoked by Next.js).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { rateLimit, getClientIp, rateLimitKey } from '@/lib/rate-limit'
import { canAccessDashboard } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'

const LOCK_COOKIE = '__site_lock'

// ─── Paths that bypass the site-lock gate ────────────────────────────────────
const SITE_LOCK_BYPASS = [
  '/site-lock',
  '/api/site-lock',
  '/api/auth',
  '/_next',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap',
]

// ─── Rate-limit policies (per IP) ────────────────────────────────────────────
const RATE_POLICIES: Array<{
  method: string
  path: string
  slug: string
  limit: number
  windowMs: number
}> = [
  // Site-lock: 10 attempts per 10 minutes
  { method: 'POST', path: '/api/site-lock', slug: 'site-lock', limit: 10, windowMs: 10 * 60_000 },
  // Login: 20 attempts per 15 minutes
  { method: 'POST', path: '/api/auth/callback/credentials', slug: 'login', limit: 20, windowMs: 15 * 60_000 },
  // Registration: 5 per hour
  { method: 'POST', path: '/api/register', slug: 'register', limit: 5, windowMs: 60 * 60_000 },
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const method = req.method

  // ── 0. Skip Next.js internals / static assets ──────────────────────────────
  if (
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/image') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // ── 1. Rate limiting (before anything else) ────────────────────────────────
  for (const policy of RATE_POLICIES) {
    if (method !== policy.method) continue
    if (!pathname.startsWith(policy.path)) continue

    const ip = getClientIp(req)
    const key = rateLimitKey(ip, policy.slug)
    const result = rateLimit(key, policy.limit, policy.windowMs)

    if (!result.allowed) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Réessayez plus tard.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(result.retryAfterSec),
            'X-RateLimit-Limit': String(policy.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
          },
        }
      )
    }

    // Attach rate-limit headers to allowed responses
    const res = NextResponse.next()
    res.headers.set('X-RateLimit-Limit', String(policy.limit))
    res.headers.set('X-RateLimit-Remaining', String(result.remaining))
    res.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)))
    // Don't return yet — let auth checks run too
    break
  }

  // ── 2. Site-lock gate ──────────────────────────────────────────────────────
  const siteToken = process.env.SITE_TOKEN
  if (siteToken) {
    const isBypassed = SITE_LOCK_BYPASS.some((p) => pathname.startsWith(p))
    if (!isBypassed) {
      const cookieValue = req.cookies.get(LOCK_COOKIE)?.value
      if (cookieValue !== siteToken) {
        const lockUrl = req.nextUrl.clone()
        lockUrl.pathname = '/site-lock'
        lockUrl.searchParams.set('from', pathname)
        return NextResponse.redirect(lockUrl)
      }
    }
  }

  // ── 3. Auth enforcement for protected paths ────────────────────────────────
  const isApiRoute = pathname.startsWith('/api/')
  const isAdminPath = pathname.startsWith('/admin') || pathname.startsWith('/api/admin')
  const isDashboardPath = pathname.startsWith('/dashboard') || pathname.startsWith('/api/dashboard')
  const isProtectedPage = pathname.startsWith('/account') || pathname.startsWith('/checkout')

  if (!isAdminPath && !isDashboardPath && !isProtectedPage) {
    return NextResponse.next()
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  // No session — redirect pages, return 401 for APIs
  if (!token) {
    if (isApiRoute) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const loginUrl = new URL('/auth/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const role = token.role as Role | undefined

  // Dashboard paths — require a staff role
  if (isDashboardPath) {
    if (!role || !canAccessDashboard(role)) {
      if (isApiRoute) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      return NextResponse.redirect(new URL('/?error=unauthorized', req.url))
    }
    return NextResponse.next()
  }

  // Admin paths — ADMIN / SUPER_ADMIN only
  if (isAdminPath) {
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      if (isApiRoute) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      return NextResponse.redirect(new URL('/?error=unauthorized', req.url))
    }
    return NextResponse.next()
  }

  // Protected store pages (/account, /checkout) — just require any authenticated session
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
