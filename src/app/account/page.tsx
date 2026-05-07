import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import AccountClient from './AccountClient'

export default async function AccountPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/login')

  const [user, totalOrders] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true, name: true, email: true, role: true, createdAt: true,
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

  return <AccountClient user={user} totalOrders={totalOrders} />
}
