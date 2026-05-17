import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createBCClient } from '@/lib/businesscentral'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const bc = await createBCClient()
    const syncedCount = await bc.syncProductsToDb()

    return NextResponse.json({ message: `Synced ${syncedCount} products from Business Central`, count: syncedCount })
  } catch (err: any) {
    console.error('[sync-bc]', err)
    return NextResponse.json({ error: err.message || 'Sync failed' }, { status: 500 })
  }
}
