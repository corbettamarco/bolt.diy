import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@12.6.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '')
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
)

serve(async (req) => {
  try {
    const { equipmentId, userId, startDate, endDate, totalPrice, duration } = await req.json()

    // Create rental record
    const { data: rental, error } = await supabaseClient
      .from('rentals')
      .insert({
        equipment_id: equipmentId,
        user_id: userId,
        start_date: startDate,
        end_date: endDate,
        total_price: totalPrice,
        status: 'pending'
      })
      .select()
      .single()

    if (error) throw error

    // Create Stripe session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Rental: ${rental.id}`,
          },
          unit_amount: Math.round(totalPrice * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${Deno.env.get('FRONTEND_URL')}/rentals/${rental.id}?success=true`,
      cancel_url: `${Deno.env.get('FRONTEND_URL')}/equipment/${equipmentId}`,
      metadata: {
        rental_id: rental.id
      }
    })

    // Create notification for owner
    const { data: equipment } = await supabaseClient
      .from('equipment')
      .select('owner_id')
      .eq('id', equipmentId)
      .single()

    await supabaseClient
      .from('notifications')
      .insert({
        user_id: equipment.owner_id,
        type: 'new_rental',
        message: `New rental request for ${duration} days`,
        metadata: {
          rental_id: rental.id,
          equipment_id: equipmentId
        }
      })

    return new Response(JSON.stringify({ id: session.id }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
