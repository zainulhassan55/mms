import { Router } from 'express'
import crypto from 'node:crypto'
import type { AppRole } from '@prisma/client'
import { prisma } from '../db.js'
import { signAuthToken } from '../auth/jwt.js'
import { requireAuth, type AuthedRequest } from '../auth/middleware.js'
import { hashPassword, verifyPassword } from '../auth/password.js'
import { roleLabels } from '../lib/labels.js'
import { isEmailDeliveryEnabled } from '../lib/mail.js'
import {
  notifyAccountWelcome,
  notifyPasswordReset,
} from '../lib/workflowEmails.js'

const router = Router()

function toPublicUser(user: {
  id: string
  email: string
  name: string
  initials: string
  role: AppRole
  affiliation: string | null
  notifyEmail?: boolean
  notifyDeadlines?: boolean
  notifyDecisions?: boolean
  orcid?: string | null
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    initials: user.initials,
    role: user.role,
    roleLabel: roleLabels[user.role],
    affiliation: user.affiliation ?? '',
    orcid: user.orcid ?? '',
    notifyEmail: user.notifyEmail !== false,
    notifyDeadlines: user.notifyDeadlines !== false,
    notifyDecisions: user.notifyDecisions !== false,
  }
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'U'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

router.post('/register', async (req, res) => {
  const name = String(req.body?.name ?? '').trim()
  const email = String(req.body?.email ?? '')
    .trim()
    .toLowerCase()
  const password = String(req.body?.password ?? '')
  const affiliation = String(req.body?.affiliation ?? '').trim() || null
  const expertise = String(req.body?.expertise ?? '').trim() || null
  const requestedRole = String(req.body?.role ?? 'author').trim() as AppRole

  const selfRegisterRoles: AppRole[] = [
    'author',
    'reviewer',
    'editor',
    'production',
    'copyeditor',
  ]

  // Legacy "office" registrations become the single Editor role.
  const role: AppRole =
    requestedRole === 'office' ? 'editor' : requestedRole

  if (!name || name.length < 2) {
    res.status(400).json({ ok: false, error: 'Please enter your full name.' })
    return
  }
  if (!isValidEmail(email)) {
    res.status(400).json({ ok: false, error: 'Please enter a valid email.' })
    return
  }
  if (password.length < 6) {
    res.status(400).json({
      ok: false,
      error: 'Password must be at least 6 characters.',
    })
    return
  }
  if (!selfRegisterRoles.includes(requestedRole) && requestedRole !== 'office') {
    res.status(400).json({
      ok: false,
      error: 'Please choose a valid account type. Admin accounts are created by the publisher.',
    })
    return
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    res.status(409).json({
      ok: false,
      error: 'An account with this email already exists. Please sign in.',
    })
    return
  }

  const passwordHash = await hashPassword(password)
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      initials: initialsFromName(name),
      role,
      affiliation,
      expertise: role === 'reviewer' ? expertise : null,
    },
  })

  notifyAccountWelcome({
    email: user.email,
    name: user.name,
    role: user.role,
  })

  res.status(201).json({
    ok: true,
    message: 'Account created successfully. Please sign in.',
    role: user.role,
    roleLabel: roleLabels[user.role],
  })
})

router.post('/login', async (req, res) => {
  const email = String(req.body?.email ?? '')
    .trim()
    .toLowerCase()
  const password = String(req.body?.password ?? '')

  if (!email || !password) {
    res.status(400).json({ ok: false, error: 'Email and password are required.' })
    return
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user?.passwordHash) {
    res.status(401).json({ ok: false, error: 'Invalid email or password.' })
    return
  }

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) {
    res.status(401).json({ ok: false, error: 'Invalid email or password.' })
    return
  }

  // Collapse legacy Editorial Office accounts into the single Editor role.
  const signedIn =
    user.role === 'office'
      ? await prisma.user.update({
          where: { id: user.id },
          data: { role: 'editor' },
        })
      : user

  const token = signAuthToken({
    sub: signedIn.id,
    email: signedIn.email,
    role: signedIn.role,
  })

  res.json({ ok: true, token, user: toPublicUser(signedIn) })
})

