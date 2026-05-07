/**
 * Branded HTML + plain-text email templates for auth flows.
 *
 * Tangerine + ink palette mirrors the Reelst brand. Single-column,
 * 600px max width, table-based layout for Outlook compatibility.
 * Inline CSS only — Gmail strips <style> blocks in some clients.
 *
 * IMPORTANT: This file is mirrored at functions/src/email/template.ts.
 * The frontend copy powers the /dev/email-preview page; the functions
 * copy is what actually ships in sent emails. Keep them in sync —
 * change one, change the other.
 */

export type AuthEmailKind = 'verify' | 'reset'

interface RenderInput {
  kind: AuthEmailKind
  actionUrl: string
  recipientName?: string | null
  /** Used in the footer + reply-to. */
  fromAddress: string
  /** Origin for hosted images (logo, character) and link targets in
   *  the footer (Privacy, Terms). The Cloud Function passes the
   *  deployed origin; the preview page passes window.location.origin
   *  so it works on localhost too. No trailing slash. */
  baseUrl: string
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

const COPY: Record<AuthEmailKind, {
  subject: string
  preheader: string
  greeting: (name: string) => string
  body: string
  cta: string
  altLinkLabel: string
  fineprint: string
  /** filename inside /marketing — no domain, no leading slash */
  heroImage: string
  heroAlt: string
}> = {
  verify: {
    subject: 'Welcome to Reelst — verify your email',
    preheader: 'One quick tap to bring your map to life.',
    greeting: (name) => `Hey${name ? ` ${name}` : ' there'},`,
    body: "Welcome to Reelst — really glad you're here. One quick thing before your map goes live: tap below to verify your email and we'll get your dashboard set up.",
    cta: 'Verify email',
    altLinkLabel: 'Button not working? Paste this link in your browser:',
    fineprint: "If you didn't sign up for Reelst, you can ignore this email — no harm done.",
    heroImage: 'marketing/customize-line-cropped.png',
    heroAlt: 'A Reelst agent holding a map pin',
  },
  reset: {
    subject: 'Reset your Reelst password',
    preheader: 'A new password is one tap away.',
    greeting: (name) => `Hey${name ? ` ${name}` : ' there'},`,
    body: "Locked yourself out? It happens. Tap below to set a new password — the link stays good for an hour, after that you'll need to ask for a fresh one.",
    cta: 'Reset password',
    altLinkLabel: 'Button not working? Paste this link in your browser:',
    fineprint: "If you didn't ask to reset your password, you can ignore this email — your account stays exactly as it is.",
    heroImage: 'marketing/customize-line-cropped.png',
    heroAlt: 'A Reelst agent holding a map pin',
  },
}

/** Mirrors the .map-grid CSS class from src/styles/index.css.
 *  Lives in a <style> block (not inline) because the SVG data URIs
 *  contain double quotes which would terminate inline style="..."
 *  attributes. Modern clients (Gmail web, Apple Mail, Outlook 365)
 *  honor head <style>; clients that strip it fall back to the
 *  background-color set inline, which still reads on-brand. */
const GRID_CSS = `
.reelst-grid-bg {
  background-color: #FFF3EA;
  background-image:
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' fill='none'><path d='M 40 0 L 0 0 0 40' stroke='%23FF7A4D' stroke-opacity='0.08' stroke-width='1'/></svg>"),
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' fill='none'><path d='M 200 0 L 0 0 0 200' stroke='%23FF7A4D' stroke-opacity='0.12' stroke-width='1.25'/></svg>"),
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600' fill='none'><rect x='120' y='80' width='44' height='28' rx='3' fill='%23FF7A4D' fill-opacity='0.05'/><rect x='380' y='220' width='28' height='36' rx='3' fill='%23FF7A4D' fill-opacity='0.05'/><rect x='200' y='420' width='56' height='24' rx='3' fill='%23FF7A4D' fill-opacity='0.05'/><rect x='460' y='480' width='32' height='32' rx='3' fill='%23FF7A4D' fill-opacity='0.05'/><circle cx='320' cy='160' r='3' fill='%23FF7A4D' fill-opacity='0.18'/><circle cx='520' cy='360' r='3' fill='%23FF7A4D' fill-opacity='0.18'/><circle cx='80' cy='520' r='3' fill='%23FF7A4D' fill-opacity='0.18'/></svg>");
  background-size: 40px 40px, 200px 200px, 600px 600px;
  background-position: 0 0, 0 0, 0 0;
  background-repeat: repeat, repeat, repeat;
}
`.trim()

export function renderAuthEmail({ kind, actionUrl, recipientName, fromAddress, baseUrl }: RenderInput): RenderOutput {
  const c = COPY[kind]
  const cleanBase = baseUrl.replace(/\/+$/, '')
  const name = (recipientName || '').trim().split(' ')[0]
  const greeting = c.greeting(name)

  const logoUrl = `${cleanBase}/reelst-logo.png`
  const heroUrl = `${cleanBase}/${c.heroImage}`
  const privacyUrl = `${cleanBase}/privacy`
  const termsUrl = `${cleanBase}/terms`

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

  <!-- ── Band 2: grid section. Holds the white message card and the
       cropped character. The character's bottom is flush with this
       band's bottom edge (padding-bottom:0 on its row), so when the
       white footer band begins right after, the character looks like
       she's standing on the boundary line. -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="reelst-grid-bg" style="background-color:#FFF3EA;">
    <tr>
      <td align="center" style="padding:8px 16px 0;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;">

          <!-- White message card: greeting, body, button, alt link -->
          <tr>
            <td align="center" style="padding:24px 0 0;">
              <table role="presentation" width="540" cellspacing="0" cellpadding="0" border="0" style="max-width:540px;width:100%;background:#FFFFFF;border-radius:20px;border:1px solid rgba(255,133,82,0.18);box-shadow:0 20px 60px -24px rgba(217,74,31,0.18),0 6px 20px -10px rgba(10,14,23,0.06);">
                <tr>
                  <td style="padding:36px 36px 32px;text-align:center;">
                    <h1 style="margin:0 0 8px;font-size:22px;line-height:1.25;font-weight:700;letter-spacing:-0.018em;color:${BRAND.ink};text-align:center;">
                      ${escapeHtml(greeting)}
                    </h1>
                    <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:${BRAND.graphite};text-align:center;">
                      ${escapeHtml(c.body)}
                    </p>

                    <!-- CTA button — center via wrapping table -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;">
                      <tr>
                        <td align="center">
                          <!--[if mso]>
                          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${escapeAttr(actionUrl)}" style="height:52px;v-text-anchor:middle;width:240px;" arcsize="100%" stroke="f" fillcolor="${BRAND.tangerine}">
                            <w:anchorlock/>
                            <center style="color:#FFFFFF;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">${escapeHtml(c.cta)}</center>
                          </v:roundrect>
                          <![endif]-->
                          <!--[if !mso]><!-- -->
                          <a href="${escapeAttr(actionUrl)}" style="display:inline-block;padding:16px 38px;background:${BRAND.tangerine};background-image:linear-gradient(135deg,${BRAND.tangerineLight} 0%,${BRAND.tangerine} 100%);color:#FFFFFF;font-size:15px;font-weight:600;letter-spacing:-0.01em;text-decoration:none;border-radius:999px;box-shadow:0 8px 22px -4px rgba(217,74,31,0.42);mso-padding-alt:0;">
                            ${escapeHtml(c.cta)} &nbsp;&rarr;
                          </a>
                          <!--<![endif]-->
                        </td>
                      </tr>
                    </table>

                    <!-- Alt link inside the card, small + muted -->
                    <p style="margin:24px 0 6px;font-size:12px;line-height:1.5;color:${BRAND.smoke};text-align:center;">
                      ${escapeHtml(c.altLinkLabel)}
                    </p>
                    <p style="margin:0;text-align:center;">
                      <a href="${escapeAttr(actionUrl)}" style="font-size:12px;color:${BRAND.tangerine};word-break:break-all;text-decoration:underline;">${escapeHtml(actionUrl)}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Cropped character — bottom flush with grid section. Some
               top padding for breathing room from the card; zero
               bottom padding so the PNG sits on the boundary line
               between grid and white footer below. -->
          <tr>
            <td align="center" valign="bottom" style="padding:32px 0 0;">
              <img src="${escapeAttr(heroUrl)}" alt="${escapeAttr(c.heroAlt)}" width="280" style="display:block;width:100%;max-width:280px;height:auto;border:0;outline:none;text-decoration:none;margin:0 auto;" />
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- ── Band 3: white footer with fineprint + legal links + Avigage -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#FFFFFF;">
    <tr>
      <td align="center" style="padding:28px 32px 32px;">
        <table role="presentation" width="540" cellspacing="0" cellpadding="0" border="0" style="max-width:540px;width:100%;">
          <tr>
            <td align="center">
              <p style="margin:0 0 14px;font-size:12.5px;line-height:1.55;color:${BRAND.graphite};">
                ${escapeHtml(c.fineprint)}
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
    greeting,
    '',
    c.body,
    '',
    `${c.cta}: ${actionUrl}`,
    '',
    c.fineprint,
    '',
    `Privacy: ${privacyUrl}`,
    `Terms: ${termsUrl}`,
    '',
    '—',
    'Reelst — where listings come alive',
    'A DBA of Avigage Systems Inc.',
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
