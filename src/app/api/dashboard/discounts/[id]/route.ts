import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'

const secret = process.env.NEXTAUTH_SECRET
type Context = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Context) {
  const { id } = await params
  const token = await getToken({ req, secret })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(token.role as Role, 'discounts:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { discountPercent, priceListId, categoryId } = body

  const existing = await prisma.categoryDiscount.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (discountPercent !== undefined) {
    const pct = parseFloat(discountPercent)
    if (isNaN(pct) || pct < 0 || pct > 100) {
      return NextResponse.json({ error: 'discountPercent must be between 0 and 100' }, { status: 400 })
    }
  }

  const discount = await prisma.categoryDiscount.update({
    where: { id },
    data: {
      ...(discountPercent !== undefined && { discountPercent: parseFloat(discountPercent) }),
      ...(priceListId !== undefined && { priceListId: priceListId || null }),
      ...(categoryId !== undefined && { categoryId }),
    },
    include: {
      category: { select: { id: true, name: true, slug: true, parentId: true } },
      priceList: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(discount)
}

export async function DELETE(req: NextRequest, { params }: Context) {
  const { id } = await params
  const token = await getToken({ req, secret })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(token.role as Role, 'discounts:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.categoryDiscount.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
