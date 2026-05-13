import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Public endpoint called by the proxy to check whether the site lock is enabled.
 * Returns { enabled: boolean }. No auth required (just a boolean flag).
 */
export async function GET() {
  try {
    const row = await prisma.setting.findUnique({ where: { key: 'site_lock_enabled' } })
    // Default: enabled if SITE_TOKEN is configured (env var exists)
    const enabled = row ? row.value === 'true' : true
    return NextResponse.json({ enabled }, {
      headers: {
        // Cache for 10 seconds to avoid hammering the DB on every request
        'Cache-Control': 's-maxage=10, stale-while-revalidate=5',
      },
    })
  } catch {
    // On DB error, default to locked (safe)
    return NextResponse.json({ enabled: true })
  }
}
