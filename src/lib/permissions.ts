/**
 * Role & Permission system for ShopBC.
 *
 * Best practices applied:
 * - Principle of least privilege: each role gets only what it needs
 * - Role hierarchy: SUPER_ADMIN > ADMIN > MANAGER > CUSTOMER_SERVICE > BUSINESS > CUSTOMER
 * - Privilege escalation prevention: actors can only assign roles below their own
 * - Staff roles (SUPER_ADMIN..CUSTOMER_SERVICE) can access the dashboard
 * - Customer roles (BUSINESS, CUSTOMER) only access the storefront
 */

export type Role =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MANAGER'
  | 'CUSTOMER_SERVICE'
  | 'BUSINESS'
  | 'CUSTOMER'

export type Permission =
  | 'users:read'
  | 'users:write'      // create / edit users
  | 'users:delete'
  | 'roles:assign'     // change another user's role
  | 'products:read'
  | 'products:write'
  | 'products:delete'
  | 'categories:read'
  | 'categories:write'
  | 'orders:read'      // view all orders (own orders are always visible)
  | 'orders:write'     // update status
  | 'discounts:read'
  | 'discounts:write'
  | 'pricelists:read'
  | 'pricelists:write'
  | 'settings:read'
  | 'settings:write'
  | 'bc:sync'          // trigger BC product sync

export const ROLE_META: Record<
  Role,
  { label: string; description: string; color: string }
> = {
  SUPER_ADMIN: {
    label: 'Super Admin',
    description: 'Full system access including admin account management',
    color: 'bg-red-100 text-red-700',
  },
  ADMIN: {
    label: 'Admin',
    description: 'Full access to all sections except admin management',
    color: 'bg-purple-100 text-purple-700',
  },
  MANAGER: {
    label: 'Manager',
    description: 'Products, orders, categories and discounts — no settings or user management',
    color: 'bg-blue-100 text-blue-700',
  },
  CUSTOMER_SERVICE: {
    label: 'Customer Service',
    description: 'View customers, read products, manage order status',
    color: 'bg-cyan-100 text-cyan-700',
  },
  BUSINESS: {
    label: 'Business Customer',
    description: 'Business account with custom pricing and VAT',
    color: 'bg-amber-100 text-amber-700',
  },
  CUSTOMER: {
    label: 'Customer',
    description: 'Standard customer account',
    color: 'bg-gray-100 text-gray-700',
  },
}

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    'users:read', 'users:write', 'users:delete', 'roles:assign',
    'products:read', 'products:write', 'products:delete',
    'categories:read', 'categories:write',
    'orders:read', 'orders:write',
    'discounts:read', 'discounts:write',
    'pricelists:read', 'pricelists:write',
    'settings:read', 'settings:write',
    'bc:sync',
  ],
  ADMIN: [
    'users:read', 'users:write', 'users:delete', 'roles:assign',
    'products:read', 'products:write', 'products:delete',
    'categories:read', 'categories:write',
    'orders:read', 'orders:write',
    'discounts:read', 'discounts:write',
    'pricelists:read', 'pricelists:write',
    'settings:read', 'settings:write',
    'bc:sync',
  ],
  MANAGER: [
    'products:read', 'products:write',
    'categories:read', 'categories:write',
    'orders:read', 'orders:write',
    'discounts:read', 'discounts:write',
    'pricelists:read', 'pricelists:write',
    'users:read',
    'bc:sync',
  ],
  CUSTOMER_SERVICE: [
    'users:read',
    'products:read',
    'orders:read', 'orders:write',
  ],
  BUSINESS: [],
  CUSTOMER: [],
}

/** Role hierarchy: lower number = higher privilege */
const ROLE_RANK: Record<Role, number> = {
  SUPER_ADMIN: 1,
  ADMIN: 2,
  MANAGER: 3,
  CUSTOMER_SERVICE: 4,
  BUSINESS: 5,
  CUSTOMER: 6,
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

/** Can `actorRole` assign `targetRole` to another user? */
export function canAssignRole(actorRole: Role, targetRole: Role): boolean {
  // Must be a staff role with roles:assign permission
  if (!hasPermission(actorRole, 'roles:assign')) return false
  // Cannot assign a role with higher or equal privilege than your own
  return ROLE_RANK[actorRole] < ROLE_RANK[targetRole]
}

/** Roles that `actorRole` is allowed to assign */
export function assignableRoles(actorRole: Role): Role[] {
  return (Object.keys(ROLE_RANK) as Role[]).filter((r) =>
    canAssignRole(actorRole, r)
  )
}

/** Dashboard-accessible roles (staff only) */
export const DASHBOARD_ROLES: Role[] = [
  'SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CUSTOMER_SERVICE',
]

export function canAccessDashboard(role: Role): boolean {
  return DASHBOARD_ROLES.includes(role)
}

/** Human-readable permission labels */
export const PERMISSION_LABELS: Record<Permission, string> = {
  'users:read': 'View users',
  'users:write': 'Create & edit users',
  'users:delete': 'Delete users',
  'roles:assign': 'Assign roles',
  'products:read': 'View products',
  'products:write': 'Create & edit products',
  'products:delete': 'Delete products',
  'categories:read': 'View categories',
  'categories:write': 'Manage categories',
  'orders:read': 'View all orders',
  'orders:write': 'Update order status',
  'discounts:read': 'View discounts',
  'discounts:write': 'Manage discounts',
  'pricelists:read': 'View price lists',
  'pricelists:write': 'Manage price lists',
  'settings:read': 'View settings',
  'settings:write': 'Edit settings',
  'bc:sync': 'Business Central sync',
}
