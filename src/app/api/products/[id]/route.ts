import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getToken } from 'next-auth/jwt'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const product = await prisma.product.findUnique({ where: { id: params.id } })
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    const session = await getServerSession(authOptions)
    let displayPrice = product.price
    let discountPercent = 0

    if (session?.user.businessCustomerId) {
      const bc = await prisma.businessCustomer.findUnique({
        where: { id: session.user.businessCustomerId },
        include: { priceList: { include: { priceListItems: true } } },
      })
      if (bc) {
        const item = bc.priceList?.priceListItems.find((i) => i.productId === product.id)
        discountPercent = bc.discountPercent
        displayPrice = item?.overridePrice != null
          ? item.overridePrice
          : product.price * (1 - bc.discountPercent / 100)
      }
    }

    return NextResponse.json({ ...product, displayPrice, discountPercent })
  } catch (err: any) {
    console.error('[product GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH — dashboard partial update (categoryId, active)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!hasPermission(token.role as Role, 'products:write')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const data: any = {}
    if ('categoryId' in body) data.categoryId = body.categoryId ?? null
    if ('active' in body) data.active = Boolean(body.active)

    const product = await prisma.product.update({ where: { id: params.id }, data })
    return NextResponse.json(product)
  } catch (err: any) {
    console.error('[product PATCH]', err)
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
    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        name: body.name,
        description: body.description,
        price: body.price,
        stock: body.stock,
        imageUrl: body.imageUrl,
        category: body.category,
        active: body.active,
      },
    })

    return NextResponse.json(product)
  } catch (err: any) {
    console.error('[product PUT]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.product.update({ where: { id: params.id }, data: { active: false } })
    return NextResponse.json({ message: 'Product deactivated' })
  } catch (err: any) {
    console.error('[product DELETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
