import { Resend } from 'resend'

let resendInstance: Resend | null = null

function getResend(): Resend {
  if (resendInstance) {
    return resendInstance
  }

  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    // During build, env vars might not be available
    // Create a client with placeholder for build-time analysis
    resendInstance = new Resend('placeholder-key')
    return resendInstance
  }

  resendInstance = new Resend(apiKey)
  return resendInstance
}

// Export a proxy that lazy-loads the client on first access
export const resend = new Proxy({} as Resend, {
  get(_target, prop) {
    const client = getResend()
    const value = client[prop as keyof Resend]
    return typeof value === 'function' ? value.bind(client) : value
  }
})
