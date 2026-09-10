import 'dotenv/config'
import { runDeadlineReminders } from '../src/lib/reminders.js'
import { prisma } from '../src/db.js'

async function main() {
  console.log('[reminders] Starting deadline reminder run…')
  const result = await runDeadlineReminders()
  console.log('[reminders] Completed:', result)
}

main()
  .catch((error) => {
    console.error('[reminders] Failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
