import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessDashboard, hasPermission } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'
import type { Product, Prisma } from '@prisma/client'

const MAX_LIMIT = 100
const FEATURED_LIMIT = 8

type ProductWithDisplay = Product & { displayPrice: number; discountPercent?: number }

async function applyBusinessPricing(
  products: Product[],
  businessCustomerId: string
): Promise<ProductWithDisplay[]> {
  const bc = await prisma.businessCustomer.findUnique({
    where: { id: businessCustomerId },
    include: { priceList: { include: { priceListItems: true } } },
  })
  if (!bc) return products.map((p) => ({ ...p, displayPrice: p.price }))

  const discountPercent = bc.priceList?.discountPercent ?? bc.discountPercent

  return products.map((product) => {
    const overrideItem = bc.priceList?.priceListItems.find((i) => i.productId === product.id)
    const displayPrice = overrideItem?.overridePrice != null
      ? overrideItem.overridePrice
      : product.price * (1 - discountPercent / 100)

    return {
      ...product,
      displayPrice: Math.round(displayPrice * 100) / 100,
      discountPercent,
    }
  })
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')?.trim() || ''
    const category = searchParams.get('category')?.trim() || ''
    const sort = searchParams.get('sort') || 'createdAt_desc'
    const featured = searchParams.get('featured') === 'true'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = featured
      ? FEATURED_LIMIT
      : Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))

    const [sortField, sortDir] = sort.split('_')
    const allowedSortFields: Record<string, string> = { price: 'price', createdAt: 'createdAt', name: 'name' }
    const orderBy = {
      [allowedSortFields[sortField] ?? 'createdAt']: sortDir === 'asc' ? 'asc' : 'desc',
    }

    // Only authenticated staff may view inactive products
    const session = await getServerSession(authOptions)
    const isStaff = !!session && canAccessDashboard(session.user.role as Role)
    const categoryId = searchParams.get('categoryId')?.trim() || ''
    const activeParam = searchParams.get('active')

    const where: Prisma.ProductWhereInput = isStaff
      ? (activeParam !== '' && activeParam !== null ? { active: activeParam === 'true' } : {})
      : { active: true }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { bcItemNo: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (category) where.category = category
    if (categoryId) where.categoryId = categoryId

    // Skip expensive count query for featured (limit is fixed, no pagination needed)
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        take: limit,
        skip: featured ? 0 : (page - 1) * limit,
        include: isStaff ? { productCategory: { select: { id: true, name: true, parentId: true } } } : undefined,
      }),
      featured ? Promise.resolve(null) : prisma.product.count({ where }),
    ])

    const enriched: ProductWithDisplay[] = session?.user.businessCustomerId
      ? await applyBusinessPricing(products, session.user.businessCustomerId)
      : products.map((p) => ({ ...p, displayPrice: p.price }))

    return NextResponse.json({
      products: enriched,
      total: total ?? enriched.length,
      page,
      pages: total ? Math.ceil(total / limit) : 1,
    })
  } catch (err: any) {
    console.error('[products GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !hasPermission(session.user.role as Role, 'products:write')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { bcItemNo, name, description, price, stock, imageUrl, category } = body

    if (!bcItemNo || typeof bcItemNo !== 'string' || bcItemNo.trim().length === 0) {
      return NextResponse.json({ error: 'bcItemNo is required' }, { status: 400 })
    }
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }
    const parsedPrice = Number(price)
    if (price == null || isNaN(parsedPrice) || parsedPrice < 0) {
      return NextResponse.json({ error: 'price must be a non-negative number' }, { status: 400 })
    }

    const duplicate = await prisma.product.findUnique({ where: { bcItemNo: bcItemNo.trim() } })
    if (duplicate) {
      return NextResponse.json({ error: 'A product with this BC item number already exists' }, { status: 409 })
    }

    const product = await prisma.product.create({
      data: {
        bcItemNo: bcItemNo.trim(),
        name: name.trim(),
        description: description?.trim() || null,
        price: parsedPrice,
        stock: Math.max(0, parseInt(stock ?? 0, 10) || 0),
        imageUrl: imageUrl?.trim() || null,
        category: category?.trim() || null,
      },
    })

    return NextResponse.json(product, { status: 201 })
  } catch (err: any) {
    console.error('[products POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
