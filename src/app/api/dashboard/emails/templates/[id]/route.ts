import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

type Context = { params: Promise<{ id: string }> }

/**
 * PATCH /api/dashboard/emails/templates/[id]
 * Modifie un modèle (name, subject, bodyHtml).
 */
export async function PATCH(req: NextRequest, { params }: Context) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session.user.role as Role, 'settings:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const data: { name?: string; subject?: string; bodyHtml?: string } = {}
  if (typeof body.name === 'string')     data.name = body.name.trim()
  if (typeof body.subject === 'string')  data.subject = body.subject.trim()
  if (typeof body.bodyHtml === 'string') data.bodyHtml = body.bodyHtml

  if (data.name === '' || data.subject === '' || data.bodyHtml?.trim() === '') {
    return NextResponse.json({ error: 'Nom, sujet et contenu ne peuvent pas être vides.' }, { status: 400 })
  }

  try {
    const template = await prisma.emailTemplate.update({ where: { id }, data })
    return NextResponse.json(template)
  } catch {
    return NextResponse.json({ error: 'Modèle introuvable.' }, { status: 404 })
  }
}

/**
 * DELETE /api/dashboard/emails/templates/[id]
 * Supprime un modèle. Les déclencheurs qui l'utilisaient passent à "aucun modèle"
 * (onDelete: SetNull) — l'événement concerné n'enverra plus de courriel.
 * Les modèles système (systemKey non null) ne sont pas supprimables.
 */
export async function DELETE(req: NextRequest, { params }: Context) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session.user.role as Role, 'settings:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const template = await prisma.emailTemplate.findUnique({ where: { id } })
  if (!template) return NextResponse.json({ error: 'Modèle introuvable.' }, { status: 404 })
  if (template.systemKey) {
    return NextResponse.json(
      { error: 'Les modèles par défaut ne peuvent pas être supprimés (mais peuvent être modifiés).' },
      { status: 400 }
    )
  }

  await prisma.emailTemplate.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
