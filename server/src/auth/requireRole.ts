import type { NextFunction, Response } from 'express'
import type { AppRole } from '@prisma/client'
import type { AuthedRequest } from './middleware.js'

export function requireRole(...roles: AppRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ ok: false, error: 'Sign in required.' })
      return
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        ok: false,
        error: 'You do not have permission for this action.',
      })
      return
    }
    next()
  }
}
