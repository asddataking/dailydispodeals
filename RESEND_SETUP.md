# Resend Email Setup Guide

This guide explains how to configure Resend for sending emails in your Daily Dispo Deals application.

## Current Email Implementation

Your application sends emails through:
- **Daily Deal Emails**: Sent via cron job (`/api/cron/send-daily`) at 9 AM daily
- **From Address**: `Daily Dispo Deals <deals@dailydispodeals.com>`
- **Email Template**: HTML template with deal cards, unsubscribe links, and preference management

## Resend Setup Instructions

### Step 1: Create Resend Account

1. Go to [Resend.com](https://resend.com)
2. Sign up for a free account (100 emails/day free tier)
3. Verify your email address

### Step 2: Get Your API Key

1. Navigate to [API Keys](https://resend.com/api-keys) in Resend dashboard
2. Click **"Create API Key"**
3. Give it a name (e.g., "Daily Dispo Deals Production")
4. Copy the API key (starts with `re_...`)
5. Add it to your `.env.local`:
   ```bash
   RESEND_API_KEY=re_your_api_key_here
   ```

### Step 3: Verify Your Domain (Required for Production)

**Important**: To send emails from `deals@dailydispodeals.com`, you must verify your domain in Resend.

1. Go to [Domains](https://resend.com/domains) in Resend dashboard
2. Click **"Add Domain"**
3. Enter your domain: `dailydispodeals.com`
4. Resend will provide DNS records to add:

#### DNS Records to Add

Add these records to your domain's DNS settings (wherever you manage DNS - Cloudflare, GoDaddy, etc.):

**Record 1: SPF Record**
```
Type: TXT
Name: @ (or dailydispodeals.com)
Value: v=spf1 include:resend.com ~all
TTL: 3600
```

**Record 2: DKIM Record**
```
Type: TXT
Name: resend._domainkey (or resend._domainkey.dailydispodeals.com)
Value: [Resend will provide this - looks like: p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC...]
TTL: 3600
```

**Record 3: DMARC Record (Optional but Recommended)**
```
Type: TXT
Name: _dmarc (or _dmarc.dailydispodeals.com)
Value: v=DMARC1; p=none; rua=mailto:dmarc@dailydispodeals.com
TTL: 3600
```

5. After adding DNS records, click **"Verify"** in Resend dashboard
6. Wait for DNS propagation (can take up to 48 hours, usually faster)
7. Once verified, you'll see a green checkmark ✅

### Step 4: Test Email Sending

#### Option A: Use Test Endpoint (Recommended)

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Send a test email using the test endpoint:
   ```bash
   curl -X POST http://localhost:3000/api/test-email \
     -H "Content-Type: application/json" \
     -d '{"email":"your-email@example.com"}'
   ```

   Or use PowerShell:
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:3000/api/test-email" -Method POST -ContentType "application/json" -Body '{"email":"your-email@example.com"}'
   ```

3. Check your email inbox for the test email

#### Option B: Test via Resend Dashboard

1. Go to [Resend Dashboard → Emails](https://resend.com/emails)
2. Click **"Send Test Email"**
3. Enter recipient email
4. Use the same "from" address: `deals@dailydispodeals.com`
5. Send a test

### Step 5: Configure Production Environment

1. **Add to Vercel Environment Variables**:
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add: `RESEND_API_KEY` = `re_your_api_key_here`
   - Select environments: Production, Preview, Development
   - Click **"Save"**

2. **Verify Domain in Production**:
   - Make sure DNS records are added and verified in Resend
   - Domain verification is required before emails will send

### Step 6: Monitor Email Delivery

1. **Resend Dashboard**:
   - Go to [Emails](https://resend.com/emails) to see sent emails
   - Check delivery status, opens, clicks
   - View bounce/spam reports

2. **Application Logs**:
   - Check Sentry for email sending errors
   - Check Vercel function logs for cron job execution
   - Email logs are stored in `email_logs` table in Supabase

## Email Configuration Details

### From Address
- **Format**: `Daily Dispo Deals <deals@dailydispodeals.com>`
- **Domain**: Must be verified in Resend
- **Location**: `app/api/cron/send-daily/route.ts` (line 259)

### Email Template
- **File**: `lib/email/render.ts`
- **Features**:
  - HTML email with deal cards
  - Unsubscribe link
  - Preference management link
  - Responsive design

### Unsubscribe Handling
- **Endpoint**: `/api/unsubscribe`
- **Token-based**: Secure unsubscribe tokens prevent unauthorized unsubscribes
- **Secret**: Set `UNSUBSCRIBE_SECRET` in environment variables

## Troubleshooting

### Emails Not Sending

1. **Check API Key**:
   - Verify `RESEND_API_KEY` is set correctly
   - Check it starts with `re_`
   - Ensure it's not expired or revoked

2. **Check Domain Verification**:
   - Go to Resend → Domains
   - Verify domain shows as "Verified" ✅
   - Check DNS records are correct

3. **Check Logs**:
   - Resend Dashboard → Emails (see delivery status)
   - Sentry (check for errors)
   - Vercel function logs

### Domain Verification Issues

1. **DNS Propagation**:
   - DNS changes can take 24-48 hours
   - Use `nslookup` or `dig` to verify records are live
   - Check DNS at: https://mxtoolbox.com/SuperTool.aspx

2. **Common Issues**:
   - Wrong DNS record type (must be TXT)
   - Missing @ symbol in record name
   - Incorrect record values (copy exactly from Resend)
   - DNS provider caching (wait or clear cache)

### Test Mode (Development)

If your domain isn't verified yet, Resend allows sending to:
- Your verified email address (the one you signed up with)
- Any email you add to "Authorized Recipients" in Resend settings

**To add authorized recipients**:
1. Go to Resend → Settings → Authorized Recipients
2. Add email addresses you want to test with
3. You can send to these addresses even without domain verification

## Production Checklist

- [ ] Resend account created
- [ ] API key added to `.env.local` and Vercel
- [ ] Domain `dailydispodeals.com` added to Resend
- [ ] DNS records (SPF, DKIM) added to domain
- [ ] Domain verified in Resend dashboard
- [ ] Test email sent successfully
- [ ] Cron job tested (or wait for scheduled run)
- [ ] Email logs checked in Supabase `email_logs` table
- [ ] Unsubscribe flow tested

## Rate Limits

- **Free Tier**: 100 emails/day, 3,000 emails/month
- **Pro Tier**: 50,000 emails/month
- **Enterprise**: Custom limits

Monitor usage in Resend Dashboard → Usage

## Security Notes

- Never commit `RESEND_API_KEY` to git
- Use environment variables only
- Rotate API keys periodically
- Monitor for unauthorized usage in Resend dashboard
- Unsubscribe tokens are cryptographically signed
