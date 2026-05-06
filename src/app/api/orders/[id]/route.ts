import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        orderItems: { include: { product: true } },
        user: { select: { name: true, email: true } },
        businessCustomer: { select: { companyName: true } },
      },
    })

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    if (session.user.role !== 'ADMIN' && order.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(order)
  } catch (err: any) {
    console.error('[order GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { status, bcSalesOrderNo } = body

    const order = await prisma.order.update({
      where: { id: params.id },
      data: {
        ...(status ? { status } : {}),
        ...(bcSalesOrderNo ? { bcSalesOrderNo } : {}),
      },
    })

    return NextResponse.json(order)
  } catch (err: any) {
    console.error('[order PATCH]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
