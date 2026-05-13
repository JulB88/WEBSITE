import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
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
    const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : ''

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const role = accountType === 'business' ? 'BUSINESS' : 'CUSTOMER'

    const isEntrepreneur = accountType === 'business' && companyName?.trim()

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        ...(isEntrepreneur
          ? {
              businessCustomer: {
                create: {
                  companyName: companyName.trim(),
                  vatNumber: vatNumber?.trim() || null,
                  customerNo: customerNo?.trim() || null,
                  // accountRequestType only relevant when no customerNo
                  accountRequestType: !customerNo?.trim()
                    ? (accountRequestType ?? 'new_request')
                    : null,
                  discountPercent: 0,
                },
              },
            }
          : {}),
      },
    })

    return NextResponse.json(
      { message: 'Account created successfully', userId: user.id },
      { status: 201 }
    )
  } catch (err: any) {
    console.error('[register]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
