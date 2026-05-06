import { prisma } from './prisma'

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

interface BCOrderLine {
  itemId?: string
  itemNumber?: string
  description: string
  quantity: number
  unitPrice: number
}

interface BCOrder {
  customerId?: string
  orderDate: string
  requestedDeliveryDate?: string
  salesLines: BCOrderLine[]
}

export class BusinessCentralClient {
  private tenantId: string
  private clientId: string
  private clientSecret: string
  private environment: string
  private companyId: string
  private accessToken: string | null = null
  private tokenExpiry: number = 0

  constructor(
    tenantId: string,
    clientId: string,
    clientSecret: string,
    environment: string,
    companyId: string
  ) {
    this.tenantId = tenantId
    this.clientId = clientId
    this.clientSecret = clientSecret
    this.environment = environment
    this.companyId = companyId
  }

  async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken
    }

    const tokenUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`

    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      scope: 'https://api.businesscentral.dynamics.com/.default',
    })

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to get BC access token: ${error}`)
    }

    const data = await response.json()
    this.accessToken = data.access_token
    this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000

    return this.accessToken!
  }

  private get baseUrl(): string {
    return `https://api.businesscentral.dynamics.com/v2.0/${this.tenantId}/${this.environment}/api/v2.0/companies(${this.companyId})`
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAccessToken()

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options.headers || {}),
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`BC API error ${response.status}: ${error}`)
    }

    if (response.status === 204) {
      return {} as T
    }

    return response.json()
  }

  async fetchItems(): Promise<BCItem[]> {
    const allItems: BCItem[] = []
    let url = '/items?$top=1000'

    // Paginate through all items using OData @nextLink
    while (url) {
      const data = await this.request<{ value: BCItem[]; '@odata.nextLink'?: string }>(url)
      allItems.push(...data.value)
      // Extract path from next link (remove base URL)
      const next = data['@odata.nextLink']
      url = next ? next.replace(/^.*\/api\/v2\.0\/companies\([^)]+\)/, '') : ''
    }

    return allItems
  }

  async fetchItem(itemNo: string): Promise<BCItem> {
    // Escape single quotes in OData filter values (double them per OData spec)
    const escaped = itemNo.replace(/'/g, "''")
    const data = await this.request<{ value: BCItem[] }>(
      `/items?$filter=number eq '${escaped}'`
    )
    if (!data.value || data.value.length === 0) {
      throw new Error(`Item ${itemNo} not found in Business Central`)
    }
    return data.value[0]
  }

  async createSalesOrder(orderData: BCOrder): Promise<any> {
    const order = await this.request('/salesOrders', {
      method: 'POST',
      body: JSON.stringify({
        orderDate: orderData.orderDate,
        requestedDeliveryDate: orderData.requestedDeliveryDate,
      }),
    })

    for (const line of orderData.salesLines) {
      await this.request(`/salesOrders(${(order as any).id})/salesOrderLines`, {
        method: 'POST',
        body: JSON.stringify({
          itemNumber: line.itemNumber,
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        }),
      })
    }

    return order
  }

  async updateSalesOrder(orderId: string, updateData: Partial<BCOrder>): Promise<any> {
    return this.request(`/salesOrders(${orderId})`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    })
  }

  async syncProductsToDb(): Promise<number> {
    const items = await this.fetchItems()
    if (items.length === 0) return 0

    const BATCH_SIZE = 50

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE)

      // Run batch of upserts in parallel (capped at BATCH_SIZE concurrent queries)
      await Promise.all(
        batch.map((item) =>
          prisma.product.upsert({
            where: { bcItemNo: item.number },
            update: {
              name: item.displayName,
              description: item.description ?? null,
              price: item.unitPrice,
              stock: Math.floor(item.inventory),
              category: item.itemCategoryCode ?? null,
              imageUrl: item.picture ?? null,
              active: true,
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
            },
          })
        )
      )
    }

    return items.length
  }
}

/** Reads a setting from DB first, falls back to env var */
async function getSetting(dbKey: string, envKey: string): Promise<string> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: dbKey } })
    if (row?.value) return row.value
  } catch {}
  return process.env[envKey] || ''
}

/** Creates a BC client using DB settings (with env var fallback) */
export async function createBCClient(): Promise<BusinessCentralClient> {
  const tenantId     = await getSetting('bc_tenant_id',     'BC_TENANT_ID')
  const clientId     = await getSetting('bc_client_id',     'BC_CLIENT_ID')
  const clientSecret = await getSetting('bc_client_secret', 'BC_CLIENT_SECRET')
  const environment  = await getSetting('bc_environment',   'BC_ENVIRONMENT')
  const companyId    = await getSetting('bc_company_id',    'BC_COMPANY_ID')

  if (!tenantId || !clientId || !clientSecret || !environment || !companyId) {
    throw new Error('Business Central is not configured. Go to Admin → Settings to add your credentials.')
  }

  return new BusinessCentralClient(tenantId, clientId, clientSecret, environment, companyId)
}
