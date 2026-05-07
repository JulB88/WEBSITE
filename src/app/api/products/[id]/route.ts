import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getToken } from 'next-auth/jwt'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

type Context = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Context) {
  try {
    const { id } = await params
    const product = await prisma.product.findUnique({ where: { id } })
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

export async function PATCH(req: NextRequest, { params }: Context) {
  try {
    const { id } = await params
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!hasPermission(token.role as Role, 'products:write')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { computeProductStatus } = await import('@/lib/product-utils')

    const current = await prisma.product.findUnique({ where: { id } })
    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const data: any = {}
    if ('categoryId' in body) data.categoryId = body.categoryId ?? null
    if ('active' in body) data.active = Boolean(body.active)
    if ('nameEn' in body) data.nameEn = body.nameEn?.trim() || null
    if ('descriptionEn' in body) data.descriptionEn = body.descriptionEn?.trim() || null
    if ('name' in body) data.name = body.name
    if ('description' in body) data.description = body.description
    if ('price' in body) data.price = body.price
    if ('stock' in body) data.stock = body.stock
    if ('imageUrl' in body) data.imageUrl = body.imageUrl

    // Recompute status based on merged fields
    const merged = { ...current, ...data }
    const intent = merged.active ? 'ACTIVE' : 'INACTIVE'
    data.status = computeProductStatus(
      { name: merged.name, categoryId: merged.categoryId, price: merged.price, description: merged.description },
      intent
    )

    const product = await prisma.product.update({ where: { id }, data })
    return NextResponse.json(product)
  } catch (err: any) {
    console.error('[product PATCH]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: Context) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session || !hasPermission(session.user.role as Role, 'products:write')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { computeProductStatus } = await import('@/lib/product-utils')
    const intent = body.active ? 'ACTIVE' : 'INACTIVE'
    const status = computeProductStatus(
      { name: body.name, categoryId: body.categoryId, price: body.price, description: body.description },
      intent
    )
    const product = await prisma.product.update({
      where: { id },
      data: {
        name: body.name,
        nameEn: body.nameEn?.trim() || null,
        description: body.description,
        descriptionEn: body.descriptionEn?.trim() || null,
        price: body.price,
        stock: body.stock,
        imageUrl: body.imageUrl,
        categoryId: body.categoryId ?? null,
        active: body.active,
        status,
      },
    })

    return NextResponse.json(product)
  } catch (err: any) {
    console.error('[product PUT]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Context) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session || !hasPermission(session.user.role as Role, 'products:write')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.product.update({ where: { id }, data: { active: false } })
    return NextResponse.json({ message: 'Product deactivated' })
  } catch (err: any) {
    console.error('[product DELETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
