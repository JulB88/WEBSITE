import type { ProductStatus } from '@prisma/client'

interface ProductFields {
  name?: string | null
  categoryId?: string | null
  price?: number | null
  description?: string | null
}

/**
 * Computes the correct status for a product.
 * If any required field is missing → DRAFT (auto, non-negotiable).
 * Otherwise, respect the user's intent (ACTIVE or INACTIVE).
 *
 * Required for non-draft: name, categoryId, price > 0, description.
 * Image is NOT required for active, but IS required for "complete".
 */
export function computeProductStatus(
  fields: ProductFields,
  intent: 'ACTIVE' | 'INACTIVE' = 'ACTIVE'
): ProductStatus {
  const missing =
    !fields.name?.trim() ||
    !fields.categoryId ||
    !(fields.price != null && Number(fields.price) > 0) ||
    !fields.description?.trim()

  if (missing) return 'DRAFT'
  return intent
}

/**
 * Completeness level:
 * - DRAFT   → missing at least one required field
 * - PARTIAL → all required fields present, but no image
 * - COMPLETE → all required fields + image
 */
export type Completeness = 'DRAFT' | 'PARTIAL' | 'COMPLETE'

export function getCompleteness(p: {
  status: string
  imageUrl?: string | null
}): Completeness {
  if (p.status === 'DRAFT') return 'DRAFT'
  return p.imageUrl ? 'COMPLETE' : 'PARTIAL'
}
