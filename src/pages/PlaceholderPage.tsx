import { Link } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark'

export function PlaceholderPage({
  title,
  description,
  standalone = false,
}: {
  title: string
  description: string
  standalone?: boolean
}) {
  return (
    <div
      className={`mx-auto flex max-w-lg flex-col items-center justify-center px-4 text-center animate-rise ${
        standalone ? 'min-h-screen app-bg' : 'min-h-[55vh]'
      }`}
    >
      {standalone ? <BrandMark size="sm" /> : null}
      <h1
        className={`font-display text-3xl font-semibold tracking-tight text-ink-800 ${
          standalone ? 'mt-8' : ''
        }`}
      >
        {title}
      </h1>
      <p className="mt-3 text-ink-500">{description}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {standalone ? (
          <Link to="/login" className="btn btn-ghost">
            Back to login
          </Link>
        ) : (
          <Link to="/dashboard" className="btn btn-ghost">
            Back to dashboard
          </Link>
        )}
        <Link to="/dashboard" className="btn btn-signal">
          Open dashboard
        </Link>
      </div>
    </div>
  )
}
