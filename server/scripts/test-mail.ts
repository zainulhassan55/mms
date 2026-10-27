/**
 * Send a one-off test email using current SMTP / EMAIL_DELIVERY settings.
 *
 *   cd server
 *   npx tsx scripts/test-mail.ts you@example.com
 */
import 'dotenv/config'
import { isEmailDeliveryEnabled, sendMail } from '../src/lib/mail.js'

async function main() {
  const to = String(process.argv[2] || '').trim()
  if (!to || !to.includes('@')) {
    console.error('Usage: npx tsx scripts/test-mail.ts you@example.com')
    process.exit(1)
  }

  console.log(`EMAIL_DELIVERY=${isEmailDeliveryEnabled()}`)
  console.log(`SMTP_HOST=${process.env.SMTP_HOST || '(not set)'}`)

  const result = await sendMail({
    to,
    category: 'transactional',
    respectPrefs: false,
    subject: 'MMS mail test',
    text: 'This is a test email from the Manuscript Management System.',
    html: '<p>This is a <strong>test email</strong> from the Manuscript Management System.</p>',
  })

  console.log(result)
  if (!result.sent && result.reason === 'delivery_disabled') {
    console.log(
      'Set EMAIL_DELIVERY=true and configure SMTP_* in server/.env to actually send.',
    )
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
