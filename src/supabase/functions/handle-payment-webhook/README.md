# Stripe Webhook Handler

This Supabase Edge Function handles Stripe webhook events for payment processing and rental management.

## Functionality

1. Handles the following Stripe events:
   - `checkout.session.completed`: Updates rental status to confirmed
   - `payment_intent.succeeded`: Updates rental status to paid
   - `payment_intent.payment_failed`: Updates rental status to payment_failed

2. For each event:
   - Updates the rental status in the database
   - Creates appropriate notifications for users
   - Handles error cases

## Required Environment Variables

- `STRIPE_SECRET_KEY`: Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook signing secret
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

## Webhook Setup in Stripe

1. Go to Stripe Dashboard > Developers > Webhooks
2. Add a new endpoint with the URL:
   - Development: `http://localhost:54321/functions/v1/handle-payment-webhook`
   - Production: `https://[YOUR_PROJECT_REF].supabase.co/functions/v1/handle-payment-webhook`
3. Select events to listen to:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Copy the signing secret and add it to your Supabase environment variables

## Deployment

1. Set the required environment variables in your Supabase project
2. Deploy the function using the Supabase CLI:
   ```bash
   supabase functions deploy handle-payment-webhook
   ```

## Testing

You can test the webhook locally using the Stripe CLI:

```bash
stripe listen --forward-to localhost:54321/functions/v1/handle-payment-webhook
```

You can also test the function using the Supabase CLI:

```bash
npx supabase functions invoke create-payment-intent
