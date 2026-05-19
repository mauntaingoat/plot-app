/**
 * Plain-text-leaning report email for the moderation inbox. Not
 * branded — this lands in an admin mailbox, not a buyer or agent
 * inbox. Optimized for fast triage: every field labeled, doc + auth
 * links handy.
 */

export interface ReportEmailInput {
  reportId: string
  targetType: 'pin' | 'content' | 'agent'
  targetId: string
  targetOwnerId: string
  targetOwnerName: string | null
  targetOwnerUsername: string | null
  targetSnippet: string | null
  reason: string
  detail: string
  reporterUid: string | null
  reporterEmail: string | null
  ip: string
  submittedAt: Date
}

const REASON_LABELS: Record<string, string> = {
  spam: 'Spam or scam',
  inappropriate: 'Inappropriate content',
  fake_listing: 'Fake or misleading listing',
  harassment: 'Harassment or abuse',
  copyright: 'Copyright violation',
  other: 'Something else',
}

export function renderReportEmail(input: ReportEmailInput): { subject: string; html: string; text: string } {
  const {
    reportId,
    targetType,
    targetId,
    targetOwnerId,
    targetOwnerName,
    targetOwnerUsername,
    targetSnippet,
    reason,
    detail,
    reporterUid,
    reporterEmail,
    ip,
    submittedAt,
  } = input

  const reasonLabel = REASON_LABELS[reason] || reason
  const ownerLabel = targetOwnerUsername
    ? `${targetOwnerName || 'agent'} (@${targetOwnerUsername})`
    : targetOwnerName || targetOwnerId
  const reporterLabel = reporterEmail || (reporterUid ? `uid:${reporterUid}` : 'anonymous')

  const subject = `[Reelst Report] ${reasonLabel} · ${targetType} · ${targetSnippet || targetId}`

  const firestoreConsoleUrl = `https://console.firebase.google.com/project/plot-fe990/firestore/data/~2Freports~2F${encodeURIComponent(reportId)}`
  const targetProfileUrl = targetOwnerUsername
    ? `https://plot-fe990.web.app/${targetOwnerUsername}${targetType === 'pin' ? `?pin=${encodeURIComponent(targetId)}` : ''}`
    : null

  const detailRow = detail
    ? `<tr><td style="padding:8px 0;width:120px;color:#666;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;vertical-align:top;">Detail</td><td style="padding:8px 0;color:#111;font-size:14px;line-height:1.55;white-space:pre-wrap;">${escapeHtml(detail)}</td></tr>`
    : ''

  const profileRow = targetProfileUrl
    ? `<tr><td style="padding:8px 0;width:120px;color:#666;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Profile</td><td style="padding:8px 0;font-size:14px;"><a href="${escapeAttr(targetProfileUrl)}" style="color:#D94A1F;">${escapeHtml(targetProfileUrl)}</a></td></tr>`
    : ''

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8" /><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#F4F5F8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="padding:24px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background:#FFFFFF;border-radius:12px;border:1px solid #E2E8F0;">
        <tr><td style="padding:20px 24px 8px;">
          <p style="margin:0 0 4px;color:#D94A1F;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">New report</p>
          <h1 style="margin:0;font-size:18px;font-weight:700;letter-spacing:-0.012em;line-height:1.3;">${escapeHtml(reasonLabel)}</h1>
        </td></tr>
        <tr><td style="padding:0 24px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr><td style="padding:8px 0;width:120px;color:#666;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Target type</td><td style="padding:8px 0;color:#111;font-size:14px;">${escapeHtml(targetType)}</td></tr>
            <tr><td style="padding:8px 0;width:120px;color:#666;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Target</td><td style="padding:8px 0;color:#111;font-size:14px;">${escapeHtml(targetSnippet || targetId)}</td></tr>
            <tr><td style="padding:8px 0;width:120px;color:#666;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Owner</td><td style="padding:8px 0;color:#111;font-size:14px;">${escapeHtml(ownerLabel)}</td></tr>
            ${profileRow}
            ${detailRow}
            <tr><td colspan="2" style="padding:14px 0 0;border-top:1px solid #E2E8F0;"></td></tr>
            <tr><td style="padding:8px 0;width:120px;color:#666;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Reporter</td><td style="padding:8px 0;color:#111;font-size:14px;">${escapeHtml(reporterLabel)}</td></tr>
            <tr><td style="padding:8px 0;width:120px;color:#666;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">IP</td><td style="padding:8px 0;color:#111;font-size:14px;">${escapeHtml(ip)}</td></tr>
            <tr><td style="padding:8px 0;width:120px;color:#666;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Submitted</td><td style="padding:8px 0;color:#111;font-size:14px;">${escapeHtml(submittedAt.toISOString())}</td></tr>
            <tr><td style="padding:8px 0;width:120px;color:#666;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Report ID</td><td style="padding:8px 0;color:#111;font-size:14px;font-family:'SF Mono','Menlo','Consolas',monospace;">${escapeHtml(reportId)}</td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:8px 24px 24px;">
          <a href="${escapeAttr(firestoreConsoleUrl)}" style="display:inline-block;padding:10px 18px;background:#0A0E1A;color:#FFFFFF;font-size:13px;font-weight:600;text-decoration:none;border-radius:8px;">Open in Firestore</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

  const lines = [
    `[Reelst Report] ${reasonLabel}`,
    '',
    `Target type:    ${targetType}`,
    `Target:         ${targetSnippet || targetId}`,
    `Owner:          ${ownerLabel}`,
    targetProfileUrl ? `Profile:        ${targetProfileUrl}` : '',
    detail ? `\nDetail:\n${detail}\n` : '',
    `Reporter:       ${reporterLabel}`,
    `IP:             ${ip}`,
    `Submitted:      ${submittedAt.toISOString()}`,
    `Report ID:      ${reportId}`,
    '',
    `Firestore:      ${firestoreConsoleUrl}`,
  ].filter(Boolean)

  return { subject, html, text: lines.join('\n') }
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
