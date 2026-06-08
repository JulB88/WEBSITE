import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { OrderService } from '@/lib/services'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const results = await OrderService.syncStatusesFromBC()
    return NextResponse.json({
      message: `Sync complete: ${results.updated} status updates, ${results.retried} orders pushed to BC, ${results.errors} errors`,
      ...results,
    })
  } catch (err: any) {
    console.error('[sync-orders]', err)
    return NextResponse.json({ error: err.message || 'Sync failed' }, { status: 500 })
  }
}
