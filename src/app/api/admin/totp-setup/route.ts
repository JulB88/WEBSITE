import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SettingsService } from '@/lib/services'
import { generateSecret, verifySync } from 'otplib'
import QRCode from 'qrcode'

const ISSUER  = 'DSF Distribution'
const ACCOUNT = 'DSF'

function buildOtpAuthUrl(secret: string): string {
  const label = encodeURIComponent(`${ISSUER}:${ACCOUNT}`)
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(ISSUER)}&algorithm=SHA1&digits=6&period=30`
}

// GET — return whether TOTP is configured (+ QR code if so)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // SettingsService.get decrypts the secret automatically
  const totpSecret = await SettingsService.get('site_totp_secret')
  if (!totpSecret) {
    return NextResponse.json({ configured: false })
  }

  const qrDataUrl = await QRCode.toDataURL(buildOtpAuthUrl(totpSecret))
  return NextResponse.json({ configured: true, qrDataUrl })
}

// POST — generate or confirm TOTP setup
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))

  // Step 1: generate a new secret + QR code (not saved yet)
  if (body.action === 'generate') {
    const secret    = generateSecret()
    const qrDataUrl = await QRCode.toDataURL(buildOtpAuthUrl(secret))
    // Return plain secret for QR display — it will be encrypted when saved (step 2)
    return NextResponse.json({ secret, qrDataUrl })
  }

  // Step 2: verify code then save (SettingsService.set encrypts automatically)
  if (body.action === 'confirm') {
    const { secret, code } = body
    if (!secret || !code) {
      return NextResponse.json({ error: 'secret et code sont requis' }, { status: 400 })
    }

    const isValid = verifySync({ token: String(code).replace(/\s/g, ''), secret })
    if (!isValid) {
      return NextResponse.json({ ok: false, error: "Code incorrect — réessaie avec le code actuel de l'appli." })
    }

    // Encrypted automatically by SettingsService.set (site_totp_secret is a SECRET_KEY)
    await SettingsService.set('site_totp_secret', secret)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'action invalide' }, { status: 400 })
}
