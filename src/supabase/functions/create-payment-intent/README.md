# Create Payment Intent Function

This Supabase Edge Function handles the creation of a Stripe Payment Intent and related database operations for equipment rentals.

## Functionality

1. Creates a Stripe Payment Intent with the provided payment method
2. Creates a rental record in the database
3. Updates the equipment status to 'rented'
4. Creates a notification for the owner
5. Returns the payment intent client secret and ID

## Required Environment Variables

- `STRIPE_SECRET_KEY`: Your Stripe secret key
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
- `FRONTEND_URL`: Your frontend application URL

## Request Body

```typescript
{
  amount: number;          // Amount in cents
  payment_method: string;  // Stripe payment method ID
  equipmentId: string;     // Equipment ID being rented
  userId: string;          // User ID of the renter
  startDate: string;       // Rental start date (ISO string)
  endDate: string;         // Rental end date (ISO string)
  billingDetails: {        // Billing information
    name: string;
    email: string;
    address: {
      line1: string;
      city: string;
      postal_code: string;
      country: string;
    }
  }
}
```

## Response

```typescript
{
  clientSecret: string;    // Stripe payment intent client secret
  paymentIntentId: string; // Stripe payment intent ID
}
```

## Error Response

```typescript
{
  error: string;           // Error message
}
```

## Deployment

1. Set the required environment variables in your Supabase project
2. Deploy the function using the Supabase CLI:
   ```bash
   supabase functions deploy create-payment-intent
   ```
