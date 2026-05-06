import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const priceLists = await prisma.priceList.findMany({
      include: {
        _count: { select: { businessCustomers: true, priceListItems: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(priceLists)
  } catch (err: any) {
    console.error('[price-lists GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { name, discountPercent, isDefault } = body

    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

    // If setting as default, unset others
    if (isDefault) {
      await prisma.priceList.updateMany({ where: { isDefault: true }, data: { isDefault: false } })
    }

    const priceList = await prisma.priceList.create({
      data: { name, discountPercent: discountPercent ?? 0, isDefault: isDefault ?? false },
    })

    return NextResponse.json(priceList, { status: 201 })
  } catch (err: any) {
    console.error('[price-lists POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
