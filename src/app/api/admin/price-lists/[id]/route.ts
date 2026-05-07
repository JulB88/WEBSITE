import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

type Context = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Context) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session || !hasPermission(session.user.role as Role, 'pricelists:read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const priceList = await prisma.priceList.findUnique({
      where: { id },
      include: {
        priceListItems: { include: { product: true } },
        businessCustomers: { include: { user: { select: { name: true, email: true } } } },
      },
    })

    if (!priceList) return NextResponse.json({ error: 'Price list not found' }, { status: 404 })
    return NextResponse.json(priceList)
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: Context) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session || !hasPermission(session.user.role as Role, 'pricelists:write')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { name, discountPercent, isDefault, items } = body

    if (isDefault) {
      await prisma.priceList.updateMany({ where: { isDefault: true, id: { not: id } }, data: { isDefault: false } })
    }

    const priceList = await prisma.priceList.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(discountPercent !== undefined ? { discountPercent } : {}),
        ...(isDefault !== undefined ? { isDefault } : {}),
      },
    })

    if (items && Array.isArray(items)) {
      await prisma.$transaction([
        prisma.priceListItem.deleteMany({ where: { priceListId: id } }),
        ...(items.length > 0
          ? [prisma.priceListItem.createMany({
              data: items.map((item: any) => ({
                priceListId: id,
                productId: item.productId,
                overridePrice: item.overridePrice ?? null,
              })),
            })]
          : []),
      ])
    }

    return NextResponse.json(priceList)
  } catch (err: any) {
    console.error('[price-list PUT]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Context) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session || !hasPermission(session.user.role as Role, 'pricelists:write')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.priceList.delete({ where: { id } })
    return NextResponse.json({ message: 'Price list deleted' })
  } catch (err: any) {
    console.error('[price-list DELETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
