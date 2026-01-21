# Daily Dispo Deals MVP

A Next.js 14 application for delivering personalized daily cannabis deals via email.

## Features

- User subscription management via Stripe
- Personalized deal matching based on user preferences
- Automated daily email delivery
- Deal ingestion pipeline with OCR and AI parsing
- **Dispensary auto-discovery** - Automatically finds dispensaries based on user zip codes
- **Deal quality assurance** - Confidence filtering, duplicate detection, and manual review queue
- **Supabase Edge Functions** - Fast edge-optimized API routes for better performance
- Responsive landing page with modern UI

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Payments**: Stripe
- **Email**: Resend
- **OCR**: OpenAI Vision API
- **AI Parsing**: OpenAI GPT-4o-mini or Google Gemini 1.5 Flash (via Vercel AI Gateway)
- **Geocoding**: Google Maps API (for dispensary discovery)

## Prerequisites

- Node.js 18+ and npm
- Supabase account
- Stripe account
- Resend account
- OpenAI API key (or Google Gemini API key)
- Google Maps API key (for geocoding and dispensary discovery)

## Setup Instructions

### 1. Clone and Install

```bash
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Public Supabase vars (for client-side edge function calls)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
STRIPE_MONTHLY_PRICE_ID=your_monthly_price_id
STRIPE_YEARLY_PRICE_ID=your_yearly_price_id

# Resend
RESEND_API_KEY=your_resend_api_key

# Cron Secrets (generate random strings - see below)
CRON_SECRET=your_random_cron_secret
INGESTION_CRON_SECRET=your_random_ingestion_cron_secret

# App
APP_URL=https://yourdomain.com

# Optional for dev
DEV_SECRET=your_dev_secret
NODE_ENV=development

# For ingestion pipeline
OPENAI_API_KEY=your_openai_api_key

# Geocoding (for dispensary discovery)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Deal Quality Settings (optional)
DEAL_CONFIDENCE_THRESHOLD=0.7  # Min confidence to auto-approve
DEAL_REVIEW_THRESHOLD=0.5      # Confidence below this requires review
ADMIN_EMAIL=admin@yourdomain.com  # For review notifications
```

### 3. Supabase Setup

#### Create Project
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project
3. Copy your project URL and anon key

#### Run Migrations
Use Supabase MCP or the Supabase CLI to apply the migrations:

```bash
# Using Supabase MCP
# Apply migrations in order:
# 1. supabase/migrations/001_initial_schema.sql
# 2. supabase/migrations/002_dispensary_quality.sql
```

Or use the Supabase dashboard SQL editor to run the migration files in order.

#### Create Storage Bucket
1. Go to Storage in Supabase dashboard
2. Create a new bucket named `deal-flyers`
3. Set it to public (optional, for debugging)

### 4. Stripe Setup

#### Create Products and Prices
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Create a product: "Monthly Plan" - $4.20/month recurring
3. Create a product: "Yearly Plan" - $42/year recurring
4. Copy the Price IDs and add them to `.env.local`

#### Set Up Webhook
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the webhook signing secret to `.env.local`

### 5. Resend Setup

