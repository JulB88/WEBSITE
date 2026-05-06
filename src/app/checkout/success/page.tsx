import Link from 'next/link'
import Button from '@/components/ui/Button'

export default function CheckoutSuccessPage() {
  return (
    <div className="container py-16">
      <div className="max-w-md mx-auto text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">Order Placed!</h1>
        <p className="text-gray-500 mb-2">
          Thank you for your order. We've received your payment and will process your order shortly.
        </p>
        <p className="text-gray-500 mb-8">
          You'll receive a confirmation email with your order details.
        </p>

        <div className="space-y-3">
          <Link href="/account/orders">
            <Button size="lg" fullWidth>
              View My Orders
            </Button>
          </Link>
          <Link href="/products">
            <Button variant="secondary" size="lg" fullWidth>
              Continue Shopping
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
