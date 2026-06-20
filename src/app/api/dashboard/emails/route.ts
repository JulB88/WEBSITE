import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { EmailService, EMAIL_EVENTS, BrandService, SettingsService } from '@/lib/services'

/**
 * GET /api/dashboard/emails
 * Seed les modèles/déclencheurs par défaut, puis retourne :
 *  - templates : tous les modèles
 *  - triggers  : un par événement (event → templateId, enabled)
 *  - events    : métadonnées (label, description, variables disponibles)
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session.user.role as Role, 'settings:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await EmailService.seedDefaults()

  const [templates, triggers, brand, smtp] = await Promise.all([
    prisma.emailTemplate.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.emailTrigger.findMany(),
    BrandService.get(),
    SettingsService.getMany(['smtp_host', 'smtp_user', 'smtp_password', 'smtp_verified']),
  ])

  // SMTP prêt = configuré ET testé avec succès au moins une fois
  const smtpReady = !!(smtp.smtp_host && smtp.smtp_user && smtp.smtp_password && smtp.smtp_verified === 'true')

  return NextResponse.json({ templates, triggers, events: EMAIL_EVENTS, brand, smtpReady })
}
