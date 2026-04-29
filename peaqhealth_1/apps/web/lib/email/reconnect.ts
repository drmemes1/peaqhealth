import { Resend } from "resend"

const PROVIDER_LABELS: Record<string, string> = {
  whoop: "WHOOP",
  oura: "Oura Ring",
  garmin: "Garmin",
  fitbit: "Fitbit",
  apple_health: "Apple Health",
}

/**
 * Send a reconnection email when a wearable token expires.
 * Fails silently if RESEND_API_KEY is not set.
 */
export async function sendReconnectEmail(
  email: string,
  provider: string,
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping reconnect email")
    return
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const label = PROVIDER_LABELS[provider] ?? provider
  try {
    await resend.emails.send({
      from: "Oravi <noreply@oravi.health>",
      to: email,
      subject: `Your ${label} needs to be reconnected`,
      html: `
        <div style="font-family: 'Instrument Sans', system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; color: #141410;">
          <p style="font-size: 15px; line-height: 1.7; color: rgba(20,20,16,0.60);">
            Your ${label} connection to Oravi has expired. Nightly syncing has been paused until you reconnect.
          </p>
          <a href="https://peaqhealth.vercel.app/settings" style="display: inline-block; margin-top: 24px; padding: 12px 28px; background: #141410; color: #FAFAF8; text-decoration: none; border-radius: 3px; font-size: 14px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase;">
            Reconnect now
          </a>
          <p style="margin-top: 32px; font-size: 11px; color: rgba(20,20,16,0.30);">
            Oravi · peaqhealth.vercel.app
          </p>
        </div>
      `,
    })
    console.log(`[email] reconnect email sent to ${email} for ${provider}`)
  } catch (e) {
    console.error(`[email] failed to send reconnect email:`, e)
  }
}
