import { prisma } from './prisma'
import { SettingsService } from './services'

// ─── BC API types ─────────────────────────────────────────────────────────────

interface BCItem {
  id: string
  number: string
  displayName: string
  description?: string
  unitPrice: number
  inventory: number
  itemCategoryCode?: string
  picture?: string
}

export interface BCCustomer {
  id: string
  number: string
  displayName: string
  email?: string
  phoneNumber?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  taxRegistrationNumber?: string
  type?: string
}

interface BCOrderLine {
  itemNumber?: string
  description: string
  quantity: number
  unitPrice: number
  lineType?: 'Item' | 'Account' | 'Resource'
}

interface BCOrderInput {
  customerNumber: string
  orderDate: string
  externalDocumentNumber?: string
  requestedDeliveryDate?: string
  salesLines: BCOrderLine[]
}

export interface BCSalesOrder {
  id: string
  number: string
  orderDate: string
  status: 'Draft' | 'Open' | 'Released' | 'Cancelled'
  shipmentStatus?: 'Nothing Shipped' | 'Partially Shipped' | 'Fully Shipped'
  customerNumber: string
  externalDocumentNumber?: string
  totalAmountIncludingTax?: number
}

// ─── Client ──────────────────────────────────────────────────────────────────

// ─── Global token cache ───────────────────────────────────────────────────────
// In serverless (Vercel), each invocation can create a new class instance,
// which would discard the instance-level token cache and refetch OAuth on every
// request. Storing the token in globalThis makes it survive warm instance reuse.

interface CachedToken {
  value: string
  expiresAt: number
  clientId: string // invalidate when credentials change
}
const _globalBC = globalThis as unknown as { _bcTokenCache?: CachedToken }

export class BusinessCentralClient {
  private tenantId: string
  private clientId: string
  private clientSecret: string
  private environment: string
  private companyId: string

  constructor(
    tenantId: string,
    clientId: string,
    clientSecret: string,
    environment: string,
    companyId: string
  ) {
    this.tenantId     = tenantId
    this.clientId     = clientId
    this.clientSecret = clientSecret
    this.environment  = environment
    this.companyId    = companyId
  }

  async getAccessToken(): Promise<string> {
    const cached = _globalBC._bcTokenCache
    // Valid if: not expired AND belongs to the current clientId (invalidates on credential change)
    if (cached && cached.clientId === this.clientId && Date.now() < cached.expiresAt) {
      return cached.value
    }

    const response = await fetch(
      `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type:    'client_credentials',
          client_id:     this.clientId,
          client_secret: this.clientSecret,
          scope:         'https://api.businesscentral.dynamics.com/.default',
        }),
        signal: AbortSignal.timeout(10_000),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to get BC access token: ${await response.text()}`)
    }

