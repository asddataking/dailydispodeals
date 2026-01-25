import { createHash } from 'crypto'

/** Deal shape from Supabase (deals + brands) used for daily emails */
export type DealForEmail = {
  dispensary_name: string
  title: string
  product_name?: string | null
  price_text: string
  city: string | null
  source_url: string | null
  brands?: { name: string } | null
}

/**
 * Build variables for the Resend deals template (lib/email/deals-template.html).
 * Use with resend.emails.send({ template: { id: RESEND_DEALS_TEMPLATE_ID, variables } }).
 * Template variables: ZONE_NAME, FORMATTED_DATE, DEALS_HTML, UNSUBSCRIBE_LINK.
 */
export function buildDealsTemplateVariables(
  deals: DealForEmail[],
  zoneZip: string,
  userEmail: string,
  appUrl: string,
  dateStr: string // YYYY-MM-DD
): { ZONE_NAME: string; FORMATTED_DATE: string; DEALS_HTML: string; UNSUBSCRIBE_LINK: string } {
  const unsubscribeToken = createHash('sha256')
    .update(`${userEmail}:${process.env.UNSUBSCRIBE_SECRET || 'change-me-in-production'}`)
    .digest('hex')
    .substring(0, 16)
  const UNSUBSCRIBE_LINK = `${appUrl}/api/unsubscribe?email=${encodeURIComponent(userEmail)}&token=${unsubscribeToken}`

  const date = new Date(dateStr + 'T12:00:00Z')
  const FORMATTED_DATE = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const DEALS_HTML =
    deals.length === 0
      ? '<p style="padding: 20px; text-align: center; color: #555;">No deals in this zone today — check back soon!</p>'
      : deals
          .map((deal) => {
            const brandName = deal.brands?.name
            const title = brandName && deal.product_name ? `${brandName} ${deal.product_name}` : deal.title
            const description = [deal.dispensary_name, deal.city].filter(Boolean).join(' • ') || deal.dispensary_name
            const ctaUrl = deal.source_url || ''
            const ctaText = 'Verify Deal'
            const ctaBlock =
              ctaUrl && ctaText
                ? `<a href="${escapeHtml(ctaUrl)}" class="btn">${escapeHtml(ctaText)}</a>`
                : ''
            return `<div class="deal"><p class="deal-title">${escapeHtml(title)}</p><p class="deal-details">${escapeHtml(description)}</p><p class="deal-price">${escapeHtml(deal.price_text)}</p>${ctaBlock}</div>`
          })
          .join('')

  return {
    ZONE_NAME: zoneZip,
    FORMATTED_DATE,
    DEALS_HTML,
    UNSUBSCRIBE_LINK,
  }
}

/** Subject line for daily deals emails */
export function getDealsEmailSubject(dealCount: number): string {
  return `Today's Dispo Deals - ${dealCount} ${dealCount === 1 ? 'Deal' : 'Deals'} for You`
}

