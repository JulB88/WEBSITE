import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'

const secret = process.env.NEXTAUTH_SECRET

// PATCH /api/dashboard/products — bulk actions on selected product IDs
// body: { ids: string[], action: 'activate' | 'deactivate' | 'set-category', categoryId?: string }
export async function PATCH(req: NextRequest) {
  const token = await getToken({ req, secret })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(token.role as Role, 'products:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { ids, action, categoryId } = body

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 })
  }
  if (!['activate', 'deactivate', 'set-category'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  let data: Record<string, any> = {}
  if (action === 'activate') data = { active: true }
  if (action === 'deactivate') data = { active: false }
  if (action === 'set-category') data = { categoryId: categoryId || null }

  const result = await prisma.product.updateMany({
    where: { id: { in: ids } },
    data,
  })

  return NextResponse.json({ updated: result.count })
}
