import { prisma } from './prisma'

export interface CartItem {
  id: string
  quantity: number
}

export interface LineItem {
  productId: string
  quantity: number
  unitPrice: number
  name: string
  bcItemNo: string
}

export interface PricingResult {
  lineItems: LineItem[]
  total: number
  totalCents: number
}

/**
 * Price resolution order (most specific wins):
 * 1. PriceListItem.overridePrice (product-level override for a price list)
 * 2. CategoryDiscount scoped to the customer's price list, on the product's sub-category
 * 3. CategoryDiscount scoped to the customer's price list, on the parent category
 * 4. CategoryDiscount with null priceListId (applies to all), on sub-category
 * 5. CategoryDiscount with null priceListId (applies to all), on parent category
 * 6. PriceList.discountPercent (global % off everything in this list)
 * 7. BusinessCustomer.discountPercent (direct customer discount)
 * 8. Full price
 */
export async function computeOrderTotal(
  items: CartItem[],
  businessCustomerId: string | null | undefined
): Promise<PricingResult> {
  if (!items.length) throw new Error('Cart is empty')

  const productIds = items.map((i) => i.id)

  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, active: true },
    include: {
      productCategory: {
        include: { parent: true },
      },
    },
  })

  if (products.length !== productIds.length) {
    const missing = productIds.filter((id) => !products.find((p) => p.id === id))
    throw new Error(`Product(s) not found or unavailable: ${missing.join(', ')}`)
  }

  const productMap = new Map(products.map((p) => [p.id, p]))

  // Fetch business pricing context once
  let priceListId: string | null = null
  let priceListDiscount = 0
  let customerDiscount = 0
  const overridePrices = new Map<string, number>() // productId → price

  if (businessCustomerId) {
    const bc = await prisma.businessCustomer.findUnique({
      where: { id: businessCustomerId },
      include: {
        priceList: {
          include: { priceListItems: true },
        },
      },
    })

    if (bc) {
      customerDiscount = bc.discountPercent
      if (bc.priceList) {
        priceListId = bc.priceList.id
        priceListDiscount = bc.priceList.discountPercent
        for (const pli of bc.priceList.priceListItems) {
          if (pli.overridePrice != null) {
            overridePrices.set(pli.productId, pli.overridePrice)
          }
        }
      }
    }
  }

  // Collect all category IDs we need to check for discounts
  const categoryIds = new Set<string>()
  for (const p of products) {
    if (p.categoryId) categoryIds.add(p.categoryId)
    if (p.productCategory?.parentId) categoryIds.add(p.productCategory.parentId)
  }

  // Fetch all relevant category discounts in one query
  const categoryDiscounts = categoryIds.size > 0
    ? await prisma.categoryDiscount.findMany({
        where: {
          categoryId: { in: [...categoryIds] },
          OR: [
            { priceListId },
            { priceListId: null },
          ],
        },
      })
    : []

  // Index: categoryId → { scoped: discount%, global: discount% }
  const catDiscountMap = new Map<string, { scoped?: number; global?: number }>()
  for (const cd of categoryDiscounts) {
    const existing = catDiscountMap.get(cd.categoryId) ?? {}
    if (cd.priceListId === priceListId && priceListId !== null) {
      existing.scoped = cd.discountPercent
    } else if (cd.priceListId === null) {
      existing.global = cd.discountPercent
    }
    catDiscountMap.set(cd.categoryId, existing)
  }

  function resolveDiscount(product: (typeof products)[0]): number {
    const subCatId = product.categoryId
    const parentCatId = product.productCategory?.parentId ?? null

    const lookup = (catId: string | null) => catId ? catDiscountMap.get(catId) : undefined

    // Steps 2–5: category discounts (scoped beats global, sub-category beats parent)
    for (const catId of [subCatId, parentCatId]) {
      const entry = lookup(catId)
      if (!entry) continue
      if (entry.scoped !== undefined) return entry.scoped
      if (entry.global !== undefined) return entry.global
    }

    // Step 6: price list global %
    if (priceListDiscount > 0) return priceListDiscount

    // Step 7: customer direct %
    if (customerDiscount > 0) return customerDiscount

    return 0
  }

  const lineItems: LineItem[] = items.map((item) => {
    const product = productMap.get(item.id)!

    let unitPrice: number

    // Step 1: product-level price list override
    if (overridePrices.has(item.id)) {
      unitPrice = overridePrices.get(item.id)!
    } else {
      const discount = resolveDiscount(product)
      unitPrice = product.price * (1 - discount / 100)
    }

    unitPrice = Math.round(unitPrice * 100) / 100

    return {
      productId: item.id,
      quantity: item.quantity,
      unitPrice,
      name: product.name,
      bcItemNo: product.bcItemNo,
    }
  })

  const total = Math.round(lineItems.reduce((s, li) => s + li.unitPrice * li.quantity, 0) * 100) / 100

  return { lineItems, total, totalCents: Math.round(total * 100) }
}
