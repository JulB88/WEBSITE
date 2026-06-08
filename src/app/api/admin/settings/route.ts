import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'
import { SettingsService } from '@/lib/services'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session.user.role as Role, 'settings:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const settings = await SettingsService.getAll()

  // Masque les secrets pour MANAGER (lecture seule partielle)
  const isReadOnly = !hasPermission(session.user.role as Role, 'settings:write')
  if (isReadOnly) {
    for (const key of SettingsService.SECRET_KEYS) {
      if (settings[key]) settings[key] = SettingsService.maskSecret(settings[key])
    }
  }

  // Valeurs par défaut si non en BD
  if (!settings.site_lock_enabled && process.env.SITE_TOKEN) {
    settings.site_lock_enabled = 'true'
  }
  if (!settings.site_password && process.env.SITE_PASSWORD) {
    settings.site_password = process.env.SITE_PASSWORD
  }

  return NextResponse.json({ settings })
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

  // Accepte { key: value } ou { settings: { key: value } }
  const entries: Record<string, string> = body.settings ?? body

  const toSave: Record<string, string> = {}
  for (const [key, value] of Object.entries(entries)) {
    if (!SettingsService.ALLOWED_KEYS.has(key)) continue
    if (typeof value !== 'string') continue
    if (value.includes('••••')) continue // secret masqué non modifié
    toSave[key] = value.trim()
  }

  await SettingsService.setMany(toSave)
  return NextResponse.json({ ok: true })
}
