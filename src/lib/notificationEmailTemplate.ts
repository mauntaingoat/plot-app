/**
 * Branded HTML + plain-text per-event notification email.
 *
 * Three-band layout matching the auth template (functions/src/email/template.ts):
 *   1. White header band: logo + Reelst wordmark
 *   2. Tangerine grid background band: white rounded message card with
 *      kind eyebrow, headline, body, optional contact/question extras
 *      (wave only), and tangerine gradient CTA button
 *   3. White footer band: "you got this because X notifications are on"
 *      fineprint, Manage notifications + Privacy + Terms links, Reelst
 *      DBA tag, reply-to address
 *
 * IMPORTANT: This file is mirrored at functions/src/email/notificationEmail.ts.
 * The frontend copy powers the /dev/email-preview page; the functions copy is
 * what actually ships in sent emails. Keep them in sync — change one,
 * change the other.
 */

/** Three event kinds — Save and Subscribe are the same thing in the
 *  data layer (a buyer hits "Save Agent" → enters their email → that
 *  writes a digestSubscriptions doc). Internal name stays
 *  `new_subscriber` but user-facing copy says "Save" since that's how
 *  agents think of it. */
export type NotificationKind = 'showing_request' | 'new_subscriber' | 'new_wave'

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
  /** Origin used for image URLs + footer links. No trailing slash. */
  baseUrl: string
  /** Used as the reply-to address in the footer. */
  fromAddress?: string
  /** Optional extras surfaced inline in a metadata table (visitor
   *  contact, question text). Only shown when at least one is set. */
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
  tangerineLight: '#FF8552',
  tangerineSoft: '#FFE7DA',
  ink: '#0A0E1A',
  graphite: '#475569',
  smoke: '#94A3B8',
  pearl: '#E2E8F0',
  cream: '#F8F5F0',
  warmWhite: '#FAF7F2',
  ivory: '#FFFCF7',
}

interface KindCopy {
  subject: string
  preheader: string
  eyebrow: string
  cta: string
  /** Fineprint reason for receiving the email — surfaces the toggle name. */
  reason: string
}

const COPY: Record<NotificationKind, KindCopy> = {
  showing_request: {
    subject: 'New showing request on Reelst',
    preheader: 'Someone wants to tour one of your listings.',
    eyebrow: 'NEW SHOWING REQUEST',
    cta: 'Reply now',
    reason: 'Showing request',
  },
  new_subscriber: {
    subject: 'You have a new save on Reelst',
    preheader: 'A buyer just added you to their map.',
    eyebrow: 'NEW SAVE',
    cta: 'See saves',
    reason: 'Profile saves',
  },
  new_wave: {
    subject: 'New wave on Reelst',
    preheader: 'A buyer asked about one of your listings.',
    eyebrow: 'NEW WAVE',
    cta: 'Reply now',
    reason: 'Waves',
  },
}

/** Mirrors the .map-grid CSS class from the auth template so the
 *  tangerine grid pattern band matches across all Reelst emails. */
const GRID_CSS = `
.reelst-grid-bg {
  background-color: #FFF3EA;
  background-image:
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' fill='none'><path d='M 40 0 L 0 0 0 40' stroke='%23FF7A4D' stroke-opacity='0.08' stroke-width='1'/></svg>"),
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' fill='none'><path d='M 200 0 L 0 0 0 200' stroke='%23FF7A4D' stroke-opacity='0.12' stroke-width='1.25'/></svg>");
  background-size: 40px 40px, 200px 200px;
  background-position: 0 0, 0 0;
  background-repeat: repeat, repeat;
}
`.trim()

