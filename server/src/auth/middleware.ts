import type { NextFunction, Request, Response } from 'express'
import type { AppRole } from '@prisma/client'
import { verifyAuthToken } from './jwt.js'

export type AuthedRequest = Request & {
  user?: {
    id: string
    email: string
    role: AppRole
  }
}

export function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    res.status(401).json({ ok: false, error: 'Sign in required.' })
    return
  }

  try {
    const payload = verifyAuthToken(token)
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    }
    next()
  } catch {
    res.status(401).json({ ok: false, error: 'Session expired. Please sign in again.' })
  }
}
