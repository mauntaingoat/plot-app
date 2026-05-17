/**
 * Branded HTML + plain-text per-event notification email.
 *
 * Fires alongside the inbox doc + FCM push from notifyUser when the
 * agent's notificationPrefs has the matching toggle on. Single-column
 * 600px table layout, inline CSS only (Gmail compat), mirrors the
 * tangerine/ink palette used by the auth + digest templates.
 */

export type NotificationKind = 'showing_request' | 'pin_saved' | 'new_subscriber' | 'new_wave'

interface RenderInput {
  kind: NotificationKind
  /** Agent's display name (for greeting). */
  recipientName?: string | null
  /** Plain-text headline (same string the inbox/FCM use). */
  title: string
  /** Plain-text body (same string the inbox/FCM use). */
  body: string
  /** Where the CTA button takes the agent (e.g. dashboard inbox tab). */
  actionUrl: string
  /** Origin used for image URLs + footer links. */
  baseUrl: string
  /** Optional extras surfaced inline (visitor email, question, etc.). */
  extras?: {
    visitorEmail?: string | null
    visitorPhone?: string | null
    question?: string | null
  }
}

interface RenderOutput {
  subject: string
  html: string
  text: string
}

const BRAND = {
  tangerine: '#D94A1F',
  ink: '#0A0E1A',
  graphite: '#475569',
  smoke: '#94A3B8',
  pearl: '#E2E8F0',
  cream: '#F8F5F0',
  ivory: '#FFFCF7',
}

const SUBJECT_BY_KIND: Record<NotificationKind, string> = {
  showing_request: 'New showing request',
  pin_saved: 'Listing saved',
  new_subscriber: 'New subscriber on Reelst',
  new_wave: 'New wave on Reelst',
}

const CTA_BY_KIND: Record<NotificationKind, string> = {
  showing_request: 'Open inbox',
  pin_saved: 'View activity',
  new_subscriber: 'See subscribers',
  new_wave: 'Reply now',
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function renderNotificationEmail(input: RenderInput): RenderOutput {
  const { kind, recipientName, title, body, actionUrl, baseUrl, extras } = input
  const subject = SUBJECT_BY_KIND[kind]
  const cta = CTA_BY_KIND[kind]
  const greeting = recipientName ? `Hi ${recipientName.split(' ')[0]},` : 'Hi,'
  const settingsUrl = `${baseUrl}/dashboard?tab=settings`
  const safeTitle = escapeHtml(title)
  const safeBody = escapeHtml(body)

  // Build an optional extras block — only when the event carries
  // contact info or a question worth surfacing inline. Keeps the
  // common case (save / subscriber) clean.
  const extrasRows: string[] = []
  if (extras?.visitorEmail) {
    extrasRows.push(
      `<tr><td style="padding:6px 0;color:${BRAND.smoke};font-size:12px;width:80px;">Email</td>` +
      `<td style="padding:6px 0;color:${BRAND.ink};font-size:14px;"><a href="mailto:${escapeHtml(extras.visitorEmail)}" style="color:${BRAND.tangerine};text-decoration:none;">${escapeHtml(extras.visitorEmail)}</a></td></tr>`,
    )
  }
  if (extras?.visitorPhone) {
    extrasRows.push(
      `<tr><td style="padding:6px 0;color:${BRAND.smoke};font-size:12px;">Phone</td>` +
      `<td style="padding:6px 0;color:${BRAND.ink};font-size:14px;"><a href="tel:${escapeHtml(extras.visitorPhone)}" style="color:${BRAND.tangerine};text-decoration:none;">${escapeHtml(extras.visitorPhone)}</a></td></tr>`,
    )
  }
  if (extras?.question) {
    extrasRows.push(
      `<tr><td style="padding:6px 0;color:${BRAND.smoke};font-size:12px;vertical-align:top;">Question</td>` +
      `<td style="padding:6px 0;color:${BRAND.ink};font-size:14px;line-height:1.55;">${escapeHtml(extras.question)}</td></tr>`,
    )
  }
  const extrasBlock = extrasRows.length
    ? `<tr><td style="padding:12px 0 4px;">
         <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
           ${extrasRows.join('')}
         </table>
       </td></tr>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.cream};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <span style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${safeBody}</span>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BRAND.cream};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background:${BRAND.ivory};border-radius:18px;overflow:hidden;border:1px solid ${BRAND.pearl};">
        <tr>
          <td style="padding:28px 32px 0;">
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:800;font-size:18px;color:${BRAND.tangerine};letter-spacing:-0.02em;">Reelst</div>
          </td>
        </tr>
        <tr><td style="padding:18px 32px 4px;">
          <p style="margin:0;color:${BRAND.graphite};font-size:14px;">${escapeHtml(greeting)}</p>
        </td></tr>
        <tr><td style="padding:8px 32px 4px;">
          <h1 style="margin:0;color:${BRAND.ink};font-size:22px;font-weight:700;letter-spacing:-0.01em;line-height:1.25;">${safeTitle}</h1>
        </td></tr>
        <tr><td style="padding:6px 32px 4px;">
          <p style="margin:0;color:${BRAND.graphite};font-size:15px;line-height:1.5;">${safeBody}</p>
        </td></tr>
        ${extrasBlock}
        <tr><td style="padding:22px 32px 6px;">
          <a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:${BRAND.tangerine};color:#FFFFFF;text-decoration:none;padding:12px 22px;border-radius:10px;font-size:14px;font-weight:700;letter-spacing:-0.005em;">${escapeHtml(cta)}</a>
        </td></tr>
        <tr><td style="padding:18px 32px 28px;">
          <p style="margin:0;color:${BRAND.smoke};font-size:11.5px;line-height:1.5;">
            You're getting this because <strong>${escapeHtml(SUBJECT_BY_KIND[kind].toLowerCase())}</strong> notifications are on for your Reelst.
            <a href="${escapeHtml(settingsUrl)}" style="color:${BRAND.tangerine};text-decoration:none;">Manage notifications</a>.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const extrasText: string[] = []
  if (extras?.visitorEmail) extrasText.push(`Email: ${extras.visitorEmail}`)
  if (extras?.visitorPhone) extrasText.push(`Phone: ${extras.visitorPhone}`)
  if (extras?.question) extrasText.push(`Question: ${extras.question}`)

  const text = [
    greeting,
    '',
    title,
    body,
    extrasText.length ? '' : null,
    ...extrasText,
    '',
    `${cta}: ${actionUrl}`,
    '',
    `Manage notifications: ${settingsUrl}`,
  ].filter((l) => l !== null).join('\n')

  return { subject, html, text }
}
