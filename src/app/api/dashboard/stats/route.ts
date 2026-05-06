import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import { canAccessDashboard } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'

const secret = process.env.NEXTAUTH_SECRET

// GET /api/dashboard/stats — overview metrics
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canAccessDashboard(token.role as Role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [
    totalUsers,
    newUsers30d,
    totalOrders,
    pendingOrders,
    revenueResult,
    revenue30dResult,
    totalProducts,
    activeProducts,
    recentOrders,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.order.aggregate({ _sum: { totalAmount: true }, where: { status: { not: 'CANCELLED' } } }),
    prisma.order.aggregate({ _sum: { totalAmount: true }, where: { status: { not: 'CANCELLED' }, createdAt: { gte: thirtyDaysAgo } } }),
    prisma.product.count(),
    prisma.product.count({ where: { active: true } }),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { email: true, name: true } } },
    }),
  ])

  return NextResponse.json({
    users: { total: totalUsers, new30d: newUsers30d },
    orders: { total: totalOrders, pending: pendingOrders },
    revenue: {
      total: revenueResult._sum.totalAmount ?? 0,
      last30d: revenue30dResult._sum.totalAmount ?? 0,
    },
    products: { total: totalProducts, active: activeProducts },
    recentOrders,
  })
}
