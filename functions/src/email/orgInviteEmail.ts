/**
 * Org invite email. Sent when a brokerage owner invites an agent to
 * join their team plan. Style matches the auth + digest emails:
 * single-column 600px, tangerine + ink, inline CSS only.
 *
 * Two clear sections — what's happening (joined by {orgName}) and
 * the CTA. No tier specifics in the body so the email survives
 * future pricing changes.
 */

const BRAND = {
  tangerine: '#D94A1F',
  ink: '#0A0E1A',
  graphite: '#475569',
  smoke: '#94A3B8',
  cream: '#F8F5F0',
  ivory: '#FFFCF7',
}

interface RenderInput {
  orgName: string
  inviteUrl: string
}

export function ORG_INVITE_SUBJECT(orgName: string): string {
  return `You're invited to join ${orgName} on Reelst`
}

export function renderOrgInviteEmail({ orgName, inviteUrl }: RenderInput): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escape(`You're invited to ${orgName}`)}</title>
  </head>
  <body style="margin:0;padding:0;background:${BRAND.cream};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${BRAND.ink};">
    <span style="display:none;font-size:0;line-height:0;color:${BRAND.cream};max-height:0;max-width:0;opacity:0;overflow:hidden;">
      ${escape(orgName)} added you to their Reelst team. Click to set up your agent profile.
    </span>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BRAND.cream};">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:${BRAND.ivory};border-radius:24px;overflow:hidden;border:1px solid rgba(10,14,26,0.08);">
            <tr>
              <td style="padding:36px 36px 8px;">
                <p style="margin:0 0 16px;font-family:'SF Mono',Menlo,monospace;font-size:11px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:${BRAND.tangerine};">
                  Team invite
                </p>
                <h1 style="margin:0;font-size:30px;font-weight:600;letter-spacing:-0.025em;line-height:1.1;color:${BRAND.ink};">
                  You're invited to join<br />
                  <span style="color:${BRAND.tangerine};">${escape(orgName)}</span>
                  on Reelst.
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 36px 0;">
                <p style="margin:0 0 24px;font-size:15.5px;line-height:1.6;color:${BRAND.graphite};">
                  ${escape(orgName)} added you to their team plan on Reelst. Tap the button below to claim your seat and set up your agent profile.
                </p>
                <p style="margin:0 0 24px;font-size:15.5px;line-height:1.6;color:${BRAND.graphite};">
                  Your profile is your own — pins, content, leads, and inbox stay with you. The brokerage covers your Pro subscription.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:8px 36px 16px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" style="border-radius:999px;background:${BRAND.tangerine};">
                      <a href="${escape(inviteUrl)}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;letter-spacing:-0.01em;">
                        Accept invite &rarr;
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:${BRAND.smoke};">
                  Or copy this URL into your browser:<br />
                  <span style="color:${BRAND.graphite};word-break:break-all;">${escape(inviteUrl)}</span>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 36px 32px;border-top:1px solid rgba(10,14,26,0.06);margin-top:24px;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:${BRAND.smoke};">
                  This invite expires in 14 days. If you weren't expecting this email, you can safely ignore it — no account is created until you accept.
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:24px 0 0;font-size:11px;line-height:1.5;color:${BRAND.smoke};">
            Reelst &middot; <a href="https://www.reel.st" style="color:${BRAND.smoke};text-decoration:none;">reel.st</a>
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function escape(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
