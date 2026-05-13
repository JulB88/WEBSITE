import { NextRequest, NextResponse } from 'next/server'

const LOCK_COOKIE = '__site_lock'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json()

    const sitePassword = process.env.SITE_PASSWORD
    const siteToken = process.env.SITE_TOKEN

    if (!sitePassword || !siteToken) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 })
    }

    if (password !== sitePassword) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    // Password correct — set the access cookie
    const res = NextResponse.json({ ok: true })
    res.cookies.set(LOCK_COOKIE, siteToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    })
    return res
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
}
