# MusicPro AI

Music library analysis that runs on the customer's own device.

**Live:** https://musicpro-ai.pages.dev/

---

## What this product is

MusicPro AI scans the music files a customer already owns and reports, accurately:

1. **Content-verified duplicates** - candidates grouped by normalised name + exact byte size, then confirmed by comparing SHA-256 content hashes. Identically-named files with different audio are explicitly excluded and listed separately as "same name and size, different content".
2. **Storage by format** - file count and total bytes per format (FLAC, WAV, MP3, M4A, AAC, Opus).
3. **Real bitrate measurement** - each audio file is decoded in-browser to read its true duration; average bitrate is then computed from actual file size (size * 8 / duration).
4. **Reclaimable space** - a precise figure: one copy removed per verified duplicate set. Re-encode savings are shown separately and labelled as estimates.
5. **Version groups** - the same track held at different sizes or formats (not duplicates; a keeper decision).
6. **Exportable reports** - CSV, JSON and Markdown (premium).

## What this product deliberately is NOT

These are commercial constraints and honesty commitments, not oversights:

- **No cloud storage or backup.** There is no storage tier, because we do not own disk space to resell. Free-tier infrastructure cannot support it, and pretending otherwise would be dishonest.
- **No file uploads.** Analysis is client-side. This is a genuine privacy advantage, and it also means the cost per customer is effectively zero, which is what makes a $9.99 price point sustainable.
- **No destructive actions.** The product never deletes a customer file; it produces a plan.
- **No invented metrics.** Every number in the UI is computed from the customer's files. The sample library ships with the app so any claim can be reproduced in seconds.

## Pricing

$9.99/month after a 14-day free trial. Premium unlocks unlimited files per scan and report export.
The free plan analyses up to 500 files per scan with no sign-up. Premium does **not** unlock storage,
because there is none - this is stated on the pricing page, in the FAQ, and in the app itself.

## Architecture

- **Host:** Cloudflare Pages project `musicpro-ai` (production branch `main`)
- **Runtime:** one `_worker.js` (Pages advanced mode): static routes + Stripe REST calls
- **Client:** vanilla JS, zero dependencies, no build step
- **Secrets:** `STRIPE_SECRET_KEY` is a `secret_text` env var on the Pages production environment. It is never sent to the browser.

No KV bindings are used: Pages advanced-mode deployments reject `kv_namespaces` bindings with
"Failed to publish your Function. Got error: Unknown internal error occurred."

## Routes

| Method | Route | Notes |
|---|---|---|
| GET | `/` | Landing, pricing, honest-limits section, FAQ |
| GET | `/app.html` | The analyzer (client-side) |
| GET | `/mockups.html` | Product walkthrough |
| GET | `/checkout.html` | Stripe card form |
| GET | `/dashboard.html` | Alias of `/app.html` |
| GET | `/style.css` | Stylesheet |
| GET | `/health` | Health check |
| GET | `/api/plan` | Machine-readable plan limits (freeFileLimit 500, 999 cents, trial 14, storage false) |
| GET | `/api/stripe/public-key` | Publishable key |
| GET | `/api/stripe/price` | Resolves or creates the $9.99/mo price |
| POST | `/api/stripe/create-checkout-session` | Creates customer + 14-day trialing subscription, attaches the card as default payment method |
| POST | `/api/stripe/confirm-payment` | Attaches a payment method and confirms a PaymentIntent |
| GET | `/api/stripe/subscription/:id` | Subscription status |
| POST | `/api/stripe/webhook` | Event receiver |

## Stripe implementation notes

Three API constraints found and worked around during testing:

1. The **Subscriptions** API rejects inline `price_data[product_data]` (that is Checkout-only). A real Price object is required. `ensurePrice()` resolves it via lookup key `musicpro_premium_monthly` and creates the product and price on first use.
2. `products.create` rejects `default_price_data[lookup_key]`. Product and Price are created as two separate calls.
3. A **trialing** subscription has no immediate PaymentIntent, so the card would never be attached and the post-trial charge would fail. The checkout endpoint therefore attaches the submitted PaymentMethod and sets it as the customer's `invoice_settings.default_payment_method` **before** creating the subscription.

## Verified behaviour

The sample 40-file library produces, reproducibly:

- 633.13 MB total, 148.14 MB reclaimable
- 10 verified duplicate sets (hash-matched)
- 7 version groups
- Quality notes including genuine low-bitrate flags (Slow Tide 119 kbps, Northern Drift 74 kbps)

The free-plan gate, the premium unlock, and all routes were exercised against the live deployment.

## Local files

- `public/index.html`, `public/app.html`, `public/mockups.html`, `public/checkout.html`, `public/style.css` are the deployed assets.
- `api/server.js` is a Node/Express equivalent for self-hosting the Stripe API (Heroku/Fly/VPS). The hosted product does not need it - Cloudflare Pages runs the API in `_worker.js`.

## Operational notes

1. **Rotate the Stripe secret key.** It was transmitted in plaintext during development and must be treated as compromised. Rotate in the Stripe dashboard, then update the `STRIPE_SECRET_KEY` env var on the Pages project.
2. **Webhook signature verification** is not yet enforced. Create an endpoint at `https://<domain>/api/stripe/webhook`, store the signing secret as `STRIPE_WEBHOOK_SECRET`, and validate it before relying on webhook events for entitlement.
3. **Entitlement is currently client-side** (a localStorage flag set after a successful Stripe confirmation). This is appropriate for a courtesy gate because the paid feature is report export, not a metered server resource - no server capacity is at risk. If server-side features are added later, entitlement must be verified server-side against the subscription.
4. **Suggested next step:** add a Stripe customer portal link so subscribers can cancel self-service.