export function renderNotificationEmail(input: RenderInput): RenderOutput {
  const { kind, recipientName, title, body, actionUrl, baseUrl, fromAddress, extras } = input
  const c = COPY[kind]
  const cleanBase = baseUrl.replace(/\/+$/, '')
  const name = (recipientName || '').trim().split(' ')[0]
  const greeting = name ? `Hey ${name},` : 'Hey there,'

  const logoUrl = `${cleanBase}/reelst-logo.png`
  const settingsUrl = `${cleanBase}/dashboard?tab=settings`
  const privacyUrl = `${cleanBase}/privacy`
  const termsUrl = `${cleanBase}/terms`
  const replyTo = fromAddress || 'hello@reelst.co'

  // Build the optional metadata table (visitor email / phone / question).
  // Only rendered when at least one row is present. Lives inside the
  // card, between the body and the CTA, so the agent can see contact
  // info at a glance without leaving their inbox.
  const extrasRows: string[] = []
  if (extras?.visitorEmail) {
    extrasRows.push(
      `<tr>
        <td style="padding:10px 0;width:90px;font-size:11.5px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.smoke};vertical-align:top;">Email</td>
        <td style="padding:10px 0;font-size:14px;color:${BRAND.ink};vertical-align:top;line-height:1.5;">
          <a href="mailto:${escapeAttr(extras.visitorEmail)}" style="color:${BRAND.tangerine};text-decoration:none;">${escapeHtml(extras.visitorEmail)}</a>
        </td>
      </tr>`,
    )
  }
  if (extras?.visitorPhone) {
    extrasRows.push(
      `<tr>
        <td style="padding:10px 0;width:90px;font-size:11.5px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.smoke};vertical-align:top;">Phone</td>
        <td style="padding:10px 0;font-size:14px;color:${BRAND.ink};vertical-align:top;line-height:1.5;">
          <a href="tel:${escapeAttr(extras.visitorPhone)}" style="color:${BRAND.tangerine};text-decoration:none;">${escapeHtml(extras.visitorPhone)}</a>
        </td>
      </tr>`,
    )
  }
  if (extras?.question) {
    extrasRows.push(
      `<tr>
        <td style="padding:10px 0;width:90px;font-size:11.5px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.smoke};vertical-align:top;">Question</td>
        <td style="padding:10px 0;font-size:14px;color:${BRAND.ink};vertical-align:top;line-height:1.55;">${escapeHtml(extras.question)}</td>
      </tr>`,
    )
  }
  const extrasBlock = extrasRows.length
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 24px;border-top:1px solid ${BRAND.pearl};border-bottom:1px solid ${BRAND.pearl};">
         ${extrasRows.join('')}
       </table>`
    : '<div style="height:4px;line-height:4px;font-size:1px;">&nbsp;</div>'

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>${escapeHtml(c.subject)}</title>
  <style type="text/css">
    ${GRID_CSS}
  </style>
</head>
<body style="margin:0;padding:0;background-color:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND.ink};-webkit-font-smoothing:antialiased;">
  <!-- Preheader: hidden but shows in the inbox preview line -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#FFFFFF;">${escapeHtml(c.preheader)}</div>

  <!-- ── Band 1: white header with logo lockup ── -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#FFFFFF;">
    <tr>
      <td align="center" style="padding:36px 16px 28px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="vertical-align:middle;padding-right:14px;">
              <img src="${escapeAttr(logoUrl)}" width="48" height="48" alt="Reelst" style="display:block;width:48px;height:48px;border:0;outline:none;text-decoration:none;" />
            </td>
            <td style="vertical-align:middle;">
              <span style="font-size:30px;font-weight:700;letter-spacing:-0.028em;color:${BRAND.ink};">Reelst</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- ── Band 2: grid section with notification card ── -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="reelst-grid-bg" style="background-color:#FFF3EA;">
    <tr>
      <td align="center" style="padding:8px 16px 56px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;">

          <!-- White message card -->
          <tr>
            <td align="center" style="padding:24px 0 0;">
              <table role="presentation" width="540" cellspacing="0" cellpadding="0" border="0" style="max-width:540px;width:100%;background:#FFFFFF;border-radius:20px;border:1px solid rgba(255,133,82,0.18);box-shadow:0 20px 60px -24px rgba(217,74,31,0.18),0 6px 20px -10px rgba(10,14,23,0.06);">
                <tr>
                  <td style="padding:36px 36px 32px;">

                    <!-- Greeting -->
                    <p style="margin:0 0 18px;font-size:14px;font-weight:500;color:${BRAND.graphite};">
                      ${escapeHtml(greeting)}
                    </p>

                    <!-- Eyebrow chip — tangerine-soft pill with kind label -->
                    <div style="margin:0 0 14px;">
                      <span style="display:inline-block;padding:6px 12px;background:${BRAND.tangerineSoft};color:${BRAND.tangerine};border-radius:999px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">
                        ${escapeHtml(c.eyebrow)}
                      </span>
                    </div>

                    <!-- Headline — the title string -->
                    <h1 style="margin:0 0 12px;font-size:24px;line-height:1.22;font-weight:700;letter-spacing:-0.018em;color:${BRAND.ink};">
                      ${escapeHtml(title)}
                    </h1>

                    <!-- Body — short context -->
                    <p style="margin:0 0 18px;font-size:15px;line-height:1.55;color:${BRAND.graphite};">
                      ${escapeHtml(body)}
                    </p>

                    ${extrasBlock}

                    <!-- CTA button -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0;">
                      <tr>
                        <td align="left">
                          <!--[if mso]>
                          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${escapeAttr(actionUrl)}" style="height:52px;v-text-anchor:middle;width:220px;" arcsize="100%" stroke="f" fillcolor="${BRAND.tangerine}">
                            <w:anchorlock/>
                            <center style="color:#FFFFFF;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">${escapeHtml(c.cta)}</center>
                          </v:roundrect>
                          <![endif]-->
                          <!--[if !mso]><!-- -->
                          <a href="${escapeAttr(actionUrl)}" style="display:inline-block;padding:14px 30px;background:${BRAND.tangerine};background-image:linear-gradient(135deg,${BRAND.tangerineLight} 0%,${BRAND.tangerine} 100%);color:#FFFFFF;font-size:15px;font-weight:600;letter-spacing:-0.01em;text-decoration:none;border-radius:999px;box-shadow:0 8px 22px -4px rgba(217,74,31,0.42);mso-padding-alt:0;">
                            ${escapeHtml(c.cta)} &nbsp;&rarr;
                          </a>
                          <!--<![endif]-->
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- ── Band 3: white footer ── -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#FFFFFF;">
    <tr>
      <td align="center" style="padding:28px 32px 32px;">
        <table role="presentation" width="540" cellspacing="0" cellpadding="0" border="0" style="max-width:540px;width:100%;">
          <tr>
            <td align="center">
              <p style="margin:0 0 14px;font-size:12.5px;line-height:1.55;color:${BRAND.graphite};">
                You're getting this because <strong style="font-weight:600;color:${BRAND.ink};">${escapeHtml(c.reason)}</strong> notifications are on for your Reelst.
                <a href="${escapeAttr(settingsUrl)}" style="color:${BRAND.tangerine};text-decoration:underline;font-weight:600;">Manage notifications</a>.
              </p>
              <p style="margin:0 0 18px;font-size:12px;line-height:1.5;color:${BRAND.smoke};">
                <a href="${escapeAttr(privacyUrl)}" style="color:${BRAND.graphite};text-decoration:underline;">Privacy Policy</a>
                &nbsp;·&nbsp;
                <a href="${escapeAttr(termsUrl)}" style="color:${BRAND.graphite};text-decoration:underline;">Terms of Use</a>
              </p>
              <p style="margin:0;font-size:11.5px;line-height:1.55;color:${BRAND.smoke};">
                Reelst is a DBA of <strong style="color:${BRAND.graphite};font-weight:600;">Avigage Systems Inc.</strong>
              </p>
              <p style="margin:6px 0 0;font-size:11.5px;color:${BRAND.smoke};">
                Reach us anytime at
                <a href="mailto:${escapeAttr(replyTo)}" style="color:${BRAND.smoke};text-decoration:underline;">${escapeHtml(replyTo)}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
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
    `[${c.eyebrow}]`,
    title,
    '',
    body,
    extrasText.length ? '' : null,
    ...extrasText,
    '',
    `${c.cta}: ${actionUrl}`,
    '',
    `You're getting this because ${c.reason.toLowerCase()} notifications are on. Manage at ${settingsUrl}.`,
    '',
    `Privacy: ${privacyUrl}`,
    `Terms: ${termsUrl}`,
    '',
    '—',
    'Reelst — where listings come alive',
    'A DBA of Avigage Systems Inc.',
    `Reply to: ${replyTo}`,
  ].filter((l) => l !== null).join('\n')

  return { subject: c.subject, html, text }
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttr(s: string): string {
  return String(s).replace(/"/g, '&quot;').replace(/&/g, '&amp;')
}
