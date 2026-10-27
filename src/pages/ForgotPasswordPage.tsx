import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark'
import { PasswordInput } from '../components/PasswordInput'
import { useToast } from '../components/ToastProvider'
import { apiFetch } from '../lib/api'

export function ForgotPasswordPage() {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [step, setStep] = useState<'request' | 'reset'>('request')
  const [pending, setPending] = useState(false)

  async function handleRequest(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    try {
      const data = await apiFetch<{
        ok: boolean
        message: string
        resetToken?: string
      }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      toast.success(data.message)
      if (data.resetToken) {
        setToken(data.resetToken)
      }
      setStep('reset')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Request failed.')
    } finally {
      setPending(false)
    }
  }

  async function handleReset(event: FormEvent) {
    event.preventDefault()
    if (newPassword !== confirm) {
      toast.error('Passwords do not match.')
      return
    }
    setPending(true)
    try {
      const data = await apiFetch<{ ok: boolean; message: string }>(
        '/api/auth/reset-password',
        {
          method: 'POST',
          body: JSON.stringify({ email, token, newPassword }),
        },
      )
      toast.success(data.message)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reset failed.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="auth-canvas relative flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <div className="auth-card relative z-10 w-full max-w-[26rem] animate-fade">
        <BrandMark size="md" />
        <p className="mt-7 text-[0.7rem] font-semibold tracking-[0.16em] text-signal-600 uppercase">
          Account recovery
        </p>
        <h1 className="mt-2 font-display text-[1.85rem] font-semibold tracking-tight text-ink-800">
          Reset password
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">
          {step === 'request'
            ? 'Enter your account email to start a password reset.'
            : 'Enter your reset code and choose a new password.'}
        </p>

        {step === 'request' ? (
          <form className="mt-7 space-y-4" onSubmit={handleRequest}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <button type="submit" className="btn btn-signal w-full" disabled={pending}>
              {pending ? 'Sending…' : 'Continue'}
            </button>
          </form>
        ) : (
          <form className="mt-7 space-y-4" onSubmit={handleReset}>
            {token ? (
              <p className="rounded-[var(--radius-md)] bg-signal-50 px-3 py-2 text-sm text-signal-700">
                Reset code ready. Confirm it below, then choose a new password.
              </p>
            ) : null}
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="field">
              <label htmlFor="token">Reset code</label>
              <input
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
              />
              <p className="mt-1.5 text-xs text-ink-300">
                Use the reset code issued for your account.
              </p>
            </div>
            <PasswordInput
              id="newPassword"
              label="New password"
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
            />
            <PasswordInput
              id="confirm"
              label="Confirm password"
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
            />
            <button type="submit" className="btn btn-signal w-full" disabled={pending}>
              {pending ? 'Updating…' : 'Reset password'}
            </button>
            <button
              type="button"
              className="btn btn-ghost w-full"
              onClick={() => setStep('request')}
            >
              Back
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-ink-500">
          <Link
            to="/login"
            className="font-semibold text-signal-700 underline decoration-signal-400/50 underline-offset-4"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
