import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'
import { BrandService, SettingsService } from '@/lib/services'

/**
 * GET  /api/dashboard/branding — marque + palette actuelles
 * POST /api/dashboard/branding — enregistre la marque (noms, logo, couleurs)
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session.user.role as Role, 'settings:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return NextResponse.json({ brand: await BrandService.get(), defaults: BrandService.DEFAULTS })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session.user.role as Role, 'settings:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const brand = body.brand ?? body
  if (typeof brand !== 'object' || brand === null) {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
  }

  const toSave: Record<string, string> = {}
  for (const key of Object.keys(BrandService.KEY_MAP) as (keyof typeof BrandService.KEY_MAP)[]) {
    const value = brand[key]
    if (typeof value !== 'string' || !value.trim()) continue

    const settingKey = BrandService.KEY_MAP[key]
    // Valider les couleurs
    if (settingKey.startsWith('brand_color_') && !BrandService.isHexColor(value.trim())) {
      return NextResponse.json({ error: `Couleur invalide pour ${key} : « ${value} » (format attendu #rrggbb)` }, { status: 400 })
    }
    toSave[settingKey] = value.trim()
  }

  await SettingsService.setMany(toSave)
  return NextResponse.json({ ok: true, brand: await BrandService.get() })
}
