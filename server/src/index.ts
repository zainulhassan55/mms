import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { prisma } from './db.js'
import { requireAuth, type AuthedRequest } from './auth/middleware.js'
import { requireRole } from './auth/requireRole.js'
import authRoutes from './routes/auth.js'
import invitationRoutes from './routes/invitations.js'
import manuscriptRoutes from './routes/manuscripts.js'
import adminRoutes from './routes/admin.js'
import journalRoutes from './routes/journals.js'
import issueRoutes from './routes/issues.js'
import publicRoutes from './routes/public.js'
import workflowRoutes from './routes/workflow.js'

const app = express()
const port = Number(process.env.PORT) || 4000

app.use(
  cors({
    origin: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Disposition', 'Content-Type', 'Content-Length'],
  }),
)
app.use(express.json({ limit: '15mb' }))

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ ok: true, database: 'connected' })
  } catch (error) {
    console.error('Database health check failed:', error)
    res.status(503).json({
      ok: false,
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown database error',
    })
  }
})

app.use('/api/auth', authRoutes)
app.use('/api/manuscripts', manuscriptRoutes)
app.use('/api/invitations', invitationRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/journals', journalRoutes)
app.use('/api/issues', issueRoutes)
app.use('/api/public', publicRoutes)
app.use('/api/workflow', workflowRoutes)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const frontendDist = path.resolve(__dirname, '../../dist')
const frontendBase = (process.env.FRONTEND_BASE || '/mms').replace(/\/$/, '') || '/mms'

app.use(
  frontendBase,
  express.static(frontendDist, {
    index: false,
    fallthrough: true,
  }),
)

// SPA fallback for React Router under /mms (avoid Express 5 /* path bugs)
app.use(frontendBase, (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    next()
    return
  }
  res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
    if (err) next()
  })
})

app.get(
  '/api/editors',
  requireAuth,
  requireRole('office', 'admin', 'editor', 'journal_manager'),
  async (_req: AuthedRequest, res) => {
    try {
      const editors = await prisma.user.findMany({
        where: { role: { in: ['editor', 'journal_manager'] } },
        select: {
          id: true,
          name: true,
          email: true,
          affiliation: true,
        },
        orderBy: { name: 'asc' },
      })
      res.json({ ok: true, editors })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to load editors',
      })
    }
  },
)
app.get(
  '/api/reviewers',
  requireAuth,
  requireRole('editor', 'admin', 'office', 'journal_manager'),
  async (_req: AuthedRequest, res) => {
    try {
      const reviewers = await prisma.user.findMany({
        where: { role: 'reviewer' },
        select: {
          id: true,
          name: true,
          email: true,
          affiliation: true,
          expertise: true,
        },
        orderBy: { name: 'asc' },
      })
      res.json({ ok: true, reviewers })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to load reviewers',
      })
    }
  },
)

app.get(
  '/api/users',
  requireAuth,
  requireRole('admin', 'office', 'journal_manager', 'editor', 'production'),
  async (_req: AuthedRequest, res) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          affiliation: true,
        },
        orderBy: { role: 'asc' },
      })
      res.json({ ok: true, users })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to load users',
      })
    }
  },
)

app.listen(port, () => {
  console.log(`MMS API listening on http://localhost:${port}`)
  console.log(`Manuscripts:  http://localhost:${port}/api/manuscripts`)
  console.log(`Invitations:  http://localhost:${port}/api/invitations`)

  if (process.env.REMINDERS_ENABLED === 'true') {
    const hours = Math.max(1, Number(process.env.REMINDERS_INTERVAL_HOURS || 24))
    const intervalMs = hours * 60 * 60 * 1000
    console.log(
      `[reminders] In-process scheduler enabled (every ${hours}h). Prefer cron + "npm run reminders" in production.`,
    )
    const tick = () => {
      void import('./lib/reminders.js')
        .then(({ runDeadlineReminders }) => runDeadlineReminders())
        .then((result) => console.log('[reminders] run complete', result))
        .catch((error) => console.error('[reminders] run failed', error))
    }
    setTimeout(tick, 15_000)
    setInterval(tick, intervalMs)
  }
})
