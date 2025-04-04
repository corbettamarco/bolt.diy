import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@12.1.1?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient()
});

console.log("ciao");

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://lonoleggi.netlify.app',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain',
      },
      status: 204
    });
  }

  try {
    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the request body
    const body = await req.json();
    const { amount, payment_method, equipmentId, userId, startDate, endDate, billingDetails } = body;

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'eur',
      payment_method: payment_method,
      confirm: false,
      automatic_payment_methods: {
        enabled: true
      },
      metadata: {
        equipmentId,
        userId,
        startDate,
        endDate
      }
    });

    // Insert rental record
    const { error: rentalError } = await supabaseClient.from('rentals').insert([
      {
        user_id: userId,
        equipment_id: equipmentId,
        start_date: startDate,
        end_date: endDate,
        total_price: amount / 100,
        status: 'pending',
        payment_intent_id: paymentIntent.id,
        billing_details: billingDetails
      }
    ]);

    if (rentalError) {
      throw rentalError;
    }

    // Update equipment status
    const { error: equipmentError } = await supabaseClient.from('equipment').update({
      status: 'rented'
    }).eq('id', equipmentId);

    if (equipmentError) {
      throw equipmentError;
    }

    // Send notification to equipment owner
    const { data: equipment } = await supabaseClient.from('equipment').select('owner_id').eq('id', equipmentId).single();

    if (equipment?.owner_id) {
      await supabaseClient.from('notifications').insert([
        {
          user_id: equipment.owner_id,
          type: 'new_rental',
          message: `New rental request for your equipment`,
          metadata: {
            rental_id: equipmentId,
            user_id: userId
          }
        }
      ]);
    }

    return new Response(JSON.stringify({
      clientSecret: paymentIntent.client_secret
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Error in create-payment-intent:', error);
    return new Response(JSON.stringify({
      error: error.message,
      details: error.stack
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});
