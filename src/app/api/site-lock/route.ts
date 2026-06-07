import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifySync } from 'otplib'

const LOCK_COOKIE    = '__site_lock'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json()
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Code requis' }, { status: 400 })
    }

    const siteToken = process.env.SITE_TOKEN
    if (!siteToken) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 })
    }

    const clean = code.replace(/\s/g, '')

    // 1. Try TOTP (preferred)
    const totpRow = await prisma.setting.findUnique({ where: { key: 'site_totp_secret' } })
    if (totpRow?.value) {
      const isValid = verifySync({ token: clean, secret: totpRow.value })
      if (!isValid) {
        return NextResponse.json({ error: 'Code incorrect.' }, { status: 401 })
      }
    } else {
      // 2. Fallback: plain password (before TOTP is configured)
      const dbRow        = await prisma.setting.findUnique({ where: { key: 'site_password' } })
      const sitePassword = dbRow?.value || process.env.SITE_PASSWORD
      if (!sitePassword || clean !== sitePassword) {
        return NextResponse.json({ error: 'Code incorrect.' }, { status: 401 })
      }
    }

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
