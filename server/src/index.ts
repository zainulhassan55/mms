import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { prisma } from './db.js'
import { requireAuth, type AuthedRequest } from './auth/middleware.js'
import { requireRole } from './auth/requireRole.js'
import authRoutes from './routes/auth.js'
import invitationRoutes from './routes/invitations.js'
import manuscriptRoutes from './routes/manuscripts.js'
import adminRoutes from './routes/admin.js'

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

app.get('/api/journals', async (_req, res) => {
  try {
    const journals = await prisma.journal.findMany({
      orderBy: { name: 'asc' },
    })
    res.json({ ok: true, journals })
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to load journals',
    })
  }
})

app.get(
  '/api/editors',
  requireAuth,
  requireRole('office', 'admin', 'editor'),
  async (_req: AuthedRequest, res) => {
    try {
      const editors = await prisma.user.findMany({
        where: { role: 'editor' },
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
  requireRole('editor', 'admin', 'office'),
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
  requireRole('admin', 'office'),
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
})
