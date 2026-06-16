import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'

const secret = process.env.NEXTAUTH_SECRET
const MAX_LIMIT = 100

/**
 * GET /api/dashboard/billing
 * Liste des commandes au compte pour le dashboard de facturation.
 * Filtres : ?invoiced=true|false  ?paymentStatus=UNPAID|PARTIAL|PAID  ?page=&limit=
 */
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(token.role as Role, 'orders:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const invoicedParam = searchParams.get('invoiced')
  const paymentStatus = searchParams.get('paymentStatus')
  const page  = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)))

  const where: any = { paymentMethod: 'ON_ACCOUNT' }
  if (invoicedParam === 'true')  where.invoicedAt = { not: null }
  if (invoicedParam === 'false') where.invoicedAt = null
  if (paymentStatus && ['UNPAID', 'PARTIAL', 'PAID'].includes(paymentStatus)) {
    where.paymentStatus = paymentStatus
  }

  const [orders, total, summary] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        businessCustomer: { select: { id: true, companyName: true, creditLimit: true } },
        payments: { orderBy: { createdAt: 'desc' } },
        orderItems: { include: { product: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
    }),
    prisma.order.count({ where }),
    // Sommaire global : solde impayé total sur toutes les commandes au compte
    prisma.order.aggregate({
      where: { paymentMethod: 'ON_ACCOUNT', status: { not: 'CANCELLED' }, paymentStatus: { not: 'PAID' } },
      _sum: { totalAmount: true, paidAmount: true },
    }),
  ])

  const totalOutstanding = Math.round(
    ((summary._sum.totalAmount ?? 0) - (summary._sum.paidAmount ?? 0)) * 100
  ) / 100

  return NextResponse.json({
    orders,
    total,
    page,
    pages: Math.ceil(total / limit),
    totalOutstanding,
  })
}
