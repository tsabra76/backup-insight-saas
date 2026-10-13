const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());

// Serve static files from the project's public directory.
// __dirname is /app/api in production, so '..' points at the app root.
app.use(express.static(path.join(__dirname, '..', 'public')));

// Stripe keys come from the environment (set as Heroku config vars).
// Live fallbacks are included so the service still works if env vars are absent.
const STRIPE_PUBLIC_KEY = process.env.STRIPE_PUBLISHABLE_KEY || 'pk_live_51Ts7n54NXDrGH2trmuZUfnHVlyGuCyuJu0eCQlgSgXjFuOIGr7aZ46FBnA3dKKNxATGhpVIu3W3YqrNRikthI1rL00N4pDw9yK';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

// Lazily initialise Stripe so a missing key yields a clear error instead of a boot crash.
let stripeInstance = null;
function getStripe() {
  if (!stripeInstance) {
    stripeInstance = require('stripe')(STRIPE_SECRET_KEY);
  }
  return stripeInstance;
}

// ---- Health / config -------------------------------------------------------
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'MusicPro AI API', environment: process.env.NODE_ENV || 'development' });
});

app.get('/api/stripe/public-key', (req, res) => {
  res.json({ publicKey: STRIPE_PUBLIC_KEY });
});

// ---- Create subscription checkout ------------------------------------------
app.post('/api/stripe/create-checkout-session', async (req, res) => {
  try {
    const { email, name } = req.body || {};
    if (!email || !name) {
      return res.status(400).json({ success: false, message: 'Email and name are required' });
    }

    const stripe = getStripe();

    const customer = await stripe.customers.create({
      email,
      name,
      description: 'MusicPro AI subscriber',
      metadata: { service: 'MusicPro AI' },
    });

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'MusicPro Premium',
              description: 'Premium music backup analysis & protection',
            },
            unit_amount: 999,
            recurring: { interval: 'month' },
          },
        },
      ],
      payment_behavior: 'default_incomplete',
      trial_period_days: 14,
      expand: ['latest_invoice.payment_intent'],
      metadata: { service: 'MusicPro AI', tier: 'premium' },
    });

    const invoice = subscription.latest_invoice;
    const paymentIntent = invoice && invoice.payment_intent;

    return res.json({
      success: true,
      customerId: customer.id,
      subscriptionId: subscription.id,
      clientSecret: paymentIntent ? paymentIntent.client_secret : null,
      status: subscription.status,
      plan: 'MusicPro Premium ($9.99/month)',
      trialDays: 14,
    });
  } catch (error) {
    console.error('create-checkout-session error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create subscription', details: error.message });
  }
});

// ---- Confirm payment method (attach card + pay first invoice) --------------
app.post('/api/stripe/confirm-payment', async (req, res) => {
  try {
    const { paymentMethodId, customerId, amount = 999, currency = 'usd', email } = req.body || {};
    if (!paymentMethodId || !customerId) {
      return res.status(400).json({ success: false, message: 'paymentMethodId and customerId are required' });
    }

    const stripe = getStripe();

    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId,
      payment_method: paymentMethodId,
      confirm: true,
      description: 'MusicPro AI subscription payment',
      receipt_email: email,
    });

    return res.json({
      success: paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing',
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    });
  } catch (error) {
    console.error('confirm-payment error:', error);
    return res.status(500).json({ success: false, message: 'Failed to confirm payment', details: error.message });
  }
});

// ---- Subscription lookup ---------------------------------------------------
app.get('/api/stripe/subscription/:subscriptionId', async (req, res) => {
  try {
    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(req.params.subscriptionId);
    return res.json({
      subscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      trialDays: subscription.trial_days || 0,
      items: subscription.items.data.map((item) => ({
        id: item.id,
        amount: item.price.unit_amount / 100,
        currency: item.price.currency,
        recurring: item.price.recurring,
      })),
    });
  } catch (error) {
    console.error('subscription lookup error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve subscription', details: error.message });
  }
});

// ---- Dashboard data --------------------------------------------------------
app.get('/dashboard-data', (req, res) => {
  res.json({
    storageAnalysis: {
      filesAnalyzed: 58,
      totalSize: '3.13 GB',
      categories: ['Audio', 'Documents', 'Images'],
      optimizationScore: 78,
    },
    subscription: {
      plan: 'MusicPro Premium ($9.99/month)',
      status: 'Active',
      trialDaysRemaining: 14,
      features: [
        'Unlimited music backup analysis',
        'Advanced duplicate detection',
        'Cloud storage optimization',
        'Priority support access',
      ],
    },
    features: {
      analytics: true,
      deepAnalysis: true,
      cloudOptimization: true,
      aiMusicAnalysis: true,
    },
  });
});

// ---- Stripe webhook --------------------------------------------------------
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event = req.body;
  if (webhookSecret) {
    try {
      event = getStripe().webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send('Webhook Error: ' + err.message);
    }
  } else {
    console.warn('STRIPE_WEBHOOK_SECRET not set - skipping signature verification');
  }

  console.log('Stripe webhook received:', event.type);
  res.json({ received: true });
});

// ---- Friendly routes -------------------------------------------------------
app.get('/checkout', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'checkout.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('MusicPro AI server listening on port ' + PORT);
});

module.exports = app;
