# Daily Dispo Deals MVP

A Next.js 14 application for delivering personalized daily cannabis deals via email.

## Features

- User subscription management via Stripe
- Personalized deal matching based on user preferences
- Automated daily email delivery
- Deal ingestion pipeline with OCR and AI parsing
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
- **AI Parsing**: OpenAI GPT-4.1-mini

## Prerequisites

- Node.js 18+ and npm
- Supabase account
- Stripe account
- Resend account
- OpenAI API key

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

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
STRIPE_MONTHLY_PRICE_ID=your_monthly_price_id
STRIPE_YEARLY_PRICE_ID=your_yearly_price_id

# Resend
RESEND_API_KEY=your_resend_api_key

# Cron
CRON_SECRET=your_random_cron_secret
INGESTION_CRON_SECRET=your_random_ingestion_cron_secret

# App
APP_URL=https://yourdomain.com

# Optional for dev
DEV_SECRET=your_dev_secret
NODE_ENV=development

# For ingestion pipeline
OPENAI_API_KEY=your_openai_api_key
```

### 3. Supabase Setup

#### Create Project
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project
3. Copy your project URL and anon key

#### Run Migration
Use Supabase MCP or the Supabase CLI to apply the migration:

```bash
# Using Supabase MCP
# Apply migration from supabase/migrations/001_initial_schema.sql
```

Or use the Supabase dashboard SQL editor to run the migration file.

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

### 6. OpenAI Setup

1. Go to [OpenAI Platform](https://platform.openai.com)
2. Create an API key
3. Add it to `.env.local`

### 7. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add all environment variables
4. Deploy

The cron jobs are configured in `vercel.json`:
- Ingestion: 8 AM daily
- Email: 9 AM daily

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
- `POST /api/ingest/parse` - Parse deals from OCR text

## Database Schema

See `supabase/migrations/001_initial_schema.sql` for the complete schema.

### Tables
- `users` - User accounts
- `subscriptions` - Stripe subscription records
- `preferences` - User deal preferences
- `deals` - Deal listings
- `email_logs` - Email delivery logs
- `deal_flyers` - Flyer tracking

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
│   ├── ai-parser.ts     # AI parsing
│   └── file-utils.ts    # File utilities
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

## License

MIT
