import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { createBCClient } from '@/lib/businesscentral'
import { rateLimit, getClientIp, rateLimitKey } from '@/lib/rate-limit'

// Defense-in-depth rate limit (middleware already limits to 5/hour globally)
const ROUTE_LIMIT  = 5
const ROUTE_WINDOW = 60 * 60_000 // 1 hour

// RFC 5322-inspired email regex (pragmatic, covers 99.9% of real emails)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export async function POST(req: NextRequest) {
  try {
    // ── Rate limit ──────────────────────────────────────────────────────────
    const ip = getClientIp(req)
    const rl = rateLimit(rateLimitKey(ip, 'register-route'), ROUTE_LIMIT, ROUTE_WINDOW)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Trop de tentatives de création de compte. Réessayez dans une heure.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      )
    }

    const body = await req.json()
    const {
      name,
      password,
      accountType,
      companyName,
      vatNumber,
      customerNo,
      accountRequestType,
    } = body

    // ── Input validation ────────────────────────────────────────────────────
    const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : ''

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Le nom est requis.' }, { status: 400 })
    }
    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Adresse courriel invalide.' }, { status: 400 })
    }
    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Le mot de passe est requis.' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' }, { status: 400 })
    }
    // Basic complexity: at least one letter and one digit
    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins une lettre et un chiffre.' },
        { status: 400 }
      )
    }

    // ── Duplicate check ─────────────────────────────────────────────────────
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Un compte avec ce courriel existe déjà.' }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const role           = accountType === 'business' ? 'BUSINESS' : 'CUSTOMER'
    const isEntrepreneur = accountType === 'business' && typeof companyName === 'string' && companyName.trim()

    let resolvedCustomerNo: string | null = typeof customerNo === 'string' ? customerNo.trim() || null : null
    const isNewRequest = !resolvedCustomerNo && accountRequestType !== 'existing_unknown'

    // ── Create user ─────────────────────────────────────────────────────────
    const user = await prisma.user.create({
      data: {
        name:  name.trim(),
        email,
        password: hashedPassword,
        role,
        ...(isEntrepreneur
          ? {
              businessCustomer: {
                create: {
                  companyName:       (companyName as string).trim(),
                  vatNumber:         typeof vatNumber === 'string' ? vatNumber.trim() || null : null,
                  customerNo:        resolvedCustomerNo,
                  accountRequestType: !resolvedCustomerNo ? (accountRequestType ?? 'new_request') : null,
                  discountPercent:   0,
                },
              },
            }
          : {}),
      },
      include: { businessCustomer: true },
    })

    // ── BC customer sync (non-blocking) ─────────────────────────────────────
    if (isEntrepreneur && isNewRequest && user.businessCustomer) {
      syncNewCustomerToBC({
        businessCustomerId: user.businessCustomer.id,
        companyName:        (companyName as string).trim(),
        email,
        vatNumber:          typeof vatNumber === 'string' ? vatNumber.trim() || null : null,
      }).catch((err) => console.error('[register] BC customer sync failed (non-fatal):', err))
    }

    return NextResponse.json(
      { message: 'Compte créé avec succès.', userId: user.id },
      { status: 201 }
    )
  } catch (err: any) {
    console.error('[register]', err)
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 })
  }
}

// ─── Background BC sync ───────────────────────────────────────────────────────

async function syncNewCustomerToBC(data: {
  businessCustomerId: string
  companyName: string
  email: string
  vatNumber: string | null
}) {
  try {
    const bc = await createBCClient()

    // Check if a BC customer with this email already exists
    const existing = await bc.findCustomerByEmail(data.email)
    if (existing) {
      await prisma.businessCustomer.update({
        where: { id: data.businessCustomerId },
        data:  { customerNo: existing.number },
      })
      return
    }

    // Create new BC customer
    const created = await bc.createCustomer({
      displayName:            data.companyName,
      email:                  data.email,
      taxRegistrationNumber:  data.vatNumber ?? undefined,
    })

    await prisma.businessCustomer.update({
      where: { id: data.businessCustomerId },
      data:  { customerNo: created.number },
    })

    console.log(`[register] BC customer ${created.number} created for ${data.email}`)
  } catch (err) {
    console.error('[register] syncNewCustomerToBC error:', err)
    throw err
  }
}