    const data = await response.json()
    _globalBC._bcTokenCache = {
      value:     data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000,
      clientId:  this.clientId,
    }
    return _globalBC._bcTokenCache.value
  }

  private get baseUrl(): string {
    return `https://api.businesscentral.dynamics.com/v2.0/${this.tenantId}/${this.environment}/api/v2.0/companies(${this.companyId})`
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getAccessToken()

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options.headers || {}),
      },
      signal: AbortSignal.timeout(15_000),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`BC API ${response.status} on ${path}: ${body}`)
    }

    if (response.status === 204) return {} as T
    return response.json()
  }

  // ─── Items ─────────────────────────────────────────────────────────────────

  async fetchItems(): Promise<BCItem[]> {
    const allItems: BCItem[] = []
    let url = '/items?$top=1000'

    while (url) {
      const data = await this.request<{ value: BCItem[]; '@odata.nextLink'?: string }>(url)
      allItems.push(...data.value)
      const next = data['@odata.nextLink']
      url = next ? next.replace(/^.*\/api\/v2\.0\/companies\([^)]+\)/, '') : ''
    }

    return allItems
  }

  async fetchItem(itemNo: string): Promise<BCItem> {
    if (!/^[\w\-. ]+$/.test(itemNo)) throw new Error(`Invalid item number: ${itemNo}`)
    const escaped = itemNo.replace(/'/g, "''")
    const data = await this.request<{ value: BCItem[] }>(
      `/items?$filter=number eq '${escaped}'`
    )
    if (!data.value?.length) throw new Error(`Item ${itemNo} not found in Business Central`)
    return data.value[0]
  }

  // ─── Customers ─────────────────────────────────────────────────────────────

  async fetchCustomers(): Promise<BCCustomer[]> {
    const data = await this.request<{ value: BCCustomer[] }>('/customers?$top=1000')
    return data.value || []
  }

  async getCustomerByNumber(customerNo: string): Promise<BCCustomer | null> {
    const escaped = customerNo.replace(/'/g, "''")
    const data = await this.request<{ value: BCCustomer[] }>(
      `/customers?$filter=number eq '${escaped}'`
    )
    return data.value?.[0] ?? null
  }

  async findCustomerByEmail(email: string): Promise<BCCustomer | null> {
    const escaped = email.replace(/'/g, "''").toLowerCase()
    try {
      const data = await this.request<{ value: BCCustomer[] }>(
        `/customers?$filter=tolower(email) eq '${escaped}'`
      )
      return data.value?.[0] ?? null
    } catch {
      return null
    }
  }

  async createCustomer(data: {
    displayName: string
    email?: string
    phoneNumber?: string
    taxRegistrationNumber?: string
    addressLine1?: string
    city?: string
    postalCode?: string
    country?: string
  }): Promise<BCCustomer> {
    return this.request<BCCustomer>('/customers', {
      method: 'POST',
      body: JSON.stringify({
        displayName: data.displayName,
        ...(data.email ? { email: data.email } : {}),
        ...(data.phoneNumber ? { phoneNumber: data.phoneNumber } : {}),
        ...(data.taxRegistrationNumber ? { taxRegistrationNumber: data.taxRegistrationNumber } : {}),
        ...(data.addressLine1 ? { addressLine1: data.addressLine1 } : {}),
        ...(data.city ? { city: data.city } : {}),
        ...(data.postalCode ? { postalCode: data.postalCode } : {}),
        ...(data.country ? { country: data.country } : {}),
      }),
    })
  }

  // ─── Sales Orders ──────────────────────────────────────────────────────────

  async createSalesOrder(orderData: BCOrderInput): Promise<BCSalesOrder> {
    const order = await this.request<BCSalesOrder>('/salesOrders', {
      method: 'POST',
      body: JSON.stringify({
        customerNumber: orderData.customerNumber,
        orderDate: orderData.orderDate,
        ...(orderData.externalDocumentNumber
          ? { externalDocumentNumber: orderData.externalDocumentNumber }
          : {}),
        ...(orderData.requestedDeliveryDate
          ? { requestedDeliveryDate: orderData.requestedDeliveryDate }
          : {}),
      }),
    })

    // Add lines sequentially — BC requires this
    for (const line of orderData.salesLines) {
      await this.request(`/salesOrders(${order.id})/salesOrderLines`, {
        method: 'POST',
        body: JSON.stringify({
          lineType: line.lineType ?? 'Item',
          itemNumber: line.itemNumber,
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        }),
      })
    }

    return order
  }

  async getSalesOrder(bcOrderId: string): Promise<BCSalesOrder | null> {
    try {
      return await this.request<BCSalesOrder>(`/salesOrders(${bcOrderId})`)
    } catch {
      return null
    }
  }

  async fetchRecentSalesOrders(top = 200): Promise<BCSalesOrder[]> {
    const data = await this.request<{ value: BCSalesOrder[] }>(
      `/salesOrders?$top=${top}&$orderby=orderDate desc`
    )
    return data.value || []
  }

  // ─── Journal général (export d'écritures comptables) ─────────────────────────

  async listJournals(): Promise<{ id: string; code: string; displayName: string }[]> {
    const data = await this.request<{ value: { id: string; code: string; displayName: string }[] }>('/journals')
    return data.value || []
  }

  /** Trouve un journal par code (ex. "GENERAL") ; retourne le 1er si code absent. */
  async findJournal(code?: string): Promise<{ id: string; code: string; displayName: string } | null> {
    const journals = await this.listJournals()
    if (journals.length === 0) return null
    if (code) {
      const match = journals.find((j) => j.code.toUpperCase() === code.toUpperCase())
      if (match) return match
    }
    return journals[0]
  }

  /** Crée une ligne d'écriture dans un journal BC. amount signé (+ = débit, − = crédit). */
  async createJournalLine(journalId: string, line: {
    accountNumber: string; postingDate: string; documentNumber: string; description: string; amount: number
  }): Promise<unknown> {
    return this.request(`/journals(${journalId})/journalLines`, {
      method: 'POST',
      body: JSON.stringify({
        accountType: 'G/L Account',
        accountNumber: line.accountNumber,
        postingDate: line.postingDate,
        documentNumber: line.documentNumber.slice(0, 20),
        description: line.description.slice(0, 100),
        amount: line.amount,
      }),
    })
  }

  // ─── Product Sync ──────────────────────────────────────────────────────────

  async syncProductsToDb(): Promise<number> {
    const items = await this.fetchItems()
    if (items.length === 0) return 0

    // Build a map of category code → DB category id
    const categoryMap = await buildCategoryMap(items)

    const BATCH_SIZE = 50
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE)
      await Promise.all(
        batch.map((item) => {
          const categoryId = item.itemCategoryCode
            ? categoryMap.get(item.itemCategoryCode) ?? null
            : null

          return prisma.product.upsert({
            where: { bcItemNo: item.number },
            update: {
              name: item.displayName,
              description: item.description ?? null,
              price: item.unitPrice,
              stock: Math.floor(item.inventory),
              category: item.itemCategoryCode ?? null,
              imageUrl: item.picture ?? null,
              ...(categoryId ? { categoryId } : {}),
            },
            create: {
              bcItemNo: item.number,
              name: item.displayName,
              description: item.description ?? null,
              price: item.unitPrice,
              stock: Math.floor(item.inventory),
              category: item.itemCategoryCode ?? null,
              imageUrl: item.picture ?? null,
              active: true,
              source: 'BC',
              ...(categoryId ? { categoryId } : {}),
            },
          })
        })
      )
    }

    return items.length
  }
}

