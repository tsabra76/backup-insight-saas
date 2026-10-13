// Stripe connector with Supabase integration
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Initialize Supabase client (this would be configured separately)
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.DATABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
let supabase;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

// Process subscription payments with user database storage
async function processSubscription({ email, name, cardToken }) {
  try {
    // Create a customer in Stripe
    const customer = await stripe.customers.create({
      email,
      name,
      description: 'MusicPro AI SaaS Customer',
      metadata: { service: 'MusicPro AI' }
    });

    // Create subscription using the payment token
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'MusicPro AI Premium',
              description: 'Premium music backup analysis & protection'
            },
            unit_amount: 999, // $9.99 in cents
            recurring: {
              interval: 'month',
              trial_period_days: 14
            }
          },
        },
      ],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
      metadata: { 
        service: 'MusicPro AI',
        tier: 'premium' 
      }
    });

    // Store user data in Supabase if available
    let userData = null;
    if (supabase) {
      const { data, error } = await supabase
        .from('users')
        .insert([
          {
            email,
            name,
            stripe_customer_id: customer.id,
            subscription_status: 'active',
            plan_type: 'MusicPro Premium',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select();

      if (error) throw error;
      userData = data[0];
    }

    return {
      success: true,
      customerId: customer.id,
      subscriptionId: subscription.id,
      userId: userData?.id || null,
      message: 'Subscription confirmed',
      plan: 'MusicPro Premium ($9.99/month)',
      trialDays: 14
    };
  } catch (error) {
    console.error('Subscription processing error:', error);
    throw new Error(`Payment processing failed: ${error.message}`);
  }
}

module.exports = { processSubscription };