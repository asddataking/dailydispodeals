# Pre-Launch Checklist for Daily Dispo Deals

## ✅ Email Flow Status

**Current Flow:**
1. User enters email on homepage → Opens plan selection modal
2. User selects plan → Creates Stripe checkout session (email passed to Stripe)
3. After payment → Stripe webhook creates user + subscription in Supabase
4. User redirected to `/success` → Preferences modal opens
5. Preferences saved to Supabase via Edge Function or API route

**⚠️ Issue Found:** Success page tries to get email from URL params, but Stripe doesn't include it in the redirect URL by default.

## 🔧 Required Fixes

### 1. Fix Success Page Email Retrieval
The success page currently tries to get email from URL params, but Stripe checkout redirect doesn't include it. We need to:
- Option A: Add email to Stripe checkout metadata and retrieve from session
- Option B: Store email in session/cookie before checkout
- Option C: Fetch email from Stripe session on success page

**Recommendation:** Option C - Fetch from Stripe session using session_id

### 2. Vercel Cron Jobs Configuration
Your cron jobs are configured in `vercel.json`:
- Ingest Daily: 8 AM EST (0 8 * * *)
- Send Daily: 9 AM EST (0 9 * * *)

**Action Required:**
1. Go to Vercel Dashboard → Your Project → Settings → Cron Jobs
2. Add cron secrets:
   - `CRON_SECRET` - for send-daily route
   - `INGESTION_CRON_SECRET` - for ingest-daily route
3. Vercel will automatically call these routes with `Authorization: Bearer <SECRET>` header

### 3. Environment Variables Checklist
Ensure these are set in Vercel:
- ✅ All Supabase keys
- ✅ Stripe keys (including webhook secret)
- ✅ Resend API key
- ✅ CRON_SECRET (generate random string)
- ✅ INGESTION_CRON_SECRET (generate random string)
- ✅ AI_GATEWAY_API_KEY
- ✅ AI_MODEL_PROVIDER (openai or google)
- ✅ GOOGLE_MAPS_API_KEY (for dispensary discovery)
- ✅ APP_URL (your domain)

## 🚀 Easy Wins & Optimizations

### High Priority
1. **Fix success page email retrieval** - Critical for user flow
2. **Add error boundaries** - Prevent crashes
3. **Add loading states** - Better UX
4. **Email validation feedback** - Real-time validation

### Medium Priority
5. **Image optimization** - Convert lake.jpg to WebP
6. **Add analytics events** - Track conversions (Stripe checkout, preferences saved)
7. **Add toast notifications** - For success/error messages
8. **404 page** - Custom error page
9. **Rate limiting** - Protect API routes

### Low Priority (Future)
10. **Email list capture** - For non-paying visitors (newsletter)
11. **Referral system** - Track where users come from
12. **A/B testing** - Test different hero text
13. **Progressive Web App** - Mobile app-like experience

## 📋 Pre-Launch Testing

### Test Checklist:
- [ ] Complete signup flow: Email → Plan → Checkout → Success → Preferences
- [ ] Verify user created in Supabase after Stripe webhook
- [ ] Verify subscription created in Supabase
- [ ] Test preferences save (with and without zip/brands)
- [ ] Test cron job endpoints manually (with auth header)
- [ ] Verify Stripe webhook endpoint is accessible from Stripe dashboard
- [ ] Test email sending (trigger manually)
- [ ] Test on mobile devices
- [ ] Test all modals open/close properly
- [ ] Verify Google Analytics tracking
- [ ] Check social sharing previews (Facebook Debugger, Twitter Card Validator)

## 🎯 Ready to Launch?

**Current Status:** ⚠️ Almost ready, but needs fixes:

1. **Critical:** Fix success page email retrieval
2. **Critical:** Configure Vercel cron secrets
3. **Important:** Test complete user flow end-to-end
4. **Important:** Verify Stripe webhook is configured correctly

**Estimated Time to Launch-Ready:** 30-60 minutes (fixes + testing)
