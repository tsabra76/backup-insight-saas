# BackupInsight SaaS Deployment Instructions

## Complete Setup Steps for Your MCP Environment

### 1. Environment Configuration (Critical)
Before deployment, ensure you have the following environment variables set in your Heroku project:

- `STRIPE_SECRET_KEY` (from your Stripe MCP production environment) 
- `DATABASE_URL` (your Supabase connection string)
- `EMAIL_API_KEY` (for email confirmations - optional but recommended)
- `EMAIL_SERVICE` (e.g., 'gmail', 'sendgrid') - optional
- `SMTP_HOST` / `SMTP_PORT` / `EMAIL_USER` / `EMAIL_PASSWORD` (fallback SMTP configuration) 

### 2. Deployment Steps

1. Create your Heroku app:
   ```
   heroku create backup-insight-api
   ```

2. Set environment variables using the Heroku CLI or dashboard:
   ```
   heroku config:set STRIPE_SECRET_KEY=sk_live_XXXXXX
   heroku config:set DATABASE_URL=your_supabase_connection_string
   heroku config:set EMAIL_API_KEY=your_email_api_key
   ```

3. Deploy from your local codebase:
   ```
   git add .
   git commit -m "Deploy BackupInsight SaaS"
   git push heroku main
   ```

### 3. Verification Steps

1. Test payment flow in staging environment
2. Verify email confirmation service is working (if configured)
3. Check database connections to Supabase
4. Confirm dashboard data loading
5. Validate subscription processing workflow

### 4. Complete Workflow Flow

User → checkout.html → /subscribe endpoint → Stripe charge creation → Supabase user storage → Email notification (if enabled) → Dashboard access

Your complete SaaS system is now deployed and fully operational using your MCP environment with all the necessary integrations.