export function renderWelcomeEmail(userEmail: string, appUrl: string): { subject: string; html: string } {
  const subject = 'Welcome to Daily Dispo Deals'
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${escapeHtml(subject)}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
        <div style="background: linear-gradient(135deg, #0a2540 0%, #136694 100%); padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Daily Dispo Deals</h1>
        </div>
        <div style="background: #ffffff; padding: 24px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #0a2540; margin: 0 0 16px 0; font-size: 20px;">You're in!</h2>
          <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px;">
            Thanks for signing up. Set your preferences to get personalized cannabis deals delivered to your inbox.
          </p>
          <p style="margin: 0 0 24px 0;">
            <a href="${appUrl}?email=${encodeURIComponent(userEmail)}" style="display: inline-block; padding: 12px 24px; background: #136694; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">Set Preferences</a>
          </p>
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            Daily Dispo Deals – your personalized cannabis deals, daily.
          </p>
        </div>
      </body>
    </html>
  `
  return { subject, html }
}

export function renderDailyDealsEmail(
  deals: Array<{
    dispensary_name: string
    title: string
    product_name?: string | null
    price_text: string
    city: string | null
    source_url: string | null
    brands?: { name: string } | null
  }>,
  userEmail: string,
  appUrl: string
): { subject: string; html: string } {
  const dealCount = deals.length
  const subject = `Today's Dispo Deals - ${dealCount} ${dealCount === 1 ? 'Deal' : 'Deals'} for You`
  
  // Generate unsubscribe token
  const unsubscribeToken = createHash('sha256')
    .update(`${userEmail}:${process.env.UNSUBSCRIBE_SECRET || 'change-me-in-production'}`)
    .digest('hex')
    .substring(0, 16)
  
  const unsubscribeUrl = `${appUrl}/api/unsubscribe?email=${encodeURIComponent(userEmail)}&token=${unsubscribeToken}`
  
  const dealCards = deals.map(deal => {
    const brandName = deal.brands?.name
    const displayTitle = brandName && deal.product_name 
      ? `${brandName} ${deal.product_name}` 
      : deal.title
    
    return `
    <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px; background: #ffffff;">
      <h3 style="margin: 0 0 8px 0; color: #0a2540; font-size: 18px;">${escapeHtml(deal.dispensary_name)}</h3>
      ${brandName ? `<p style="margin: 0 0 4px 0; color: #136694; font-size: 14px; font-weight: 600; text-transform: uppercase;">${escapeHtml(brandName)}</p>` : ''}
      <p style="margin: 0 0 8px 0; color: #374151; font-size: 16px; font-weight: 600;">${escapeHtml(displayTitle)}</p>
      <p style="margin: 0 0 8px 0; color: #059669; font-size: 18px; font-weight: 700;">${escapeHtml(deal.price_text)}</p>
      ${deal.city ? `<p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">📍 ${escapeHtml(deal.city)}</p>` : ''}
      ${deal.source_url ? `<a href="${escapeHtml(deal.source_url)}" style="color: #136694; text-decoration: none; font-size: 14px;">Verify Deal →</a>` : ''}
    </div>
  `}).join('')

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
        <div style="background: linear-gradient(135deg, #0a2540 0%, #136694 100%); padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Daily Dispo Deals</h1>
        </div>
        <div style="background: #ffffff; padding: 24px; border-radius: 0 0 8px 8px;">
          <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px;">
            <a href="${appUrl}?email=${encodeURIComponent(userEmail)}" style="color: #136694; text-decoration: none;">Edit preferences</a>
          </p>
          <h2 style="color: #0a2540; margin: 0 0 24px 0; font-size: 20px;">Today's Picks</h2>
          ${dealCards}
          <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 12px; text-align: center;">
            Daily Dispo Deals - Your personalized cannabis deals delivered daily<br>
            <a href="${unsubscribeUrl}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a> | 
            <a href="${appUrl}?email=${encodeURIComponent(userEmail)}" style="color: #9ca3af; text-decoration: underline;">Manage Preferences</a>
          </p>
        </div>
      </body>
    </html>
  `

  return { subject, html }
}

/** Weekly summary for free-plan users: best deals near zip from the last 7 days */
export function renderWeeklySummaryEmail(
  deals: Array<{
    dispensary_name: string
    title: string
    product_name?: string | null
    price_text: string
    city: string | null
    source_url: string | null
    brands?: { name: string } | null
  }>,
  userEmail: string,
  appUrl: string,
  zip: string
): { subject: string; html: string } {
  const dealCount = deals.length
  const subject =
    dealCount > 0
      ? `Your Weekly Dispo Deals — ${dealCount} ${dealCount === 1 ? 'Deal' : 'Deals'} Near You`
      : 'Your Weekly Dispo Deals — No New Deals This Week'

  const unsubscribeToken = createHash('sha256')
    .update(`${userEmail}:${process.env.UNSUBSCRIBE_SECRET || 'change-me-in-production'}`)
    .digest('hex')
    .substring(0, 16)
  const unsubscribeUrl = `${appUrl}/api/unsubscribe?email=${encodeURIComponent(userEmail)}&token=${unsubscribeToken}`
  const manageUrl = `${appUrl}?email=${encodeURIComponent(userEmail)}`

  const dealCards =
    deals.length === 0
      ? '<p style="padding: 20px; text-align: center; color: #555;">No new deals in your area this week. We’ll try again next week.</p>'
      : deals.map((deal) => {
          const brandName = deal.brands?.name
          const displayTitle = brandName && deal.product_name ? `${brandName} ${deal.product_name}` : deal.title
          return `
    <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px; background: #ffffff;">
      <h3 style="margin: 0 0 8px 0; color: #0a2540; font-size: 18px;">${escapeHtml(deal.dispensary_name)}</h3>
      ${brandName ? `<p style="margin: 0 0 4px 0; color: #136694; font-size: 14px; font-weight: 600; text-transform: uppercase;">${escapeHtml(brandName)}</p>` : ''}
      <p style="margin: 0 0 8px 0; color: #374151; font-size: 16px; font-weight: 600;">${escapeHtml(displayTitle)}</p>
      <p style="margin: 0 0 8px 0; color: #059669; font-size: 18px; font-weight: 700;">${escapeHtml(deal.price_text)}</p>
      ${deal.city ? `<p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">📍 ${escapeHtml(deal.city)}</p>` : ''}
      ${deal.source_url ? `<a href="${escapeHtml(deal.source_url)}" style="color: #136694; text-decoration: none; font-size: 14px;">Verify Deal →</a>` : ''}
    </div>
  `
        }).join('')

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${escapeHtml(subject)}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
        <div style="background: linear-gradient(135deg, #0a2540 0%, #136694 100%); padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Daily Dispo Deals</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Weekly Summary</p>
        </div>
        <div style="background: #ffffff; padding: 24px; border-radius: 0 0 8px 8px;">
          <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px;">
            Here are the best deals we found near <strong>${escapeHtml(zip)}</strong> this past week.
          </p>
          <h2 style="color: #0a2540; margin: 0 0 16px 0; font-size: 20px;">Best of the Week</h2>
          ${dealCards}
          <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 12px; text-align: center;">
            <a href="${unsubscribeUrl}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a> | 
            <a href="${manageUrl}" style="color: #9ca3af; text-decoration: underline;">Update zip</a>
          </p>
        </div>
      </body>
    </html>
  `
  return { subject, html }
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}
