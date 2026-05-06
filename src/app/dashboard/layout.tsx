import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { canAccessDashboard } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'
import Sidebar from '@/components/dashboard/Sidebar'

export const metadata = { title: 'Dashboard — ShopBC' }

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session?.user) redirect('/auth/login?callbackUrl=/dashboard')

  const role = session.user.role as Role
  if (!canAccessDashboard(role)) redirect('/?error=unauthorized')

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar
        role={role}
        userName={session.user.name ?? ''}
        userEmail={session.user.email ?? ''}
      />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
