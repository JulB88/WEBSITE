import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'

const secret = process.env.NEXTAUTH_SECRET

// GET /api/dashboard/discounts — list all category discounts
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(token.role as Role, 'discounts:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const discounts = await prisma.categoryDiscount.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      category: { select: { id: true, name: true, slug: true, parentId: true } },
      priceList: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(discounts)
}

// POST /api/dashboard/discounts — create category discount
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(token.role as Role, 'discounts:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { categoryId, priceListId, discountPercent } = body

  if (!categoryId || discountPercent === undefined) {
    return NextResponse.json({ error: 'categoryId and discountPercent are required' }, { status: 400 })
  }

  const pct = parseFloat(discountPercent)
  if (isNaN(pct) || pct < 0 || pct > 100) {
    return NextResponse.json({ error: 'discountPercent must be between 0 and 100' }, { status: 400 })
  }

  const category = await prisma.category.findUnique({ where: { id: categoryId } })
  if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 400 })

  if (priceListId) {
    const pl = await prisma.priceList.findUnique({ where: { id: priceListId } })
    if (!pl) return NextResponse.json({ error: 'Price list not found' }, { status: 400 })
  }

  const discount = await prisma.categoryDiscount.create({
    data: {
      categoryId,
      priceListId: priceListId ?? null,
      discountPercent: pct,
    },
    include: {
      category: { select: { id: true, name: true, slug: true, parentId: true } },
      priceList: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(discount, { status: 201 })
}
