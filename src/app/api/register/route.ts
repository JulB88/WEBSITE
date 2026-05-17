import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { createBCClient } from '@/lib/businesscentral'

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

    // If the user supplied their existing BC customer number, verify it
    let resolvedCustomerNo: string | null = customerNo?.trim() || null
    const isNewRequest = !resolvedCustomerNo && accountRequestType !== 'existing_unknown'

    // Create the user record
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
                  customerNo: resolvedCustomerNo,
                  accountRequestType: !resolvedCustomerNo
                    ? (accountRequestType ?? 'new_request')
                    : null,
                  discountPercent: 0,
                },
              },
            }
          : {}),
      },
      include: { businessCustomer: true },
    })

    // Auto-create BC customer for new business accounts that don't have a BC customer number yet
    if (isEntrepreneur && isNewRequest && user.businessCustomer) {
      syncNewCustomerToBC({
        businessCustomerId: user.businessCustomer.id,
        companyName: companyName.trim(),
        email,
        vatNumber: vatNumber?.trim() || null,
      }).catch((err) => console.error('[register] BC customer sync failed (non-fatal):', err))
    }

    return NextResponse.json(
      { message: 'Account created successfully', userId: user.id },
      { status: 201 }
    )
  } catch (err: any) {
    console.error('[register]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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
        data: { customerNo: existing.number },
      })
      return
    }

    // Create new BC customer
    const created = await bc.createCustomer({
      displayName: data.companyName,
      email: data.email,
      taxRegistrationNumber: data.vatNumber ?? undefined,
    })

    await prisma.businessCustomer.update({
      where: { id: data.businessCustomerId },
      data: { customerNo: created.number },
    })

    console.log(`[register] BC customer ${created.number} created for ${data.email}`)
  } catch (err) {
    console.error('[register] syncNewCustomerToBC error:', err)
    throw err
  }
}