1. Go to [Resend](https://resend.com)
2. Create an account and verify your domain (or use Resend's domain for MVP)
3. Copy your API key to `.env.local`
4. Update the `from` email in `app/api/cron/send-daily/route.ts` to match your verified domain

### 6. Vercel AI Gateway Setup

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to your project → Settings → AI Gateway
3. Enable AI Gateway and configure it to proxy AI requests (OpenAI or Google Gemini)
4. Get your AI Gateway API key and URL from the dashboard
5. Add to `.env.local`:
   - `AI_GATEWAY_URL` (optional, defaults to `https://gateway.vercel.ai/v1` if not set)
   - `AI_GATEWAY_API_KEY` (required, your gateway API key)
   - `AI_MODEL_PROVIDER` (optional, set to `google` to use Gemini Flash, defaults to `openai`)

**Model Options:**
- **OpenAI GPT-4o-mini** (default): ~$0.15/1M input, $0.60/1M output tokens
- **Google Gemini 1.5 Flash** (`AI_MODEL_PROVIDER=google`): ~$0.075/1M input, $0.30/1M output tokens (~50% cheaper)

**Note:** Vercel AI Gateway provides caching, rate limiting, and cost optimization for AI requests. For deal parsing with daily ingestion, Gemini Flash can significantly reduce costs while maintaining quality.

### 7. Generate Cron Secrets

These secrets protect your cron endpoints. Generate random strings using one of these methods:

**Option 1: Using Node.js (recommended)**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Option 2: Using OpenSSL**
```bash
openssl rand -hex 32
```

**Option 3: Online Generator**
- Use a secure random string generator like [randomkeygen.com](https://randomkeygen.com/) (use the "CodeIgniter Encryption Keys" section)
- Generate two different strings for `CRON_SECRET` and `INGESTION_CRON_SECRET`

Copy the generated strings to your `.env.local` file.

### 8. Deploy Supabase Edge Functions (Optional but Recommended)

Edge functions provide faster response times by running at the edge. Deploy them using Supabase CLI:

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref rcmutihmkkievrxddkrj

# Deploy edge functions
supabase functions deploy get-deals
supabase functions deploy get-brands
supabase functions deploy save-preferences
```

**Or use Supabase MCP** to deploy:
- Use the `mcp_supabase_deploy_edge_function` tool for each function

**Edge Functions Created:**
- `get-deals` - Fast deal querying with user preferences
- `get-brands` - Fast brand listing
- `save-preferences` - Fast preference saving

**Important:** Edge functions require environment variables set in Supabase dashboard:
1. Go to your Supabase project → Edge Functions → Settings → Secrets
2. Add these secrets:
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Your service role key (same as backend)

**Note:** The frontend automatically uses edge functions when available, with automatic fallback to Next.js API routes if edge functions fail.

### 9. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add all environment variables (including your generated `CRON_SECRET` and `INGESTION_CRON_SECRET`)
4. Configure Cron Jobs:
   - Go to your project → Settings → Cron Jobs
   - The cron jobs are already configured in `vercel.json`:
     - Ingestion: 8 AM daily (`/api/cron/ingest-daily`)
     - Email: 9 AM daily (`/api/cron/send-daily`)
   - **Important:** When configuring cron jobs in Vercel, add these headers:
     - For `/api/cron/send-daily`: `Authorization: Bearer YOUR_CRON_SECRET`
     - For `/api/cron/ingest-daily`: `Authorization: Bearer YOUR_INGESTION_CRON_SECRET`
5. Deploy

### Manual Cron Testing

Test the cron jobs manually:

```bash
# Test email cron
curl -X GET "https://yourdomain.com/api/cron/send-daily" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Test ingestion cron
curl -X GET "https://yourdomain.com/api/cron/ingest-daily" \
  -H "Authorization: Bearer YOUR_INGESTION_CRON_SECRET"
```

## API Routes

### Public Routes
- `POST /api/stripe/create-checkout-session` - Create Stripe checkout
- `POST /api/stripe/webhook` - Stripe webhook handler
- `POST /api/preferences` - Save user preferences
- `GET /api/deals?email=...&date=YYYY-MM-DD` - Get deals for user

### Protected Routes (Cron)
- `GET /api/cron/send-daily` - Send daily emails (requires CRON_SECRET)
- `GET /api/cron/ingest-daily` - Ingest deals from flyers (requires INGESTION_CRON_SECRET)

### Dev Routes
- `POST /api/dev/seed-deals` - Seed sample deals (dev only)

### Ingestion Routes
- `POST /api/ingest/fetch` - Download and store flyer
- `POST /api/ingest/ocr` - Extract text from flyer
- `POST /api/ingest/parse` - Parse deals from OCR text (includes quality checks)

### Admin Routes
- `GET /api/admin/dispensaries` - List all dispensaries with stats
- `POST /api/admin/dispensaries` - Add new dispensary
- `PUT /api/admin/dispensaries` - Update dispensary
- `DELETE /api/admin/dispensaries?id=...` - Deactivate dispensary
- `GET /api/admin/deals/review` - List pending deal reviews
- `POST /api/admin/deals/review` - Approve/reject/fix a deal review

## Database Schema

See `supabase/migrations/001_initial_schema.sql` for the complete schema.

### Tables
- `users` - User accounts
- `subscriptions` - Stripe subscription records
- `preferences` - User deal preferences (triggers dispensary discovery)
- `deals` - Deal listings (with quality metadata: confidence, needs_review, deal_hash)
- `email_logs` - Email delivery logs
- `deal_flyers` - Flyer tracking
- `dispensaries` - Dispensary configurations and locations (auto-discovered)
- `deal_reviews` - Manual review queue for flagged deals

## Project Structure

```
.
├── app/
│   ├── api/              # API routes
│   ├── components/       # React components
│   ├── success/          # Success page
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Landing page
│   └── globals.css      # Global styles
├── lib/                 # Utility libraries
│   ├── supabase/        # Supabase client
│   ├── email/           # Email rendering
│   ├── stripe.ts        # Stripe client
│   ├── resend.ts        # Resend client
│   ├── ocr.ts           # OCR utilities
│   ├── ai-parser.ts     # AI parsing (OpenAI/Gemini)
│   ├── file-utils.ts    # File utilities
│   ├── geocoding.ts     # Geocoding utilities
│   ├── dispensary-discovery.ts  # Auto-discovery logic
│   └── deal-quality.ts  # Quality checks and validation
├── supabase/
│   └── migrations/      # Database migrations
└── vercel.json          # Vercel configuration
```

## Testing

### Seed Sample Data

```bash
curl -X POST "http://localhost:3000/api/dev/seed-deals" \
  -H "Authorization: Bearer YOUR_DEV_SECRET"
```

### Test User Flow

1. Visit landing page
2. Enter email and click "Get My Deals"
3. Select plan (monthly/yearly)
4. Complete Stripe checkout
5. Set preferences on success page
6. Verify email received (check Resend dashboard)

## Troubleshooting

### Webhook Not Receiving Events
- Verify webhook URL is correct in Stripe dashboard
- Check webhook secret matches `.env.local`
- Ensure endpoint is publicly accessible

### Emails Not Sending
- Verify Resend API key is correct
- Check Resend domain is verified
- Review email logs in `email_logs` table

### OCR Failing
- Verify OpenAI API key is valid
- Check API quota/limits
- Ensure file format is supported (PNG, JPG, PDF)

### Dispensary Discovery Not Working
- Verify `GOOGLE_MAPS_API_KEY` is set and valid
- Check that users have zip codes and radius in preferences
- Review dispensaries table to see discovered dispensaries

### Deal Quality Issues
- Check `deal_reviews` table for flagged deals
- Review confidence scores in `deals` table
- Adjust `DEAL_CONFIDENCE_THRESHOLD` and `DEAL_REVIEW_THRESHOLD` if needed

## Dispensary Auto-Discovery

The system automatically discovers and tracks dispensaries based on user locations:

1. **User signs up** with zip code + radius preference
2. **System discovers** dispensaries near that zip code
3. **Dispensaries added** to database with locations and flyer URLs
4. **Daily cron** processes only dispensaries with active users nearby
5. **As users grow**, dispensary list grows organically

Dispensaries are tracked with:
- Location (lat/lng, zip, city)
- Flyer URL for daily ingestion
- Success rate tracking
- Auto-disable if reliability drops

## Deal Quality Assurance

Multiple layers ensure deal quality:

1. **Confidence Filtering** - AI returns confidence scores (0-1)
2. **Duplicate Detection** - Hash-based deduplication prevents duplicates
3. **Price Validation** - Flags unusually high/low prices
4. **Category Validation** - Ensures category matches product title
5. **Manual Review Queue** - Suspicious deals flagged for admin review

**Quality Thresholds:**
- `DEAL_CONFIDENCE_THRESHOLD` (default: 0.7) - Auto-approve above this
- `DEAL_REVIEW_THRESHOLD` (default: 0.5) - Flag for review below this

Deals below the review threshold are automatically flagged and added to the review queue for manual approval.

## License

MIT
