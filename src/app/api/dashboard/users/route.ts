import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import { hasPermission, canAssignRole, assignableRoles } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'
import bcrypt from 'bcryptjs'

const secret = process.env.NEXTAUTH_SECRET

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  emailVerified: true,
  createdAt: true,
  updatedAt: true,
  businessCustomer: {
    select: {
      id: true,
      companyName: true,
      vatNumber: true,
      discountPercent: true,
      priceListId: true,
    },
  },
  _count: { select: { orders: true } },
} as const

// GET /api/dashboard/users — list users with pagination + search
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const actorRole = token.role as Role
  if (!hasPermission(actorRole, 'users:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20')))
  const search = searchParams.get('search') ?? ''
  const roleFilter = searchParams.get('role') ?? ''

  const where: any = {}
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (roleFilter) where.role = roleFilter

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: USER_SELECT,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ])

  return NextResponse.json({
    users,
    total,
    page,
    pages: Math.ceil(total / limit),
    assignableRoles: assignableRoles(actorRole),
  })
}

// POST /api/dashboard/users — create user
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const actorRole = token.role as Role
  if (!hasPermission(actorRole, 'users:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { email, name, password, role } = body

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  const targetRole: Role = role ?? 'CUSTOMER'
  if (!canAssignRole(actorRole, targetRole)) {
    return NextResponse.json({ error: 'Cannot assign that role' }, { status: 403 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: 'Email already in use' }, { status: 409 })

  const hashed = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { email, name: name ?? null, password: hashed, role: targetRole },
    select: USER_SELECT,
  })

  return NextResponse.json(user, { status: 201 })
}
