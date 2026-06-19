'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { hasPermission } from '@/lib/permissions'
import type { Role, Permission } from '@/lib/permissions'
import { signOut } from 'next-auth/react'

interface NavItem {
  label: string
  href: string
  icon: string
  permission?: Permission
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview',    href: '/dashboard',              icon: '📊' },
  { label: 'Orders',      href: '/dashboard/orders',        icon: '📦', permission: 'orders:read' },
  { label: 'Facturation', href: '/dashboard/billing',       icon: '🧾', permission: 'orders:read' },
  { label: 'Courriels',   href: '/dashboard/emails',        icon: '📧', permission: 'settings:read' },
  { label: 'Customers',   href: '/dashboard/customers',     icon: '👥', permission: 'users:read' },
  { label: 'Products',    href: '/dashboard/products',      icon: '🛍️', permission: 'products:read' },
  { label: 'Categories',  href: '/dashboard/categories',    icon: '🗂️', permission: 'categories:read' },
  { label: 'Discounts',   href: '/dashboard/discounts',     icon: '🏷️', permission: 'discounts:read' },
  { label: 'Price Lists', href: '/dashboard/price-lists',   icon: '💰', permission: 'pricelists:read' },
  { label: 'Settings',    href: '/dashboard/settings',      icon: '⚙️', permission: 'settings:read' },
]

interface SidebarProps {
  role: Role
  userName: string
  userEmail: string
}

export default function Sidebar({ role, userName, userEmail }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.permission || hasPermission(role, item.permission)
  )

  return (
    <aside
      className={`flex flex-col h-screen bg-gray-900 text-white transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-60'
      } shrink-0`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-700">
        {!collapsed && (
          <div>
            <span className="text-lg font-bold text-white">DSF</span>
            <span className="ml-2 text-xs text-gray-400">Dashboard</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          aria-label="Toggle sidebar"
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-2">
        {visibleItems.map((item) => {
          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <span className="text-base shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Store link */}
      <div className="px-2 pb-2">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
          title={collapsed ? 'View Store' : undefined}
        >
          <span className="text-base shrink-0">🏪</span>
          {!collapsed && <span>View Store</span>}
        </Link>
      </div>

      {/* User footer */}
      <div className="border-t border-gray-700 p-3">
        {!collapsed ? (
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{userName || userEmail}</p>
              <p className="text-xs text-gray-400 truncate">{role.replace('_', ' ')}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/auth/login' })}
              className="ml-2 text-xs text-gray-400 hover:text-red-400 shrink-0"
              title="Sign out"
            >
              ⏻
            </button>
          </div>
        ) : (
          <button
            onClick={() => signOut({ callbackUrl: '/auth/login' })}
            className="w-full flex justify-center text-gray-400 hover:text-red-400"
            title="Sign out"
          >
            ⏻
          </button>
        )}
      </div>
    </aside>
  )
}
