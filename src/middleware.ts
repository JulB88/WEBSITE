import { NextRequest, NextResponse } from 'next/server'

const LOCK_COOKIE = '__site_lock'

// Paths that never require the password
const PUBLIC_PREFIXES = [
  '/site-lock',
  '/api/site-lock',
  '/_next',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Always allow public paths
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const siteToken = process.env.SITE_TOKEN
  // If SITE_TOKEN is not configured, bypass protection entirely
  if (!siteToken) return NextResponse.next()

  const cookie = req.cookies.get(LOCK_COOKIE)?.value
  if (cookie === siteToken) return NextResponse.next()

  // Redirect to password page, remember where the user wanted to go
  const url = req.nextUrl.clone()
  url.pathname = '/site-lock'
  url.searchParams.set('from', pathname)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    /*
     * Match all paths except Next.js internals and static files
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
