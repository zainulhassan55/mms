import jwt from 'jsonwebtoken'
import type { AppRole } from '@prisma/client'

export type AuthTokenPayload = {
  sub: string
  email: string
  role: AppRole
}

function getSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is missing in server/.env')
  }
  return secret
}

export function signAuthToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, getSecret(), { expiresIn: '7d' })
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, getSecret()) as AuthTokenPayload
}
