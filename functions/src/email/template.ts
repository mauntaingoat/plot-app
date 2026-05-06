/**
 * Branded HTML + plain-text email templates for auth flows.
 *
 * Tangerine + ink palette mirrors the Reelst brand. Single-column,
 * 600px max width, table-based layout for Outlook compatibility.
 * Inline CSS only — Gmail strips <style> blocks in some clients.
 */

export type AuthEmailKind = 'verify' | 'reset'

interface RenderInput {
  kind: AuthEmailKind
  actionUrl: string
  recipientName?: string | null
  /** Used in the footer + reply-to. Defaults to the configured from. */
  fromAddress: string
}

interface RenderOutput {
  subject: string
  html: string
  text: string
}

const BRAND = {
  tangerine: '#D94A1F',
  tangerineLight: '#FF8552',
  ink: '#0A0E1A',
  graphite: '#475569',
  smoke: '#94A3B8',
  pearl: '#E2E8F0',
  cream: '#F8F5F0',
  warmWhite: '#FAF7F2',
}

const COPY: Record<AuthEmailKind, { subject: string; preheader: string; heading: string; body: string; cta: string; secondary: string }> = {
  verify: {
    subject: 'Verify your Reelst email',
    preheader: 'One quick tap to finish setting up your map.',
    heading: 'Confirm your email',
    body: "You're almost in. Tap the button below to verify your email — once you do, your Reelst map and dashboard unlock.",
    cta: 'Verify email',
    secondary: "If you didn't create a Reelst account, you can ignore this email.",
  },
  reset: {
    subject: 'Reset your Reelst password',
    preheader: 'Set a new password for your Reelst account.',
    heading: 'Reset your password',
    body: 'We got a request to reset the password on your Reelst account. Tap the button below to choose a new one. The link expires in an hour.',
    cta: 'Reset password',
    secondary: "If you didn't request this, you can safely ignore this email — your password won't change.",
  },
}

export function renderAuthEmail({ kind, actionUrl, recipientName, fromAddress }: RenderInput): RenderOutput {
  const c = COPY[kind]
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hey there,'

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${escapeHtml(c.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.cream};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND.ink};">
  <!-- Preheader: hidden but shows in the inbox preview line -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${BRAND.cream};">${escapeHtml(c.preheader)}</div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${BRAND.cream};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background:${BRAND.warmWhite};border-radius:20px;overflow:hidden;box-shadow:0 1px 3px rgba(10,14,26,0.06);">

          <!-- Header band -->
          <tr>
            <td style="background:linear-gradient(135deg,${BRAND.tangerineLight} 0%,${BRAND.tangerine} 100%);padding:32px 32px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <span style="display:inline-block;font-size:22px;font-weight:700;letter-spacing:-0.02em;color:#FFFFFF;">Reelst</span>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <span style="display:inline-block;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.78);">Where listings come alive</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 36px 12px;">
              <h1 style="margin:0 0 8px;font-size:26px;line-height:1.2;font-weight:700;letter-spacing:-0.02em;color:${BRAND.ink};">${escapeHtml(c.heading)}</h1>
              <p style="margin:0 0 24px;font-size:14px;color:${BRAND.smoke};">${escapeHtml(greeting)}</p>
              <p style="margin:0 0 32px;font-size:15px;line-height:1.55;color:${BRAND.graphite};">${escapeHtml(c.body)}</p>

              <!-- CTA -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 8px;">
                <tr>
                  <td align="center" bgcolor="${BRAND.tangerine}" style="border-radius:999px;background:${BRAND.tangerine};">
                    <a href="${escapeAttr(actionUrl)}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;letter-spacing:-0.01em;color:#FFFFFF;text-decoration:none;border-radius:999px;">
                      ${escapeHtml(c.cta)} &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback link -->
              <p style="margin:32px 0 0;font-size:12px;line-height:1.55;color:${BRAND.smoke};">
                Button not working? Paste this link into your browser:<br />
                <a href="${escapeAttr(actionUrl)}" style="color:${BRAND.tangerine};word-break:break-all;text-decoration:none;">${escapeHtml(actionUrl)}</a>
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:32px 36px 0;">
              <div style="height:1px;background:${BRAND.pearl};"></div>
            </td>
          </tr>

          <!-- Secondary copy -->
          <tr>
            <td style="padding:20px 36px 36px;">
              <p style="margin:0;font-size:12.5px;line-height:1.55;color:${BRAND.smoke};">${escapeHtml(c.secondary)}</p>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;">
          <tr>
            <td align="center" style="padding:24px 16px 8px;">
              <p style="margin:0;font-size:11.5px;line-height:1.5;color:${BRAND.smoke};">
                Reelst is a product of Avigage Systems Inc.<br />
                You're receiving this because you started signing up for Reelst.
              </p>
              <p style="margin:8px 0 0;font-size:11.5px;color:${BRAND.smoke};">
                <a href="mailto:${escapeAttr(fromAddress)}" style="color:${BRAND.smoke};text-decoration:underline;">${escapeHtml(fromAddress)}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = [
    c.heading,
    '',
    greeting,
    '',
    c.body,
    '',
    `${c.cta}: ${actionUrl}`,
    '',
    c.secondary,
    '',
    '—',
    'Reelst — where listings come alive',
    'A product of Avigage Systems Inc.',
    `Reply to: ${fromAddress}`,
  ].join('\n')

  return { subject: c.subject, html, text }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, '&quot;').replace(/&/g, '&amp;')
}
