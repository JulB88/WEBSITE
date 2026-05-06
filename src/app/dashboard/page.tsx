import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export const metadata = { title: 'Overview — Dashboard' }

async function getStats() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [
    totalUsers,
    newUsers30d,
    totalOrders,
    pendingOrders,
    revenueResult,
    revenue30dResult,
    activeProducts,
    recentOrders,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.order.aggregate({ _sum: { totalAmount: true }, where: { status: { not: 'CANCELLED' } } }),
    prisma.order.aggregate({ _sum: { totalAmount: true }, where: { status: { not: 'CANCELLED' }, createdAt: { gte: thirtyDaysAgo } } }),
    prisma.product.count({ where: { active: true } }),
    prisma.order.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { email: true, name: true } },
        businessCustomer: { select: { companyName: true } },
      },
    }),
  ])

  return {
    totalUsers, newUsers30d, totalOrders, pendingOrders,
    totalRevenue: revenueResult._sum.totalAmount ?? 0,
    revenue30d: revenue30dResult._sum.totalAmount ?? 0,
    activeProducts,
    recentOrders,
  }
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  PROCESSING: 'bg-blue-100 text-blue-700',
  SHIPPED: 'bg-indigo-100 text-indigo-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const stats = await getStats()

  const statCards = [
    {
      label: 'Total Revenue',
      value: `€${stats.totalRevenue.toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: `€${stats.revenue30d.toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} last 30 days`,
      icon: '💶',
      color: 'bg-green-50 border-green-200',
    },
    {
      label: 'Total Orders',
      value: stats.totalOrders.toLocaleString(),
      sub: `${stats.pendingOrders} pending`,
      icon: '📦',
      color: 'bg-blue-50 border-blue-200',
      href: '/dashboard/orders',
    },
    {
      label: 'Customers',
      value: stats.totalUsers.toLocaleString(),
      sub: `+${stats.newUsers30d} this month`,
      icon: '👥',
      color: 'bg-purple-50 border-purple-200',
      href: '/dashboard/customers',
    },
    {
      label: 'Active Products',
      value: stats.activeProducts.toLocaleString(),
      sub: 'in catalogue',
      icon: '🛍️',
      color: 'bg-amber-50 border-amber-200',
      href: '/dashboard/products',
    },
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Good {getGreeting()}, {session?.user?.name?.split(' ')[0] ?? 'there'} 👋
        </h1>
        <p className="text-gray-500 mt-1">Here's what's happening with your store today.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-10">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-xl border p-5 ${card.color} ${card.href ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
          >
            {card.href ? (
              <Link href={card.href} className="block">
                <StatCardInner {...card} />
              </Link>
            ) : (
              <StatCardInner {...card} />
            )}
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Recent Orders</h2>
          <Link href="/dashboard/orders" className="text-sm text-indigo-600 hover:underline">
            View all →
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {stats.recentOrders.length === 0 ? (
            <p className="px-6 py-8 text-center text-gray-400">No orders yet</p>
          ) : (
            stats.recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/dashboard/orders?highlight=${order.id}`}
                className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {order.businessCustomer?.companyName ?? order.user.name ?? order.user.email}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(order.createdAt).toLocaleDateString('en-IE', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                    {order.bcSalesOrderNo && (
                      <span className="ml-2 text-gray-300">· {order.bcSalesOrderNo}</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {order.status}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    €{order.totalAmount.toFixed(2)}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function StatCardInner({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: string; href?: string; color?: string }) {
  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-600 mt-0.5">{label}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}
