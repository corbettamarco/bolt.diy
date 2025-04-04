import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { loadStripe } from '@stripe/stripe-js'
import {
  CardElement,
  useStripe,
  useElements,
  Elements
} from '@stripe/react-stripe-js'
import {
  Calendar,
  Clock,
  CreditCard,
  AlertCircle,
  ChevronLeft,
  Check,
  X
} from 'lucide-react'
import type { Equipment } from '../types'
import { useAuth } from '../contexts/AuthContext'

interface RentalCheckoutProps {
  startDate: Date
  endDate: Date
  totalPrice: number
  equipment: Pick<Equipment, 'id' | 'name' | 'images' | 'price_day'>
  onBack: () => void
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
console.log('Stripe public key:', import.meta.env.VITE_STRIPE_PUBLIC_KEY)

const CheckoutForm = ({
  startDate,
  endDate,
  totalPrice,
  equipment,
  onBack
}: RentalCheckoutProps) => {
  const stripe = useStripe()
  const elements = useElements()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [billingDetails, setBillingDetails] = useState({
    name: '',
    email: '',
    address: {
      line1: '',
      city: '',
      postal_code: '',
      country: 'US'
    }
  })
  const [termsAccepted, setTermsAccepted] = useState(false)

  useEffect(() => {
    console.log('Stripe instance:', stripe)
    console.log('Elements instance:', elements)
    if (!user) {
      navigate('/login')
    }
  }, [stripe, elements, user, navigate])

  const durationDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Submit button clicked')

    if (!stripe || !elements) {
      console.log('Stripe or elements not ready:', { stripe, elements })
      return
    }
    if (!termsAccepted) {
      setError('You must accept the terms and conditions')
      return
    }

    setLoading(true)
    setError('')

    try {
      console.log('Creating payment method...')
      // 1. Get payment method from Stripe Elements
      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement(CardElement)!,
        billing_details: billingDetails
      })

      if (stripeError) throw stripeError
      console.log('Payment method created:', paymentMethod.id)

      if (!user) throw new Error('Not authenticated')
      console.log('User authenticated:', user.id)

      console.log('Calling create-payment-intent function...')
      const { data: paymentIntentData, error: paymentIntentError } = await supabase.functions.invoke(
        'create-payment-intent',
        {
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            amount: Math.round(totalPrice * 100), // Convert to cents
            payment_method: paymentMethod.id,
            equipmentId: equipment.id,
            userId: user?.id || '',
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            billingDetails: {
              name: user?.user_metadata?.full_name || '',
              email: user?.email || '',
              phone: user?.user_metadata?.phone || '',
              address: {
                city: user?.user_metadata?.city || '',
                country: user?.user_metadata?.country || 'IT',
                line1: user?.user_metadata?.address || '',
                postal_code: user?.user_metadata?.postal_code || '',
              },
            },
          },
        }
      )

      if (paymentIntentError) {
        console.error('Supabase function error:', paymentIntentError)
        throw paymentIntentError
      }
      console.log('Payment intent created:', paymentIntentData)

      // 3. Confirm payment
      console.log('Confirming payment...')
      const { error: confirmError } = await stripe.confirmCardPayment(
        paymentIntentData.client_secret,
        {
          payment_method: paymentMethod.id
        }
      )

      if (confirmError) throw confirmError
      console.log('Payment confirmed')

      // 4. Show success
      setSuccess(true)
      setTimeout(() => navigate('/rentals'), 3000)
    } catch (err: any) {
      console.error('Payment error:', err)
      setError(err.message || 'Payment failed')
    } finally {
      setLoading(false)
    }
  }

  const handleBillingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (name.includes('address.')) {
      const field = name.split('.')[1]
      setBillingDetails(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [field]: value
        }
      }))
    } else {
      setBillingDetails(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="text-green-600" size={32} />
        </div>
        <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
        <p className="text-gray-600 mb-6">
          Your rental for {equipment.name} has been confirmed.
        </p>
        <button
          onClick={() => navigate('/rentals')}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
        >
          View Your Rentals
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={onBack}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ChevronLeft size={20} className="mr-1" />
        Back to equipment
      </button>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="md:flex">
          {/* Rental Summary */}
          <div className="md:w-1/2 p-6 bg-gray-50">
            <h2 className="text-xl font-bold mb-4">Rental Summary</h2>

            <div className="mb-6">
              <h3 className="font-medium mb-2">Equipment</h3>
              <div className="flex items-center gap-4">
                <img
                  src={equipment.images[0]}
                  alt={equipment.name}
                  className="w-16 h-16 object-cover rounded"
                />
                <div>
                  <p className="font-medium">{equipment.name}</p>
                  <p className="text-gray-600 text-sm">${equipment.price_day.toFixed(2)} per day</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Rental Period</p>
                  <p>
                    {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Duration</p>
                  <p>{durationDays} day{durationDays !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>${totalPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="md:w-1/2 p-6">
            <h2 className="text-xl font-bold mb-4">Payment Information</h2>

            <form onSubmit={handleSubmit}>
              {/* Card Details */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Card Details
                </label>
                <div className="border rounded-lg p-3">
                  <CardElement
                    options={{
                      style: {
                        base: {
                          fontSize: '16px',
                          color: '#424770',
                          '::placeholder': {
                            color: '#aab7c4',
                          },
                        },
                        invalid: {
                          color: '#9e2146',
                        },
                      },
                    }}
                  />
                </div>
              </div>

              {/* Billing Information */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Billing Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Full Name</label>
                    <input
                      type="text"
                      name="name"
                      value={billingDetails.name}
                      onChange={handleBillingChange}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={billingDetails.email}
                      onChange={handleBillingChange}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Address</label>
                    <input
                      type="text"
                      name="address.line1"
                      value={billingDetails.address.line1}
                      onChange={handleBillingChange}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">City</label>
                      <input
                        type="text"
                        name="address.city"
                        value={billingDetails.address.city}
                        onChange={handleBillingChange}
                        className="w-full px-3 py-2 border rounded-lg"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">ZIP Code</label>
                      <input
                        type="text"
                        name="address.postal_code"
                        value={billingDetails.address.postal_code}
                        onChange={handleBillingChange}
                        className="w-full px-3 py-2 border rounded-lg"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms */}
              <div className="mb-6">
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={() => setTermsAccepted(!termsAccepted)}
                    className="mt-1 mr-2"
                  />
                  <span className="text-sm text-gray-600">
                    I agree to the rental terms and conditions
                  </span>
                </label>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 flex items-center gap-2 text-red-500">
                  <X size={16} />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!stripe || loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
              >
                <CreditCard size={18} />
                {loading ? 'Processing Payment...' : `Pay $${totalPrice.toFixed(2)}`}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

const RentalCheckout = (props: RentalCheckoutProps) => (
  <Elements stripe={stripePromise}>
    <CheckoutForm {...props} />
  </Elements>
)

export default RentalCheckout
