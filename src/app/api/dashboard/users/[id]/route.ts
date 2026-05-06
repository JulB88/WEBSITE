import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import { hasPermission, canAssignRole } from '@/lib/permissions'
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

// GET /api/dashboard/users/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const token = await getToken({ req, secret })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(token.role as Role, 'users:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: USER_SELECT,
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(user)
}

// PATCH /api/dashboard/users/[id] — edit name, email, role, password, businessCustomer
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const token = await getToken({ req, secret })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const actorRole = token.role as Role
  if (!hasPermission(actorRole, 'users:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { name, email, role, password, companyName, vatNumber, discountPercent, priceListId } = body

  const existing = await prisma.user.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Role change — privilege escalation check
  if (role && role !== existing.role) {
    const targetRole = role as Role
    if (!canAssignRole(actorRole, targetRole)) {
      return NextResponse.json({ error: 'Cannot assign that role' }, { status: 403 })
    }
  }

  const userUpdate: any = {}
  if (name !== undefined) userUpdate.name = name
  if (email !== undefined) userUpdate.email = email
  if (role !== undefined) userUpdate.role = role
  if (password) userUpdate.password = await bcrypt.hash(password, 12)

  // Business customer upsert (only for BUSINESS role)
  const finalRole = role ?? existing.role
  if (finalRole === 'BUSINESS' && (companyName !== undefined || vatNumber !== undefined || discountPercent !== undefined || priceListId !== undefined)) {
    userUpdate.businessCustomer = {
      upsert: {
        create: {
          companyName: companyName ?? '',
          vatNumber: vatNumber ?? null,
          discountPercent: discountPercent ?? 0,
          priceListId: priceListId ?? null,
        },
        update: {
          ...(companyName !== undefined && { companyName }),
          ...(vatNumber !== undefined && { vatNumber }),
          ...(discountPercent !== undefined && { discountPercent }),
          ...(priceListId !== undefined && { priceListId }),
        },
      },
    }
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data: userUpdate,
    select: {
      id: true, email: true, name: true, role: true,
      businessCustomer: { select: { id: true, companyName: true, vatNumber: true, discountPercent: true, priceListId: true } },
    },
  })

  return NextResponse.json(user)
}

// DELETE /api/dashboard/users/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const token = await getToken({ req, secret })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const actorRole = token.role as Role
  if (!hasPermission(actorRole, 'users:delete')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Prevent self-deletion
  if (params.id === token.sub) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  }

  await prisma.user.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
