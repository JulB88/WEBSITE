import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'

const secret = process.env.NEXTAUTH_SECRET

// PATCH /api/dashboard/categories/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const token = await getToken({ req, secret })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(token.role as Role, 'categories:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { name, slug, description, parentId } = body

  const existing = await prisma.category.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (slug && slug !== existing.slug) {
    const conflict = await prisma.category.findUnique({ where: { slug } })
    if (conflict) return NextResponse.json({ error: 'Slug already in use' }, { status: 409 })
  }

  if (parentId && parentId === params.id) {
    return NextResponse.json({ error: 'A category cannot be its own parent' }, { status: 400 })
  }

  const category = await prisma.category.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(slug !== undefined && { slug }),
      ...(description !== undefined && { description }),
      ...(parentId !== undefined && { parentId: parentId || null }),
    },
  })

  return NextResponse.json(category)
}

// DELETE /api/dashboard/categories/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const token = await getToken({ req, secret })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(token.role as Role, 'categories:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = await prisma.category.findUnique({
    where: { id: params.id },
    include: { _count: { select: { products: true, children: true } } },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (existing._count.products > 0) {
    return NextResponse.json(
      { error: `Cannot delete — ${existing._count.products} product(s) are assigned to this category` },
      { status: 409 }
    )
  }
  if (existing._count.children > 0) {
    return NextResponse.json(
      { error: 'Cannot delete — remove sub-categories first' },
      { status: 409 }
    )
  }

  await prisma.category.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
