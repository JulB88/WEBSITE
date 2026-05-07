'use client'

import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import Badge from '@/components/ui/Badge'

interface Order {
  id: string
  status: string
  totalAmount: number
  createdAt: Date | string
  orderItems: { id: string }[]
}

interface BusinessCustomer {
  companyName: string
  vatNumber?: string | null
  discountPercent: number
  priceList?: { name: string } | null
}

interface Props {
  user: {
    name?: string | null
    email: string
    role: string
    createdAt: Date | string
    businessCustomer?: BusinessCustomer | null
    orders: Order[]
  }
  totalOrders: number
}

const statusColors: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'danger'> = {
  PENDING: 'warning',
  PROCESSING: 'primary',
  SHIPPED: 'primary',
  DELIVERED: 'success',
  CANCELLED: 'danger',
}

export default function AccountClient({ user, totalOrders }: Props) {
  const { t } = useI18n()

  return (
    <div className="container py-8">
      <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#1f2232', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2rem' }}>
        {t('account_title')}
      </h1>

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
                <span className="text-sm text-gray-500">{t('account_type')}</span>
                <Badge variant={user.role === 'ADMIN' ? 'danger' : user.role === 'BUSINESS' ? 'primary' : 'default'}>
                  {user.role}
                </Badge>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">{t('account_since')}</span>
                <span className="text-sm font-medium">
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-500">{t('account_orders_total')}</span>
                <span className="text-sm font-medium">{totalOrders}</span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href="/account/orders"
                className="block text-center text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                {t('account_orders_link')}
              </Link>
            </div>
          </div>

          {/* Business customer info */}
          {user.businessCustomer && (
            <div className="card mt-4 border-amber-200 bg-amber-50">
              <h3 className="font-semibold text-amber-900 mb-4">{t('account_business')}</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-amber-700">{t('account_company')}</span>
                  <span className="text-sm font-medium text-amber-900">{user.businessCustomer.companyName}</span>
                </div>
                {user.businessCustomer.vatNumber && (
                  <div className="flex justify-between">
                    <span className="text-sm text-amber-700">{t('account_vat')}</span>
                    <span className="text-sm font-medium text-amber-900">{user.businessCustomer.vatNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-amber-700">{t('account_discount')}</span>
                  <span className="text-sm font-bold text-amber-900">
                    {user.businessCustomer.discountPercent}% off
                  </span>
                </div>
                {user.businessCustomer.priceList && (
                  <div className="flex justify-between">
                    <span className="text-sm text-amber-700">{t('account_pricelist')}</span>
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
              <h2 className="text-lg font-semibold text-gray-900">{t('account_recent_orders')}</h2>
              <Link
                href="/account/orders"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                {t('account_view_all')}
              </Link>
            </div>

            {user.orders.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="font-medium">{t('account_no_orders')}</p>
                <Link href="/products" className="text-sm text-primary-600 hover:text-primary-700 mt-1 inline-block">
                  {t('account_start_shopping')}
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
                        {new Date(order.createdAt).toLocaleDateString()} · {t('account_order_items', { n: order.orderItems.length })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={statusColors[order.status] || 'default'}>
                        {t(`status_${order.status.toLowerCase()}` as any)}
                      </Badge>
                      <span className="font-semibold text-gray-900">{order.totalAmount.toFixed(2)} $</span>
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
