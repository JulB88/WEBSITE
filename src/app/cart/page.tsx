'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useCartStore } from '@/lib/cart-store'
import Button from '@/components/ui/Button'

export default function CartPage() {
  const items = useCartStore((state) => state.items)
  const removeItem = useCartStore((state) => state.removeItem)
  const updateQuantity = useCartStore((state) => state.updateQuantity)
  const clearCart = useCartStore((state) => state.clearCart)

  const subtotal = items.reduce((sum, item) => sum + item.displayPrice * item.quantity, 0)

  if (items.length === 0) {
    return (
      <div className="container py-16 text-center">
        <div className="max-w-md mx-auto">
          <svg className="w-20 h-20 mx-auto mb-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h1>
          <p className="text-gray-500 mb-8">Looks like you haven't added any products yet.</p>
          <Link href="/products">
            <Button size="lg">Browse Products</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
        <button
          onClick={clearCart}
          className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors"
        >
          Clear cart
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-4">
          {/* Header row */}
          <div className="hidden md:grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wide px-4 pb-2 border-b border-gray-200">
            <div className="col-span-6">Product</div>
            <div className="col-span-2 text-center">Price</div>
            <div className="col-span-2 text-center">Qty</div>
            <div className="col-span-2 text-right">Subtotal</div>
          </div>

          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-12 gap-4 items-center"
            >
              {/* Image + name */}
              <div className="col-span-12 md:col-span-6 flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden relative flex-shrink-0">
                  {item.imageUrl ? (
                    <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="64px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  )}
                </div>
                <div>
                  <Link href={`/products/${item.id}`} className="font-medium text-gray-900 hover:text-primary-600 transition-colors text-sm">
                    {item.name}
                  </Link>
                  {item.category && (
                    <p className="text-xs text-gray-400 mt-0.5">{item.category}</p>
                  )}
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-xs text-red-500 hover:text-red-700 mt-1 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {/* Unit price */}
              <div className="col-span-4 md:col-span-2 text-center">
                <span className="text-sm font-medium text-gray-900">${item.displayPrice.toFixed(2)}</span>
                {item.displayPrice < item.price && (
                  <p className="text-xs text-gray-400 line-through">${item.price.toFixed(2)}</p>
                )}
              </div>

              {/* Quantity */}
              <div className="col-span-4 md:col-span-2 flex justify-center">
                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="px-2.5 py-1.5 hover:bg-gray-100 transition-colors text-sm border-r border-gray-300"
                  >
                    -
                  </button>
                  <span className="px-3 py-1.5 text-sm font-medium">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="px-2.5 py-1.5 hover:bg-gray-100 transition-colors text-sm border-l border-gray-300"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Subtotal */}
              <div className="col-span-4 md:col-span-2 text-right">
                <span className="font-semibold text-gray-900">${(item.displayPrice * item.quantity).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-24">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)
                </span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipping</span>
                <span className="text-green-600 font-medium">Calculated at checkout</span>
              </div>
              <div className="border-t border-gray-200 pt-3 flex justify-between">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-bold text-xl text-gray-900">${subtotal.toFixed(2)}</span>
              </div>
            </div>

            <Link href="/checkout">
              <Button size="lg" fullWidth>
                Proceed to Checkout
              </Button>
            </Link>

            <Link
              href="/products"
              className="block text-center text-sm text-gray-500 hover:text-primary-600 mt-3 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
