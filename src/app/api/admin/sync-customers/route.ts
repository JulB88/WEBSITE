import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createBCClient } from '@/lib/businesscentral'

/**
 * POST /api/admin/sync-customers
 * For each business customer without a BC customer number, look up or create in BC.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const bc = await createBCClient()

    const businessCustomers = await prisma.businessCustomer.findMany({
      where: { customerNo: null },
      include: { user: { select: { name: true, email: true } } },
      take: 50,
    })

    const results = { synced: 0, errors: 0 }

    for (const bizCustomer of businessCustomers) {
      try {
        const email = bizCustomer.user.email

        // Look up by email first
        const existing = await bc.findCustomerByEmail(email)
        if (existing) {
          await prisma.businessCustomer.update({
            where: { id: bizCustomer.id },
            data: { customerNo: existing.number },
          })
          results.synced++
          continue
        }

        // Create new BC customer
        const created = await bc.createCustomer({
          displayName: bizCustomer.companyName,
          email,
          taxRegistrationNumber: bizCustomer.vatNumber ?? undefined,
        })

        await prisma.businessCustomer.update({
          where: { id: bizCustomer.id },
          data: { customerNo: created.number },
        })

        results.synced++
      } catch (err) {
        console.error(`[sync-customers] Failed for ${bizCustomer.id}:`, err)
        results.errors++
      }
    }

    return NextResponse.json({
      message: `Customer sync complete: ${results.synced} synced, ${results.errors} errors`,
      ...results,
    })
  } catch (err: any) {
    console.error('[sync-customers]', err)
    return NextResponse.json({ error: err.message || 'Sync failed' }, { status: 500 })
  }
}
