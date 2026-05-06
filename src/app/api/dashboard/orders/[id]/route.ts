import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'

const secret = process.env.NEXTAUTH_SECRET

const VALID_STATUSES = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']

// GET /api/dashboard/orders/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const token = await getToken({ req, secret })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(token.role as Role, 'orders:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, email: true, name: true } },
      businessCustomer: { select: { id: true, companyName: true, vatNumber: true } },
      orderItems: {
        include: { product: { select: { id: true, name: true, bcItemNo: true, imageUrl: true } } },
      },
    },
  })
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(order)
}

// PATCH /api/dashboard/orders/[id] — update status or BC order number
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const token = await getToken({ req, secret })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(token.role as Role, 'orders:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { status, bcSalesOrderNo } = body

  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: `Invalid status. Valid values: ${VALID_STATUSES.join(', ')}` }, { status: 400 })
  }

  const order = await prisma.order.update({
    where: { id: params.id },
    data: {
      ...(status && { status }),
      ...(bcSalesOrderNo !== undefined && { bcSalesOrderNo }),
    },
    include: {
      user: { select: { id: true, email: true, name: true } },
      orderItems: {
        include: { product: { select: { id: true, name: true, bcItemNo: true } } },
      },
    },
  })

  return NextResponse.json(order)
}
