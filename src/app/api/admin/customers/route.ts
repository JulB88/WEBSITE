import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const MAX_LIMIT = 100

// Explicit user select — never return password
const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  emailVerified: true,
  image: true,
  businessCustomer: { include: { priceList: true } },
  _count: { select: { orders: true } },
} as const

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const search = searchParams.get('search')?.trim() || ''
    const type = searchParams.get('type') || 'all'

    const where: any = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (type === 'business') where.role = 'BUSINESS'
    if (type === 'customer') where.role = 'CUSTOMER'

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: USER_SELECT,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.user.count({ where }),
    ])

    return NextResponse.json({ users, total, page, pages: Math.ceil(total / limit) })
  } catch (err: any) {
    console.error('[admin/customers GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { businessCustomerId, discountPercent, priceListId, companyName, vatNumber } = body

    if (!businessCustomerId || typeof businessCustomerId !== 'string') {
      return NextResponse.json({ error: 'businessCustomerId is required' }, { status: 400 })
    }

    // Validate discount range
    if (discountPercent !== undefined) {
      const d = Number(discountPercent)
      if (isNaN(d) || d < 0 || d > 100) {
        return NextResponse.json({ error: 'discountPercent must be between 0 and 100' }, { status: 400 })
      }
    }

    // Validate companyName
    if (companyName !== undefined && (typeof companyName !== 'string' || companyName.trim().length === 0)) {
      return NextResponse.json({ error: 'companyName cannot be empty' }, { status: 400 })
    }

    const updated = await prisma.businessCustomer.update({
      where: { id: businessCustomerId },
      data: {
        ...(discountPercent !== undefined ? { discountPercent: Number(discountPercent) } : {}),
        ...(priceListId !== undefined ? { priceListId: priceListId || null } : {}),
        ...(companyName ? { companyName: companyName.trim() } : {}),
        ...(vatNumber !== undefined ? { vatNumber: vatNumber || null } : {}),
      },
    })

    return NextResponse.json(updated)
  } catch (err: any) {
    console.error('[admin/customers PATCH]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
