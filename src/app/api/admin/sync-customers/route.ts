import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CustomerService } from '@/lib/services'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const results = await CustomerService.syncAllToBC()
    return NextResponse.json({
      message: `Customer sync: ${results.synced} synced, ${results.errors} errors`,
      ...results,
    })
  } catch (err: any) {
    console.error('[sync-customers]', err)
    return NextResponse.json({ error: err.message || 'Sync failed' }, { status: 500 })
  }
}
