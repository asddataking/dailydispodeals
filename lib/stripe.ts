import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

function getStripe(): Stripe {
  if (stripeInstance) {
    return stripeInstance
  }

  const secretKey = process.env.STRIPE_TEST_SK_KEY || process.env.STRIPE_SECRET_KEY

  if (!secretKey) {
    throw new Error('STRIPE_TEST_SK_KEY or STRIPE_SECRET_KEY is not configured')
  }

  stripeInstance = new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia',
  })
  return stripeInstance
}

// Export a proxy that lazy-loads the client on first access
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const client = getStripe()
    const value = client[prop as keyof Stripe]
    return typeof value === 'function' ? value.bind(client) : value
  }
})
