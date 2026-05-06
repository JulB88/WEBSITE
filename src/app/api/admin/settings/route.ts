import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

// Explicit allowlist — unknown keys are silently ignored
const ALLOWED_KEYS = new Set([
  'store_name',
  'store_currency',
  'store_email',
  'stripe_publishable_key',
  'stripe_secret_key',
  'stripe_webhook_secret',
  'bc_tenant_id',
  'bc_client_id',
  'bc_client_secret',
  'bc_environment',
  'bc_company_id',
])

const SECRET_KEYS = new Set([
  'stripe_secret_key',
  'stripe_webhook_secret',
  'bc_client_secret',
])

function maskSecret(value: string) {
  if (value.length <= 8) return '••••••••'
  return value.slice(0, 4) + '••••••••' + value.slice(-4)
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session.user.role as Role, 'settings:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rows = await prisma.setting.findMany({
    where: { key: { in: [...ALLOWED_KEYS] } },
  })

  const result: Record<string, string> = {}
  for (const row of rows) {
    result[row.key] = SECRET_KEYS.has(row.key) ? maskSecret(row.value) : row.value
  }

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session.user.role as Role, 'settings:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  for (const [key, value] of Object.entries(body)) {
    // Reject unknown keys
    if (!ALLOWED_KEYS.has(key)) continue
    if (typeof value !== 'string') continue
    // Skip — user didn't change a masked secret
    if (value.includes('••••')) continue

    if (value.trim() === '') {
      await prisma.setting.deleteMany({ where: { key } })
    } else {
      await prisma.setting.upsert({
        where: { key },
        update: { value: value.trim() },
        create: { key, value: value.trim() },
      })
    }
  }

  return NextResponse.json({ ok: true })
}
