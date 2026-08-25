import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

// How often (ms) to refresh role/businessCustomerId from DB.
// Keeps revoked roles from persisting until token expiry.
const ROLE_REFRESH_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  // Passed through rather than validated at module scope: `next build` evaluates
  // this module while collecting page data, before any deployment env exists, so
  // an eager throw fails the build. NextAuth itself raises `MissingSecret` at
  // request time in production when this is undefined.
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: '/auth/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
          include: { businessCustomer: { select: { id: true } } },
        })

        if (!user || !user.password) {
          // Constant-time comparison to prevent email enumeration
          await bcrypt.compare('dummy', '$2a$12$dummyhashtopreventtimingattack00000000000000000000000000')
          throw new Error('Invalid email or password')
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)
        if (!isPasswordValid) {
          throw new Error('Invalid email or password')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          businessCustomerId: user.businessCustomer?.id ?? null,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      // On initial sign-in, populate token from the authorize() return value
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.businessCustomerId = (user as any).businessCustomerId
        token.roleLastChecked = Date.now()
      }

      // Periodically re-fetch role from DB so revoked access takes effect quickly
      const lastChecked = (token.roleLastChecked as number) ?? 0
      if (trigger !== 'signIn' && Date.now() - lastChecked > ROLE_REFRESH_INTERVAL_MS) {
        try {
          const fresh = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: {
              role: true,
              businessCustomer: { select: { id: true } },
            },
          })
          if (fresh) {
            token.role = fresh.role
            token.businessCustomerId = fresh.businessCustomer?.id ?? null
            token.roleLastChecked = Date.now()
          }
        } catch {
          // DB unavailable — keep stale token; will retry next request
        }
      }

      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.businessCustomerId = (token.businessCustomerId as string | null) ?? null
      }
      return session
    },
  },
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      role: string
      businessCustomerId: string | null
    }
  }
}