router.get('/me', requireAuth, async (req: AuthedRequest, res) => {
  let user = await prisma.user.findUnique({ where: { id: req.user!.id } })
  if (!user) {
    res.status(401).json({ ok: false, error: 'User not found.' })
    return
  }
  if (user.role === 'office') {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { role: 'editor' },
    })
  }
  res.json({ ok: true, user: toPublicUser(user) })
})

router.patch('/notification-prefs', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(typeof req.body?.notifyEmail === 'boolean'
          ? { notifyEmail: req.body.notifyEmail }
          : {}),
        ...(typeof req.body?.notifyDeadlines === 'boolean'
          ? { notifyDeadlines: req.body.notifyDeadlines }
          : {}),
        ...(typeof req.body?.notifyDecisions === 'boolean'
          ? { notifyDecisions: req.body.notifyDecisions }
          : {}),
      },
    })
    res.json({ ok: true, user: toPublicUser(user) })
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to save preferences',
    })
  }
})

router.post('/change-password', requireAuth, async (req: AuthedRequest, res) => {
  const currentPassword = String(req.body?.currentPassword ?? '')
  const newPassword = String(req.body?.newPassword ?? '')

  if (!currentPassword || newPassword.length < 6) {
    res.status(400).json({
      ok: false,
      error: 'Current password and a new password (6+ characters) are required.',
    })
    return
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
  if (!user?.passwordHash) {
    res.status(400).json({ ok: false, error: 'Password cannot be changed for this account.' })
    return
  }

  const valid = await verifyPassword(currentPassword, user.passwordHash)
  if (!valid) {
    res.status(401).json({ ok: false, error: 'Current password is incorrect.' })
    return
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(newPassword),
      passwordResetToken: null,
      passwordResetExpires: null,
    },
  })

  res.json({ ok: true, message: 'Password updated.' })
})

router.post('/forgot-password', async (req, res) => {
  const email = String(req.body?.email ?? '')
    .trim()
    .toLowerCase()

  if (!isValidEmail(email)) {
    res.status(400).json({ ok: false, error: 'Please enter a valid email.' })
    return
  }

  const user = await prisma.user.findUnique({ where: { email } })
  const emailDelivery = isEmailDeliveryEnabled()
  const generic = {
    ok: true,
    message: emailDelivery
      ? 'If that email is registered, check your inbox for a reset code.'
      : 'If that email is registered, enter the reset code below to continue.',
  }

  if (!user) {
    res.json(generic)
    return
  }

  const resetToken = crypto.randomBytes(24).toString('hex')
  const passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000)

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: resetToken,
      passwordResetExpires,
    },
  })

  notifyPasswordReset({
    email: user.email,
    name: user.name,
    resetToken,
  })

  if (!emailDelivery) {
    console.info(`[password-reset] ${email} → ${resetToken}`)
  }

  res.json({
    ...generic,
    // Until SMTP is configured, return the code so the user can reset locally.
    ...(!emailDelivery || process.env.DEMO_MODE === 'true'
      ? { resetToken, email }
      : {}),
  })
})

router.post('/reset-password', async (req, res) => {
  const email = String(req.body?.email ?? '')
    .trim()
    .toLowerCase()
  const token = String(req.body?.token ?? '').trim()
  const newPassword = String(req.body?.newPassword ?? '')

  if (!isValidEmail(email) || !token) {
    res.status(400).json({ ok: false, error: 'Email and reset code are required.' })
    return
  }
  if (newPassword.length < 6) {
    res.status(400).json({
      ok: false,
      error: 'Password must be at least 6 characters.',
    })
    return
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (
    !user?.passwordResetToken ||
    !user.passwordResetExpires ||
    user.passwordResetToken !== token ||
    user.passwordResetExpires < new Date()
  ) {
    res.status(400).json({
      ok: false,
      error: 'Reset code is invalid or expired. Request a new one.',
    })
    return
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(newPassword),
      passwordResetToken: null,
      passwordResetExpires: null,
    },
  })

  res.json({ ok: true, message: 'Password reset. You can sign in now.' })
})

export default router
