import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.6.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '')
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const signature = req.headers.get('stripe-signature') || ''
  const body = await req.text()

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''
    )

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const rentalId = session.metadata.rental_id

        // Update rental status
        await supabaseClient
          .from('rentals')
          .update({ status: 'confirmed' })
          .eq('id', rentalId)

        // Send confirmation notification
        const { data: rental } = await supabaseClient
          .from('rentals')
          .select('user_id, equipment_id')
          .eq('id', rentalId)
          .single()

        await supabaseClient
          .from('notifications')
          .insert({
            user_id: rental.user_id,
            type: 'rental_confirmed',
            title: 'Rental Confirmed',
            body: 'Your rental has been confirmed!',
            metadata: {
              rental_id: rentalId
            }
          })
        break
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object
        const rentalId = paymentIntent.metadata.rental_id

        // Update rental status
        await supabaseClient
          .from('rentals')
          .update({ 
            status: 'paid',
            payment_intent_id: paymentIntent.id
          })
          .eq('id', rentalId)

        // Send payment confirmation notification
        const { data: rental } = await supabaseClient
          .from('rentals')
          .select('user_id, equipment_id')
          .eq('id', rentalId)
          .single()

        await supabaseClient
          .from('notifications')
          .insert({
            user_id: rental.user_id,
            type: 'payment_succeeded',
            title: 'Payment Successful',
            body: 'Your payment has been processed successfully.',
            metadata: {
              rental_id: rentalId
            }
          })
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object
        const rentalId = paymentIntent.metadata.rental_id

        // Update rental status
        await supabaseClient
          .from('rentals')
          .update({ 
            status: 'payment_failed',
            payment_intent_id: paymentIntent.id
          })
          .eq('id', rentalId)

        // Send payment failure notification
        const { data: rental } = await supabaseClient
          .from('rentals')
          .select('user_id, equipment_id')
          .eq('id', rentalId)
          .single()

        await supabaseClient
          .from('notifications')
          .insert({
            user_id: rental.user_id,
            type: 'payment_failed',
            title: 'Payment Failed',
            body: 'There was an issue processing your payment. Please try again.',
            metadata: {
              rental_id: rentalId
            }
          })
        break
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      status: 200,
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      status: 400,
    })
  }
})
