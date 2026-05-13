import { getToken } from 'next-auth/jwt'
import { NextRequest, NextResponse } from 'next/server'
import { canAccessDashboard } from './lib/permissions'
import type { Role } from './lib/permissions'

const secret = process.env.NEXTAUTH_SECRET
const LOCK_COOKIE = '__site_lock'

// Paths that bypass the site password gate entirely
const SITE_LOCK_BYPASS = [
  '/site-lock',
  '/api/site-lock',
  '/_next',
  '/favicon.ico',
  '/robots.txt',
]

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  // ── 1. Site password gate ───────────────────────────────────────────────────
  const siteToken = process.env.SITE_TOKEN
  if (siteToken && !SITE_LOCK_BYPASS.some((p) => pathname.startsWith(p))) {
    const cookie = req.cookies.get(LOCK_COOKIE)?.value
    if (cookie !== siteToken) {
      const url = req.nextUrl.clone()
      url.pathname = '/site-lock'
      url.searchParams.set('from', pathname)
      return NextResponse.redirect(url)
    }
  }

  // ── 2. Auth-protected routes ────────────────────────────────────────────────
  const isApiRoute = pathname.startsWith('/api/')
  const isAdminPath = pathname.startsWith('/admin') || pathname.startsWith('/api/admin')
  const isDashboardPath = pathname.startsWith('/dashboard') || pathname.startsWith('/api/dashboard')
  const isProtectedPage = pathname.startsWith('/account') || pathname.startsWith('/checkout')

  if (!isAdminPath && !isDashboardPath && !isProtectedPage) return NextResponse.next()

  const token = await getToken({ req, secret })

  // Unauthenticated — redirect pages to login, return 401 for APIs
  if (!token) {
    if (isApiRoute) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const loginUrl = new URL('/auth/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Dashboard paths — require a staff role (SUPER_ADMIN, ADMIN, MANAGER, CUSTOMER_SERVICE)
  if (isDashboardPath) {
    const role = token.role as Role | undefined
    if (!role || !canAccessDashboard(role)) {
      if (isApiRoute) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      return NextResponse.redirect(new URL('/?error=unauthorized', req.url))
    }
    return NextResponse.next()
  }

  // Legacy /admin paths — ADMIN / SUPER_ADMIN only
  if (isAdminPath && token.role !== 'ADMIN' && token.role !== 'SUPER_ADMIN') {
    if (isApiRoute) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.redirect(new URL('/?error=unauthorized', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
