import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { EmailService, EMAIL_EVENTS } from '@/lib/services'

type Context = { params: Promise<{ id: string }> }

/**
 * POST /api/dashboard/emails/templates/[id]/test
 * Envoie un aperçu du modèle (rendu avec des données d'exemple) à l'admin connecté.
 * Body optionnel : { event } — sinon déduit du déclencheur lié ou de la clé système.
 */
export async function POST(req: NextRequest, { params }: Context) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session.user.role as Role, 'settings:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const to = session.user.email
  if (!to) return NextResponse.json({ ok: false, message: 'Aucune adresse sur ton compte.' })

  const template = await prisma.emailTemplate.findUnique({ where: { id } })
  if (!template) return NextResponse.json({ error: 'Modèle introuvable.' }, { status: 404 })

  // Déterminer l'événement (pour les données d'exemple)
  const body = await req.json().catch(() => ({}))
  let event: string | undefined = typeof body.event === 'string' ? body.event : undefined
  if (!event) {
    const trig = await prisma.emailTrigger.findFirst({ where: { templateId: id } })
    event = trig?.event
      ?? (template.systemKey?.replace('default_', ''))
      ?? 'purchase_invoice'
  }
  if (!EMAIL_EVENTS.some((e) => e.event === event)) event = 'purchase_invoice'

  const { subject, html } = EmailService.renderPreview(template.subject, template.bodyHtml, event)

  try {
    const sent = await EmailService.send(to, `[TEST] ${subject}`, html)
    if (!sent) {
      return NextResponse.json({
        ok: false,
        message: 'SMTP non configuré. Configure-le dans Paramètres avant de tester un modèle.',
      })
    }
    return NextResponse.json({ ok: true, message: `Aperçu envoyé à ${to} ✓` })
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: `Échec SMTP : ${err?.message || 'erreur inconnue'}` })
  }
}
