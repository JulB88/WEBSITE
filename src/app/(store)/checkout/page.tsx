'use client'

import { useState } from 'react'
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

const CURRENCY_SYMBOLS: Record<string, string> = {
  cad: 'CA$', usd: '$', eur: '€', gbp: '£', chf: 'CHF ',
}

function fmt(amount: number, currency: string) {
  const sym = CURRENCY_SYMBOLS[currency?.toLowerCase()] ?? currency?.toUpperCase() + ' '
  return `${sym}${amount.toFixed(2)}`
}

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
  const [serverCurrency, setServerCurrency] = useState<string>('cad')
  const [billingDetails, setBillingDetails] = useState({
    name: session?.user.name || '',
    email: session?.user.email || '',
    address: '',
    city: '',
    postalCode: '',
    country: 'CA',
  })

  const subtotal = items.reduce((sum, item) => sum + item.displayPrice * item.quantity, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    if (items.length === 0) { setError('Votre panier est vide.'); return }

    setLoading(true)
    setError(null)

    try {
      if (!billingDetails.name.trim())       throw new Error('Le nom complet est requis.')
      if (!billingDetails.email.trim())      throw new Error("L'adresse courriel est requise.")
      if (!billingDetails.address.trim())    throw new Error("L'adresse est requise.")
      if (!billingDetails.city.trim())       throw new Error('La ville est requise.')
      if (!billingDetails.postalCode.trim()) throw new Error('Le code postal est requis.')

      // Server computes the authoritative total — never trust client price
      const intentRes = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({ id: item.id, quantity: item.quantity })),
        }),
      })

      if (!intentRes.ok) {
        const err = await intentRes.json()
        throw new Error(err.error || 'Impossible de créer la transaction.')
      }

      const { clientSecret, amount: confirmedAmount, currency } = await intentRes.json()
      setServerTotal(confirmedAmount)
      setServerCurrency(currency ?? 'cad')

      const cardElement = elements.getElement(CardElement)
      if (!cardElement) throw new Error('Élément carte introuvable.')

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

      if (stripeError) throw new Error(stripeError.message || 'Paiement échoué.')

      if (paymentIntent?.status === 'succeeded') {
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
          throw new Error('Création de commande échouée. Contactez le support.')
        }
      }
    } catch (err: any) {
      setError(err.message || 'Paiement échoué. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0' }}>
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>Votre panier est vide.</p>
        <Link href="/products" style={{ color: '#e51937', fontWeight: 600, textDecoration: 'none' }}>
          Parcourir les produits
        </Link>
      </div>
    )
  }

  const displayTotal = serverTotal ?? subtotal
  const displayCurrency = serverCurrency

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-10">
      {/* Left: billing + payment */}
      <div className="space-y-6">
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1f2232', marginBottom: '1.25rem' }}>
            Coordonnées de facturation
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Nom complet"
                value={billingDetails.name}
                onChange={(e) => setBillingDetails({ ...billingDetails, name: e.target.value })}
                required
                autoComplete="name"
              />
              <Input
                label="Courriel"
                type="email"
                value={billingDetails.email}
                onChange={(e) => setBillingDetails({ ...billingDetails, email: e.target.value })}
                required
                autoComplete="email"
              />
            </div>
            <Input
              label="Adresse"
              value={billingDetails.address}
              onChange={(e) => setBillingDetails({ ...billingDetails, address: e.target.value })}
              required
              autoComplete="street-address"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Ville"
                value={billingDetails.city}
                onChange={(e) => setBillingDetails({ ...billingDetails, city: e.target.value })}
                required
                autoComplete="address-level2"
              />
              <Input
                label="Code postal"
                value={billingDetails.postalCode}
                onChange={(e) => setBillingDetails({ ...billingDetails, postalCode: e.target.value })}
                required
                autoComplete="postal-code"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#374151', marginBottom: '0.4rem' }}>
                Pays
              </label>
              <select
                value={billingDetails.country}
                onChange={(e) => setBillingDetails({ ...billingDetails, country: e.target.value })}
                style={{ display: 'block', width: '100%', border: '1px solid #d1d5db', padding: '10px 12px', fontSize: '0.9rem', color: '#111827' }}
                autoComplete="country"
              >
                <option value="CA">Canada</option>
                <option value="US">États-Unis</option>
                <option value="FR">France</option>
                <option value="BE">Belgique</option>
                <option value="CH">Suisse</option>
                <option value="GB">Royaume-Uni</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1f2232', marginBottom: '1.25rem' }}>
            Paiement
          </h2>
          <div style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '1rem' }}>
            <CardElement
              options={{
                style: {
                  base: { fontSize: '16px', color: '#111827', '::placeholder': { color: '#9ca3af' } },
                  invalid: { color: '#ef4444' },
                },
              }}
            />
          </div>
          <p style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Sécurisé par Stripe. Vos informations ne sont jamais stockées sur nos serveurs.
          </p>
        </div>

        {error && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '0.75rem' }} role="alert">
            <p style={{ color: '#b91c1c', fontSize: '0.875rem' }}>{error}</p>
          </div>
        )}

        <Button type="submit" size="lg" fullWidth isLoading={loading} disabled={!stripe || loading}>
          {loading ? 'Traitement en cours…' : `Payer ${fmt(displayTotal, displayCurrency)}`}
        </Button>
      </div>

      {/* Right: order summary */}
      <div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1f2232', marginBottom: '1.25rem' }}>
          Récapitulatif
        </h2>
        <div style={{ border: '1px solid #e5e7eb', padding: '1rem' }}>
          <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem', marginBottom: '1rem' }}>
            {items.map((item) => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Qté : {item.quantity}</p>
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827', flexShrink: 0 }}>
                  {fmt(item.displayPrice * item.quantity, displayCurrency)}
                </span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#6b7280' }}>
              <span>Sous-total</span>
              <span>{fmt(subtotal, displayCurrency)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#6b7280' }}>
              <span>Taxes</span>
              <span>Incluses</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #1f2232', paddingTop: '0.75rem', fontWeight: 900, color: '#1f2232', fontSize: '1rem' }}>
              <span>Total</span>
              <span style={{ color: '#e51937' }}>{fmt(serverTotal ?? subtotal, displayCurrency)}</span>
            </div>
          </div>
        </div>

        <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.75rem', textAlign: 'center' }}>
          En passant votre commande, vous acceptez nos{' '}
          <Link href="/conditions" style={{ color: '#e51937' }}>conditions générales de vente</Link>.
        </p>
      </div>
    </form>
  )
}

export default function CheckoutPage() {
  return (
    <div className="container" style={{ paddingTop: '3rem', paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/cart" style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
          ← Retour au panier
        </Link>
        <h1 style={{ fontSize: 'clamp(1.3rem, 3vw, 1.8rem)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1f2232', marginTop: '0.5rem' }}>
          Paiement
        </h1>
        <div style={{ width: 40, height: 4, backgroundColor: '#e51937', marginTop: '0.5rem' }} />
      </div>
      <Elements stripe={stripePromise}>
        <CheckoutForm />
      </Elements>
    </div>
  )
}
