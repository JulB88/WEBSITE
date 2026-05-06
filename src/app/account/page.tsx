import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Badge from '@/components/ui/Badge'

export default async function AccountPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/login')

  const [user, totalOrders] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true, name: true, email: true, role: true, createdAt: true, image: true,
        businessCustomer: { include: { priceList: true } },
        orders: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { orderItems: { select: { id: true } } },
        },
      },
    }),
    prisma.order.count({ where: { userId: session.user.id } }),
  ])

  if (!user) redirect('/auth/login')

  const statusColors: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'danger'> = {
    PENDING: 'warning',
    PROCESSING: 'primary',
    SHIPPED: 'primary',
    DELIVERED: 'success',
    CANCELLED: 'danger',
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Account</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile card */}
        <div className="lg:col-span-1">
          <div className="card">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-700 font-bold text-xl">
                  {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">{user.name || 'User'}</h2>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Account Type</span>
                <Badge variant={user.role === 'ADMIN' ? 'danger' : user.role === 'BUSINESS' ? 'primary' : 'default'}>
                  {user.role}
                </Badge>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Member Since</span>
                <span className="text-sm font-medium">
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-500">Total Orders</span>
                <span className="text-sm font-medium">{totalOrders}</span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href="/account/orders"
                className="block text-center text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                View all orders →
              </Link>
            </div>
          </div>

          {/* Business customer info */}
          {user.businessCustomer && (
            <div className="card mt-4 border-amber-200 bg-amber-50">
              <h3 className="font-semibold text-amber-900 mb-4">Business Account</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-amber-700">Company</span>
                  <span className="text-sm font-medium text-amber-900">{user.businessCustomer.companyName}</span>
                </div>
                {user.businessCustomer.vatNumber && (
                  <div className="flex justify-between">
                    <span className="text-sm text-amber-700">VAT</span>
                    <span className="text-sm font-medium text-amber-900">{user.businessCustomer.vatNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-amber-700">Discount</span>
                  <span className="text-sm font-bold text-amber-900">
                    {user.businessCustomer.discountPercent}% off
                  </span>
                </div>
                {user.businessCustomer.priceList && (
                  <div className="flex justify-between">
                    <span className="text-sm text-amber-700">Price List</span>
                    <span className="text-sm font-medium text-amber-900">{user.businessCustomer.priceList.name}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Recent orders */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
              <Link
                href="/account/orders"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                View all
              </Link>
            </div>

            {user.orders.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="font-medium">No orders yet</p>
                <Link href="/products" className="text-sm text-primary-600 hover:text-primary-700 mt-1 inline-block">
                  Start shopping
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {user.orders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        Order #{order.id.slice(-8).toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(order.createdAt).toLocaleDateString()} · {order.orderItems.length} item{order.orderItems.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={statusColors[order.status] || 'default'}>
                        {order.status}
                      </Badge>
                      <span className="font-semibold text-gray-900">€{order.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
