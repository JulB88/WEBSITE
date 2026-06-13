import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = 8 * 1024 * 1024 // 8 MB

// POST /api/upload/product-image
// Form fields: file (File), bcItemNo (string)
// Image is saved as public/uploads/products/{sanitized_bcItemNo}.{ext}
// so the filename follows the item number across any BC sync.
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(token.role as Role, 'products:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const bcItemNo = (formData.get('bcItemNo') as string | null)?.trim()

  if (!file || !bcItemNo) {
    return NextResponse.json({ error: 'file and bcItemNo are required' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Type de fichier non supporté. Utilisez JPG, PNG, WebP ou GIF.' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Fichier trop volumineux (max 8 Mo).' }, { status: 400 })
  }

  const product = await prisma.product.findUnique({ where: { bcItemNo } })
  if (!product) return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })

  // Filename derived from bcItemNo — survives BC syncs
  const safeItemNo = bcItemNo.replace(/[^a-zA-Z0-9\-_]/g, '_')
  const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
  const filename = `${safeItemNo}.${ext}`

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products')

  try {
    await mkdir(uploadDir, { recursive: true })
    const bytes = await file.arrayBuffer()
    await writeFile(path.join(uploadDir, filename), Buffer.from(bytes))
  } catch (err: any) {
    // Vercel serverless: filesystem en lecture seule (EROFS) — l'upload local
    // ne fonctionne qu'en self-hosted. Utiliser un stockage objet (Vercel Blob,
    // S3) pour la production. En attendant : message clair au lieu d'un 500 opaque.
    if (err?.code === 'EROFS' || err?.code === 'EACCES') {
      return NextResponse.json(
        { error: "L'upload de fichiers n'est pas disponible sur cet hébergement. Utilisez une URL d'image externe (champ imageUrl du produit)." },
        { status: 501 }
      )
    }
    throw err
  }

  const imageUrl = `/uploads/products/${filename}`

  await prisma.product.update({ where: { bcItemNo }, data: { imageUrl } })

  return NextResponse.json({ imageUrl })
}
