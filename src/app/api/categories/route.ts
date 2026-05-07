import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const categories = await prisma.category.findMany({
    select: { id: true, name: true, nameEn: true, slug: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(categories)
}
