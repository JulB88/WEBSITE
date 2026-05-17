import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function getSetting(key: string, envFallback: string) {
  const row = await prisma.setting.findUnique({ where: { key } })
  return row?.value || process.env[envFallback] || ''
}

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session || !['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const tenantId    = await getSetting('bc_tenant_id',    'BC_TENANT_ID')
    const clientId    = await getSetting('bc_client_id',    'BC_CLIENT_ID')
    const clientSecret = await getSetting('bc_client_secret', 'BC_CLIENT_SECRET')
    const environment = await getSetting('bc_environment',  'BC_ENVIRONMENT')
    const companyId   = await getSetting('bc_company_id',   'BC_COMPANY_ID')

    if (!tenantId || !clientId || !clientSecret) {
      return NextResponse.json({ ok: false, message: 'Tenant ID, Client ID and Client Secret are required.' })
    }

    // Get OAuth2 token
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
          scope: 'https://api.businesscentral.dynamics.com/.default',
        }),
      }
    )

    if (!tokenRes.ok) {
      const err = await tokenRes.json()
      return NextResponse.json({ ok: false, message: err.error_description || 'Authentication failed' })
    }

    const { access_token } = await tokenRes.json()

    // If we have a company ID, try to fetch company info
    if (companyId) {
      const bcBase = `https://api.businesscentral.dynamics.com/v2.0/${tenantId}/${environment}/api/v2.0`
      const compRes = await fetch(`${bcBase}/companies/${companyId}`, {
        headers: { Authorization: `Bearer ${access_token}` },
      })
      if (compRes.ok) {
        const company = await compRes.json()
        return NextResponse.json({ ok: true, message: `Connected ✓  Company: ${company.displayName}` })
      }
    }

    return NextResponse.json({ ok: true, message: 'Connected ✓  (token obtained successfully)' })
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message || 'Connection failed' })
  }
}
