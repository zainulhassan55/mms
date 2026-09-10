import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

let transporter: Transporter | null = null

export function isEmailDeliveryEnabled() {
  return process.env.EMAIL_DELIVERY === 'true'
}

function getTransporter() {
  if (transporter) return transporter

  const host = process.env.SMTP_HOST?.trim()
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER?.trim()
  const pass = process.env.SMTP_PASS?.trim()

  if (!host) {
    throw new Error('SMTP_HOST is not configured.')
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465 || process.env.SMTP_SECURE === 'true',
    auth: user ? { user, pass: pass || '' } : undefined,
  })

  return transporter
}

export function appLink(path: string) {
  const origin = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(
    /\/$/,
    '',
  )
  const base = (process.env.FRONTEND_BASE || '/mms').replace(/\/$/, '')
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${origin}${base}${normalized}`
}

export function journalFromName() {
  return (
    process.env.MAIL_FROM_NAME?.trim() ||
    process.env.JOURNAL_NAME?.trim() ||
    'Manuscript Management System'
  )
}

export function mailFromAddress() {
  return (
    process.env.MAIL_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    'noreply@localhost'
  )
}

export function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export function emailLayout(title: string, bodyHtml: string) {
  const journal = journalFromName()
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f3f6f8;font-family:Segoe UI,Arial,sans-serif;color:#14323c;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6f8;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:640px;background:#ffffff;border:1px solid #d4dde3;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="background:#0b5f56;color:#fff;padding:18px 22px;font-size:16px;font-weight:700;">
                ${escapeHtml(journal)}
              </td>
            </tr>
            <tr>
              <td style="padding:22px;">
                <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;">${escapeHtml(title)}</h1>
                <div style="font-size:14px;line-height:1.6;color:#1e4652;">${bodyHtml}</div>
                <p style="margin:22px 0 0;font-size:12px;color:#3d6673;">
                  This is an automated message from the journal manuscript system. Please do not reply unless instructed.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

type SendMailInput = {
  to: string
  subject: string
  text: string
  html?: string
}

/**
 * Sends email when EMAIL_DELIVERY=true.
 * Otherwise logs the message so local workflows still succeed.
 */
export async function sendMail(input: SendMailInput) {
  const to = input.to.trim().toLowerCase()
  if (!to) return { sent: false as const, reason: 'missing_recipient' as const }

  if (!isEmailDeliveryEnabled()) {
    console.info(
      `[mail:dev] to=${to} subject="${input.subject}"\n${input.text}\n`,
    )
    return { sent: false as const, reason: 'delivery_disabled' as const }
  }

  try {
    const info = await getTransporter().sendMail({
      from: `"${journalFromName()}" <${mailFromAddress()}>`,
      to,
      subject: input.subject,
      text: input.text,
      html:
        input.html ??
        `<pre style="font-family:sans-serif;white-space:pre-wrap">${escapeHtml(input.text)}</pre>`,
    })
    console.info(`[mail:sent] to=${to} id=${info.messageId}`)
    return { sent: true as const, id: info.messageId }
  } catch (error) {
    console.error('[mail:error]', error)
    return {
      sent: false as const,
      reason: 'send_failed' as const,
      error: error instanceof Error ? error.message : 'Send failed',
    }
  }
}
