import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'

const secret = process.env.NEXTAUTH_SECRET

// GET /api/dashboard/categories — full category tree
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(token.role as Role, 'categories:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const categories = await prisma.category.findMany({
    orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
    include: {
      children: { orderBy: { name: 'asc' } },
      _count: { select: { products: true, categoryDiscounts: true } },
    },
  })

  // Return only top-level (with children embedded)
  const roots = categories.filter((c) => !c.parentId)
  return NextResponse.json(roots)
}

// POST /api/dashboard/categories — create category or sub-category
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(token.role as Role, 'categories:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { name, slug, description, parentId } = body

  if (!name || !slug) {
    return NextResponse.json({ error: 'name and slug are required' }, { status: 400 })
  }

  // Slug uniqueness
  const existing = await prisma.category.findUnique({ where: { slug } })
  if (existing) return NextResponse.json({ error: 'Slug already in use' }, { status: 409 })

  // Validate parent exists if given
  if (parentId) {
    const parent = await prisma.category.findUnique({ where: { id: parentId } })
    if (!parent) return NextResponse.json({ error: 'Parent category not found' }, { status: 400 })
    // Only one level of nesting allowed (parent must be a root)
    if (parent.parentId) {
      return NextResponse.json({ error: 'Cannot nest more than one level deep' }, { status: 400 })
    }
  }

  const category = await prisma.category.create({
    data: { name, slug, description: description ?? null, parentId: parentId ?? null },
  })

  return NextResponse.json(category, { status: 201 })
}
