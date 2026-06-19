import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/dashboard/emails/templates
 * Crée un nouveau modèle de courriel.
 * Body : { name, subject, bodyHtml }
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session.user.role as Role, 'settings:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const name     = typeof body.name === 'string' ? body.name.trim() : ''
  const subject  = typeof body.subject === 'string' ? body.subject.trim() : ''
  const bodyHtml = typeof body.bodyHtml === 'string' ? body.bodyHtml : ''

  if (!name || !subject || !bodyHtml.trim()) {
    return NextResponse.json({ error: 'Nom, sujet et contenu sont requis.' }, { status: 400 })
  }

  const template = await prisma.emailTemplate.create({
    data: { name, subject, bodyHtml }, // systemKey null = créé par l'utilisateur
  })

  return NextResponse.json(template, { status: 201 })
}
