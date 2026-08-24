import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { roleLabels, type AppRole } from '../data/mock'
import { BrandMark } from '../components/BrandMark'
import { PasswordInput } from '../components/PasswordInput'
import { Toast } from '../components/Toast'
import { apiFetch } from '../lib/api'

const registerRoles: AppRole[] = [
  'author',
  'reviewer',
  'editor',
  'production',
]

type FieldErrors = {
  name?: string
  email?: string
  password?: string
  confirm?: string
  role?: string
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

function passwordStrength(password: string) {
  if (password.length < 6) return { label: 'Too short', ok: false }
  const hasLetter = /[a-zA-Z]/.test(password)
  const hasNumber = /\d/.test(password)
  if (password.length >= 8 && hasLetter && hasNumber) {
    return { label: 'Strong', ok: true }
  }
  if (hasLetter || hasNumber) return { label: 'Okay', ok: true }
  return { label: 'Weak', ok: false }
}

export function RegisterPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [affiliation, setAffiliation] = useState('')
  const [expertise, setExpertise] = useState('')
  const [role, setRole] = useState<AppRole>('author')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const strength = useMemo(() => passwordStrength(password), [password])

  function validate(): FieldErrors {
    const next: FieldErrors = {}
    if (name.trim().length < 2) next.name = 'Enter your full name (at least 2 characters).'
    if (!isValidEmail(email)) next.email = 'Enter a valid email address.'
    if (!registerRoles.includes(role)) next.role = 'Choose an account type.'
    if (password.length < 6) next.password = 'Password must be at least 6 characters.'
    else if (!strength.ok) next.password = 'Use a stronger password with letters or numbers.'
    if (confirm !== password) next.confirm = 'Passwords do not match.'
    return next
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setPending(true)
    try {
      await apiFetch<{ ok: boolean; message?: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
          affiliation: affiliation.trim() || undefined,
          expertise: role === 'reviewer' ? expertise.trim() || undefined : undefined,
        }),
      })
      setToast('Account created. Please sign in.')
      window.setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: {
            registered: true,
            email: email.trim().toLowerCase(),
          },
        })
      }, 900)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Registration failed.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="auth-canvas relative flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      {toast ? <Toast message={toast} tone="success" /> : null}

      <div className="auth-card relative z-10 w-full max-w-[28rem] animate-fade">
        <BrandMark size="md" />
        <p className="mt-7 text-[0.7rem] font-semibold tracking-[0.16em] text-signal-600 uppercase">
          Create account
        </p>
        <h1 className="mt-2 font-display text-[1.85rem] font-semibold tracking-tight text-ink-800">
          Join MMS
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">
          Choose your role, create your account, then sign in to open your own
          dashboard.
        </p>

        <form className="mt-7 space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="role">I am registering as</label>
            <select
              id="role"
              value={role}
              onChange={(e) => {
                setRole(e.target.value as AppRole)
                setErrors((prev) => ({ ...prev, role: undefined }))
              }}
            >
              {registerRoles.map((item) => (
                <option key={item} value={item}>
                  {roleLabels[item]}
                </option>
              ))}
            </select>
            {errors.role ? (
              <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.role}</p>
            ) : (
              <p className="mt-1.5 text-xs text-ink-300">
                Your dashboard and permissions match this role. You cannot open
                other role workspaces.
              </p>
            )}
          </div>

          <div className="field">
            <label htmlFor="name">Full name</label>
            <input
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setErrors((prev) => ({ ...prev, name: undefined }))
              }}
              autoComplete="name"
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name ? (
              <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.name}</p>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setErrors((prev) => ({ ...prev, email: undefined }))
              }}
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email ? (
              <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.email}</p>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="affiliation">Institution / organization</label>
            <input
              id="affiliation"
              value={affiliation}
              onChange={(e) => setAffiliation(e.target.value)}
              autoComplete="organization"
              placeholder="University, institute, or publisher"
            />
          </div>

          {role === 'reviewer' ? (
            <div className="field">
              <label htmlFor="expertise">Expertise (optional)</label>
              <input
                id="expertise"
                value={expertise}
                onChange={(e) => setExpertise(e.target.value)}
                placeholder="e.g. Machine learning, hydrology"
              />
            </div>
          ) : null}

          <PasswordInput
            id="password"
            label="Password"
            value={password}
            onChange={(value) => {
              setPassword(value)
              setErrors((prev) => ({ ...prev, password: undefined }))
            }}
            autoComplete="new-password"
            error={errors.password}
            hint={
              password
                ? `Strength: ${strength.label}. Use at least 6 characters.`
                : 'At least 6 characters. Mix letters and numbers if you can.'
            }
          />

          <PasswordInput
            id="confirm"
            label="Confirm password"
            value={confirm}
            onChange={(value) => {
              setConfirm(value)
              setErrors((prev) => ({ ...prev, confirm: undefined }))
            }}
            autoComplete="new-password"
            error={errors.confirm}
          />

          {formError ? (
            <p className="rounded-[var(--radius-md)] bg-rose-50 px-3 py-2 text-sm text-rose-600">
              {formError}
            </p>
          ) : null}

          <button type="submit" className="btn btn-signal w-full" disabled={pending}>
            {pending ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-500">
          Already registered?{' '}
          <Link
            to="/login"
            className="font-semibold text-signal-700 underline decoration-signal-400/50 underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
