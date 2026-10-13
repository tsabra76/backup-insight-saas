# MusicPro AI - LIVE Deployment

## Live URL

https://musicpro-ai.pages.dev/

| Page | URL |
|------|-----|
| Landing / pricing | https://musicpro-ai.pages.dev/ |
| Checkout (card form) | https://musicpro-ai.pages.dev/checkout.html |
| Customer dashboard | https://musicpro-ai.pages.dev/dashboard.html |

## Stripe (LIVE mode)

- Product: MusicPro Premium
- Price: price_1UOKeC4NXDrGH2trC4YQZZp4 - $9.99 USD / month (lookup key musicpro_premium_monthly)
- Trial: 14 days free, card collected up-front, auto-converts to paid
- Publishable key: pk_live_51Ts7n54NXDrGH2trmuZUfnHVlyGuCyuJu0eCQlgSgXjFuOIGr7aZ46FBnA3dKKNxATGhpVIu3W3YqrNRikthI1rL00N4pDw9yK
- Secret key: stored ONLY as an encrypted Cloudflare binding STRIPE_SECRET_KEY (never in client code or the repo)

The product and price are created automatically on first checkout and then reused via the lookup key,
so no manual Stripe dashboard setup is required.

## API routes

| Method | Route | Purpose |
|--------|-------|---------|
| GET  | /health | Service health |
| GET  | /api/stripe/public-key | Returns publishable key |
| GET  | /api/stripe/price | Resolves/creates the $9.99/mo price |
| POST | /api/stripe/create-checkout-session | Creates customer + trialing subscription, attaches card |
| POST | /api/stripe/confirm-payment | Attaches payment method and confirms a PaymentIntent |
| GET  | /api/stripe/subscription/:id | Subscription status lookup |
| GET  | /dashboard-data | Dashboard analytics payload |
| POST | /api/stripe/webhook | Stripe event receiver |

## Verified end-to-end

A real subscription was created against live Stripe:

- Customer cus_VP8wxBBRf783DJ created
- Subscription sub_1UOKeD4NXDrGH2trr0l2gOla created with status trialing (14-day trial)
- Card (PaymentMethod) attached as the customer default payment method for the post-trial charge

The test artifacts were then removed from Stripe (subscription cancelled, customers deleted) to keep
the account clean. Zero errors.

All routes return correct HTTP status and Content-Type (text/html for pages, text/css for the
stylesheet, application/json for APIs).

## Architecture

- Host: Cloudflare Pages project musicpro-ai (production branch main)
- Runtime: a single _worker.js (Pages advanced mode) that serves the site and calls the Stripe REST API directly
- Assets: index.html, checkout.html, dashboard.html, style.css inlined in the worker
- Config: STRIPE_SECRET_KEY is a secret_text env var on the Pages production environment

## Next steps (optional, for the owner)

1. Custom domain - add a domain in Cloudflare Pages -> Custom domains.
2. Webhook secret - create a Stripe webhook endpoint at https://<your-domain>/api/stripe/webhook and
   store the signing secret as the STRIPE_WEBHOOK_SECRET env var, then enable signature verification
   in the /api/stripe/webhook handler.
3. Persistence - replace the in-worker demo analytics with Supabase reads (a Supabase project already
   exists: ftlwmoqycqmweergvtjc).
4. Rotate keys if the Stripe secret key was ever shared outside a secure channel.
