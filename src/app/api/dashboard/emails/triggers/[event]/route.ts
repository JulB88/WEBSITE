import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { EMAIL_EVENTS } from '@/lib/services'

type Context = { params: Promise<{ event: string }> }

/**
 * PATCH /api/dashboard/emails/triggers/[event]
 * Configure un déclencheur : quel modèle envoyer, et activé ou non.
 * Body : { templateId?: string | null, enabled?: boolean }
 */
export async function PATCH(req: NextRequest, { params }: Context) {
  const { event } = await params
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session.user.role as Role, 'settings:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!EMAIL_EVENTS.some((e) => e.event === event)) {
    return NextResponse.json({ error: 'Événement inconnu.' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))
  const data: { templateId?: string | null; enabled?: boolean } = {}

  if ('templateId' in body) {
    if (body.templateId === null || body.templateId === '') {
      data.templateId = null
    } else if (typeof body.templateId === 'string') {
      // Vérifier que le modèle existe
      const exists = await prisma.emailTemplate.findUnique({ where: { id: body.templateId } })
      if (!exists) return NextResponse.json({ error: 'Modèle introuvable.' }, { status: 400 })
      data.templateId = body.templateId
    }
  }
  if (typeof body.enabled === 'boolean') data.enabled = body.enabled

  const trigger = await prisma.emailTrigger.upsert({
    where:  { event },
    update: data,
    create: { event, templateId: data.templateId ?? null, enabled: data.enabled ?? true },
  })

  return NextResponse.json(trigger)
}
