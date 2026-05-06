'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { useCartStore } from '@/lib/cart-store'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Link from 'next/link'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

function CheckoutForm() {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const { data: session } = useSession()
  const items = useCartStore((state) => state.items)
  const clearCart = useCartStore((state) => state.clearCart)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [serverTotal, setServerTotal] = useState<number | null>(null)
  const [billingDetails, setBillingDetails] = useState({
    name: session?.user.name || '',
    email: session?.user.email || '',
    address: '',
    city: '',
    postalCode: '',
    country: 'US',
  })

  const subtotal = items.reduce((sum, item) => sum + item.displayPrice * item.quantity, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    if (items.length === 0) {
      setError('Your cart is empty.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Validate billing details before hitting the API
      if (!billingDetails.name.trim()) throw new Error('Full name is required')
      if (!billingDetails.email.trim()) throw new Error('Email is required')
      if (!billingDetails.address.trim()) throw new Error('Address is required')
      if (!billingDetails.city.trim()) throw new Error('City is required')
      if (!billingDetails.postalCode.trim()) throw new Error('Postal code is required')

      // Server computes the authoritative total — never send client price
      const intentRes = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({ id: item.id, quantity: item.quantity })),
        }),
      })

      if (!intentRes.ok) {
        const err = await intentRes.json()
        throw new Error(err.error || 'Failed to create payment intent')
      }

      const { clientSecret, amount: confirmedAmount } = await intentRes.json()
      setServerTotal(confirmedAmount) // show the server-authoritative total

      // Confirm payment
      const cardElement = elements.getElement(CardElement)
      if (!cardElement) throw new Error('Card element not found')

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: billingDetails.name,
            email: billingDetails.email,
            address: {
              line1: billingDetails.address,
              city: billingDetails.city,
              postal_code: billingDetails.postalCode,
              country: billingDetails.country,
            },
          },
        },
      })

      if (stripeError) {
        throw new Error(stripeError.message || 'Payment failed')
      }

      if (paymentIntent?.status === 'succeeded') {
        // Create order — server re-verifies PI and recomputes prices
        const orderRes = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stripePaymentIntentId: paymentIntent.id,
            items: items.map((item) => ({ id: item.id, quantity: item.quantity })),
          }),
        })

        if (orderRes.ok) {
          clearCart()
          router.push('/checkout/success')
        } else {
          throw new Error('Order creation failed. Please contact support.')
        }
      }
    } catch (err: any) {
      setError(err.message || 'Payment failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 mb-4">Your cart is empty</p>
        <Link href="/products" className="text-primary-600 hover:text-primary-700 font-medium">
          Browse products
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-10">
      {/* Left: billing + payment */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Billing Details</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={billingDetails.name}
                onChange={(e) => setBillingDetails({ ...billingDetails, name: e.target.value })}
                required
              />
              <Input
                label="Email"
                type="email"
                value={billingDetails.email}
                onChange={(e) => setBillingDetails({ ...billingDetails, email: e.target.value })}
                required
              />
            </div>
            <Input
              label="Address"
              value={billingDetails.address}
              onChange={(e) => setBillingDetails({ ...billingDetails, address: e.target.value })}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="City"
                value={billingDetails.city}
                onChange={(e) => setBillingDetails({ ...billingDetails, city: e.target.value })}
                required
              />
              <Input
                label="Postal Code"
                value={billingDetails.postalCode}
                onChange={(e) => setBillingDetails({ ...billingDetails, postalCode: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Country</label>
              <select
                value={billingDetails.country}
                onChange={(e) => setBillingDetails({ ...billingDetails, country: e.target.value })}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="US">United States</option>
                <option value="GB">United Kingdom</option>
                <option value="CA">Canada</option>
                <option value="AU">Australia</option>
                <option value="DE">Germany</option>
                <option value="FR">France</option>
                <option value="NL">Netherlands</option>
                <option value="NO">Norway</option>
                <option value="SE">Sweden</option>
                <option value="DK">Denmark</option>
              </select>
            </div>
          </div>
        </div>

        {/* Payment */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment</h2>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#111827',
                    '::placeholder': { color: '#9ca3af' },
                  },
                  invalid: { color: '#ef4444' },
                },
              }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Secured by Stripe. Your payment info is never stored on our servers.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          fullWidth
          isLoading={loading}
          disabled={!stripe || loading}
        >
          {loading ? 'Processing...' : `Pay €${(serverTotal ?? subtotal).toFixed(2)}`}
        </Button>
      </div>

      {/* Right: order summary */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                ${(item.displayPrice * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}

          <div className="pt-2 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>€{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Tax</span>
              <span>Included</span>
            </div>
            <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-900">
              <span>Total</span>
              <span>€{subtotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}

export default function CheckoutPage() {
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>
      <Elements stripe={stripePromise}>
        <CheckoutForm />
      </Elements>
    </div>
  )
}
