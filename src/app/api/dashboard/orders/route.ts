import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'

const secret = process.env.NEXTAUTH_SECRET

// GET /api/dashboard/orders — paginated order list with filters
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(token.role as Role, 'orders:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20')))
  const status = searchParams.get('status') ?? ''
  const search = searchParams.get('search') ?? ''

  const where: any = {}
  if (status) where.status = status
  if (search) {
    where.OR = [
      { id: { contains: search, mode: 'insensitive' } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { bcSalesOrderNo: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { id: true, email: true, name: true } },
        businessCustomer: { select: { id: true, companyName: true } },
        orderItems: {
          include: { product: { select: { id: true, name: true, bcItemNo: true } } },
        },
      },
    }),
    prisma.order.count({ where }),
  ])

  return NextResponse.json({ orders, total, page, pages: Math.ceil(total / limit) })
}
