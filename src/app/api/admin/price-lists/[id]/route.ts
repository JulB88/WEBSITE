import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const priceList = await prisma.priceList.findUnique({
      where: { id: params.id },
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

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { name, discountPercent, isDefault, items } = body

    if (isDefault) {
      await prisma.priceList.updateMany({ where: { isDefault: true, id: { not: params.id } }, data: { isDefault: false } })
    }

    const priceList = await prisma.priceList.update({
      where: { id: params.id },
      data: {
        ...(name ? { name } : {}),
        ...(discountPercent !== undefined ? { discountPercent } : {}),
        ...(isDefault !== undefined ? { isDefault } : {}),
      },
    })

    // Update price list items if provided
    if (items && Array.isArray(items)) {
      // Delete all existing items and recreate
      await prisma.priceListItem.deleteMany({ where: { priceListId: params.id } })
      if (items.length > 0) {
        await prisma.priceListItem.createMany({
          data: items.map((item: any) => ({
            priceListId: params.id,
            productId: item.productId,
            overridePrice: item.overridePrice ?? null,
          })),
        })
      }
    }

    return NextResponse.json(priceList)
  } catch (err: any) {
    console.error('[price-list PUT]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.priceList.delete({ where: { id: params.id } })
    return NextResponse.json({ message: 'Price list deleted' })
  } catch (err: any) {
    console.error('[price-list DELETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
