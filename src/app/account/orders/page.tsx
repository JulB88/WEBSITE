import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Badge from '@/components/ui/Badge'

export default async function OrdersPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/login')

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      orderItems: {
        include: {
          product: true,
        },
      },
    },
  })

  const statusColors: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'danger'> = {
    PENDING: 'warning',
    PROCESSING: 'primary',
    SHIPPED: 'primary',
    DELIVERED: 'success',
    CANCELLED: 'danger',
  }

  return (
    <div className="container py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/account" className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Order History</h1>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-lg font-medium mb-2">No orders yet</p>
          <Link href="/products" className="text-primary-600 hover:text-primary-700 font-medium">
            Browse products to get started
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Order header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gray-50 border-b border-gray-200">
                <div>
                  <p className="font-semibold text-gray-900">
                    Order #{order.id.slice(-8).toUpperCase()}
                  </p>
                  <p className="text-sm text-gray-500">
                    Placed {new Date(order.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={statusColors[order.status] || 'default'}>
                    {order.status}
                  </Badge>
                  <span className="font-bold text-gray-900">${order.totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Order items */}
              <div className="divide-y divide-gray-100">
                {order.orderItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{item.product.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {item.product.bcItemNo} · Qty: {item.quantity}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      ${(item.unitPrice * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Order footer */}
              {order.bcSalesOrderNo && (
                <div className="px-4 py-2 bg-blue-50 border-t border-blue-100">
                  <p className="text-xs text-blue-700">
                    BC Sales Order: {order.bcSalesOrderNo}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
