import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Public endpoint — tells the site-lock page whether TOTP is active.
 * Returns { totp: boolean }
 */
export async function GET() {
  try {
    const row = await prisma.setting.findUnique({ where: { key: 'site_totp_secret' } })
    return NextResponse.json({ totp: !!row?.value })
  } catch {
    return NextResponse.json({ totp: false })
  }
}