// ─── Category helper ─────────────────────────────────────────────────────────

async function buildCategoryMap(items: BCItem[]): Promise<Map<string, string>> {
  const codes = [...new Set(items.map((i) => i.itemCategoryCode).filter(Boolean))] as string[]
  if (codes.length === 0) return new Map()

  const existing = await prisma.category.findMany({
    where: { slug: { in: codes.map((c) => c.toLowerCase()) } },
    select: { id: true, slug: true },
  })

  const map = new Map<string, string>()
  for (const cat of existing) map.set(cat.slug.toUpperCase(), cat.id)

  // Create missing categories
  for (const code of codes) {
    if (!map.has(code)) {
      const slug = code.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      try {
        const created = await prisma.category.upsert({
          where: { slug },
          update: {},
          create: { name: code, slug },
        })
        map.set(code, created.id)
      } catch {}
    }
  }

  return map
}

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Creates a BC client using a single DB query (via SettingsService.getMany).
 * Secrets are automatically decrypted by SettingsService.
 */
export async function createBCClient(): Promise<BusinessCentralClient> {
  const settings = await SettingsService.getMany([
    'bc_tenant_id',
    'bc_client_id',
    'bc_client_secret',
    'bc_environment',
    'bc_company_id',
  ])

  const { bc_tenant_id: tenantId, bc_client_id: clientId, bc_client_secret: clientSecret, bc_environment: environment, bc_company_id: companyId } = settings

  if (!tenantId || !clientId || !clientSecret || !environment || !companyId) {
    throw new Error('Business Central integration is not configured.')
  }

  return new BusinessCentralClient(tenantId, clientId, clientSecret, environment, companyId)
}

// ─── Order → BC sync helper ──────────────────────────────────────────────────

/**
 * Resolves the BC customer number for an order.
 * Priority: businessCustomer.customerNo → look up by email → create new customer.
 * Returns the BC customer number string.
 */
export async function resolveOrCreateBCCustomer(
  bc: BusinessCentralClient,
  userId: string,
  businessCustomerId?: string | null
): Promise<string> {
  // 1. Try existing BC customer number on business account
  if (businessCustomerId) {
    const bizCustomer = await prisma.businessCustomer.findUnique({
      where: { id: businessCustomerId },
      include: { user: { select: { name: true, email: true } } },
    })

    if (bizCustomer?.customerNo) {
      // Verify it still exists in BC
      const existing = await bc.getCustomerByNumber(bizCustomer.customerNo)
      if (existing) return existing.number
    }

    // No customerNo or stale — look up / create in BC
    const user = bizCustomer?.user
    if (user?.email) {
      const byEmail = await bc.findCustomerByEmail(user.email)
      if (byEmail) {
        // Cache the found customer number
        await prisma.businessCustomer.update({
          where: { id: businessCustomerId },
          data: { customerNo: byEmail.number },
        })
        return byEmail.number
      }

      // Create new BC customer
      const created = await bc.createCustomer({
        displayName: bizCustomer?.companyName || user.name || user.email,
        email: user.email,
        taxRegistrationNumber: bizCustomer?.vatNumber ?? undefined,
      })

      await prisma.businessCustomer.update({
        where: { id: businessCustomerId },
        data: { customerNo: created.number },
      })

      return created.number
    }
  }

  // 2. Regular customer — look up by user email, create if missing
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  })

  if (!user) throw new Error(`User ${userId} not found`)

  const byEmail = await bc.findCustomerByEmail(user.email)
  if (byEmail) return byEmail.number

  const created = await bc.createCustomer({
    displayName: user.name || user.email,
    email: user.email,
  })

  return created.number
}

// ─── BC order status → local status mapping ──────────────────────────────────

export function mapBCStatusToOrderStatus(
  bcStatus: BCSalesOrder['status'],
  shipmentStatus?: BCSalesOrder['shipmentStatus']
): 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | null {
  if (bcStatus === 'Cancelled') return 'CANCELLED'
  if (shipmentStatus === 'Fully Shipped') return 'DELIVERED'
  if (shipmentStatus === 'Partially Shipped') return 'SHIPPED'
  return null // No change
}
