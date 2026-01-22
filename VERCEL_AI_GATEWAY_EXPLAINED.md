# Vercel AI Gateway: What It Does & Why It Helps With Rate Limits

## Current Situation

Your app is using **direct Gemini API calls** when `GEMINI_API_KEY` is set. This means:
- ✅ Direct connection to Google's Gemini API (no middleman)
- ❌ **No protection against Gemini's rate limits** - you hit 429 errors directly
- ❌ **No automatic retries** when rate limited
- ❌ **No request queuing** - failed requests just fail
- ❌ **No response caching** - duplicate requests still hit the API

## What Vercel AI Gateway Actually Does

### 1. **Rate Limit Protection & Retry Logic**
When Gemini returns a 429 (rate limit), the gateway:
- Automatically retries the request after the rate limit window
- Queues requests instead of failing immediately
- Handles exponential backoff for you

**Without Gateway:**
```typescript
// Direct API call - fails immediately on rate limit
const result = await generateText({ model, prompt })
// ❌ Throws error: "429 Rate limit exceeded"
```

**With Gateway:**
```typescript
// Gateway call - automatically retries
const result = await generateText({ model, prompt })
// ✅ Gateway queues and retries automatically
```

### 2. **Response Caching**
The gateway can cache responses for identical or similar prompts:
- Same OCR text → cached response (no API call)
- Similar deal extraction prompts → potentially cached
- **Saves money** and **reduces API calls**

**Example:**
- You parse the same dispensary flyer twice → second call uses cache
- Multiple users request same city deals → cached response

### 3. **Request Queuing**
When you hit rate limits:
- Gateway queues requests instead of failing
- Processes them as rate limits allow
- Your app doesn't need custom retry logic

### 4. **Analytics & Visibility**
- See exactly how many API calls you're making
- Track costs per endpoint
- Monitor rate limit events
- Better debugging when things go wrong

### 5. **Cost Optimization**
- Caching reduces duplicate API calls
- Better request management = fewer wasted calls
- Can route to cheaper models when appropriate

## How Your Code Currently Works

Looking at your code in `lib/ai-parser.ts`, `lib/ocr.ts`, and `lib/website-deals.ts`:

```typescript
// Current logic:
const geminiApiKey = process.env.GEMINI_API_KEY
const gatewayApiKey = process.env.AI_GATEWAY_API_KEY

if (geminiApiKey) {
  // Direct API - NO gateway protection
  const google = createGoogleGenerativeAI({
    apiKey: geminiApiKey,
    // No baseURL = direct to Google
  })
} else if (gatewayApiKey) {
  // Gateway - HAS protection
  const google = createGoogleGenerativeAI({
    apiKey: gatewayApiKey,
    baseURL: 'https://gateway.vercel.ai/v1', // Routes through gateway
  })
}
```

**The Problem:** When `GEMINI_API_KEY` is set, you bypass the gateway entirely.

## The Solution: Use Gateway for Rate Limit Protection

### Option 1: Switch to Gateway (Recommended for Rate Limit Issues)

Remove `GEMINI_API_KEY` and use only `AI_GATEWAY_API_KEY`:

```bash
# Remove or comment out:
# GEMINI_API_KEY=your_key

# Use only:
AI_GATEWAY_API_KEY=your_vercel_gateway_key
AI_GATEWAY_URL=https://gateway.vercel.ai/v1
AI_MODEL_PROVIDER=google
```

**Benefits:**
- ✅ Automatic rate limit handling
- ✅ Response caching
- ✅ Request queuing
- ✅ Better analytics

**Trade-off:**
- Slightly higher latency (one extra hop)
- Gateway may have its own rate limits (but they're usually higher)

### Option 2: Add Manual Retry Logic (Keep Direct API)

If you want to keep direct API calls, add retry logic:

```typescript
async function generateWithRetry(model, prompt, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await generateText({ model, prompt })
    } catch (error) {
      if (error.status === 429 && i < maxRetries - 1) {
        const retryAfter = error.headers?.['retry-after'] || 60
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000))
        continue
      }
      throw error
    }
  }
}
```

**But this is more work and doesn't give you caching.**

## Recommendation

**For your use case (daily ingestion, deal parsing):**

1. **Use Vercel AI Gateway** - The rate limit protection is worth it
2. **Enable caching** in gateway settings for similar prompts
3. **Monitor gateway analytics** to see actual API usage

The gateway is specifically designed to solve the rate limit problem you're experiencing. The slight latency increase is negligible compared to the reliability gains.

## How to Switch

1. Go to Vercel Dashboard → Your Project → Settings → AI Gateway
2. Enable AI Gateway and configure it for Google Gemini
3. Get your `AI_GATEWAY_API_KEY`
4. Update your `.env`:
   ```bash
   # Comment out or remove:
   # GEMINI_API_KEY=...
   
   # Add:
   AI_GATEWAY_API_KEY=your_gateway_key
   AI_GATEWAY_URL=https://gateway.vercel.ai/v1
   AI_MODEL_PROVIDER=google
   ```
5. Your code will automatically use the gateway (it already supports it!)

## What About the Admin Chat?

Your admin chat (`app/api/admin/chat/route.ts`) currently **only** uses direct API:

```typescript
const geminiApiKey = process.env.GEMINI_API_KEY
if (!geminiApiKey) {
  return serverError('GEMINI_API_KEY not configured')
}
```

You might want to update this to also support the gateway as a fallback, or switch it to gateway-only.
