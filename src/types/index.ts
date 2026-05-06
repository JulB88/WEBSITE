export interface Product {
  id: string
  bcItemNo: string
  name: string
  description?: string | null
  price: number
  displayPrice?: number
  stock: number
  imageUrl?: string | null
  category?: string | null
  active: boolean
  createdAt: Date | string
  updatedAt: Date | string
}

export interface User {
  id: string
  email: string
  name?: string | null
  role: 'ADMIN' | 'BUSINESS' | 'CUSTOMER'
  businessCustomer?: BusinessCustomer | null
  createdAt: Date | string
  updatedAt: Date | string
}

export interface BusinessCustomer {
  id: string
  userId: string
  companyName: string
  vatNumber?: string | null
  discountPercent: number
  priceListId?: string | null
  priceList?: PriceList | null
  createdAt: Date | string
  updatedAt: Date | string
}

export interface PriceList {
  id: string
  name: string
  discountPercent: number
  isDefault: boolean
  priceListItems?: PriceListItem[]
  createdAt: Date | string
  updatedAt: Date | string
}

export interface PriceListItem {
  id: string
  priceListId: string
  productId: string
  overridePrice?: number | null
  product?: Product
}

export interface Order {
  id: string
  userId: string
  businessCustomerId?: string | null
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
  totalAmount: number
  stripePaymentIntentId?: string | null
  bcSalesOrderNo?: string | null
  createdAt: Date | string
  updatedAt: Date | string
  user?: User
  businessCustomer?: BusinessCustomer | null
  orderItems?: OrderItem[]
}

export interface OrderItem {
  id: string
  orderId: string
  productId: string
  quantity: number
  unitPrice: number
  product?: Product
}

export interface CartItem {
  id: string
  name: string
  price: number
  displayPrice: number
  quantity: number
  imageUrl?: string | null
  bcItemNo: string
  category?: string | null
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}
