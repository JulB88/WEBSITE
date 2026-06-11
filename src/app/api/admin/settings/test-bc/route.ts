import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SettingsService } from '@/lib/services'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session || !['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // Single query — secrets auto-decrypted by SettingsService
    const settings = await SettingsService.getMany([
      'bc_tenant_id', 'bc_client_id', 'bc_client_secret', 'bc_environment', 'bc_company_id',
    ])
    const { bc_tenant_id: tenantId, bc_client_id: clientId, bc_client_secret: clientSecret, bc_environment: environment, bc_company_id: companyId } = settings

    if (!tenantId || !clientId || !clientSecret) {
      return NextResponse.json({ ok: false, message: 'Tenant ID, Client ID et Client Secret sont requis.' })
    }

    // Get OAuth2 token
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type:    'client_credentials',
          client_id:     clientId,
          client_secret: clientSecret,
          scope:         'https://api.businesscentral.dynamics.com/.default',
        }),
        signal: AbortSignal.timeout(10_000),
      }
    )

    if (!tokenRes.ok) {
      const err = await tokenRes.json().catch(() => ({}))
      return NextResponse.json({ ok: false, message: (err as any).error_description || 'Authentification échouée.' })
    }

    const { access_token } = await tokenRes.json()

    // Verify company access if companyId is configured
    if (companyId && environment) {
      const bcBase   = `https://api.businesscentral.dynamics.com/v2.0/${tenantId}/${environment}/api/v2.0`
      const compRes  = await fetch(`${bcBase}/companies(${companyId})`, {
        headers: { Authorization: `Bearer ${access_token}` },
        signal:  AbortSignal.timeout(10_000),
      })
      if (compRes.ok) {
        const company = await compRes.json()
        return NextResponse.json({ ok: true, message: `Connecté ✓  Entreprise : ${company.displayName}` })
      }
    }

    return NextResponse.json({ ok: true, message: 'Connecté ✓  (token OAuth obtenu avec succès)' })
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message || 'Connexion échouée.' })
  }
}
