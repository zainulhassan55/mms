import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { PublicPageHeader } from '../../components/public/PublicPageHeader'
import { PublicSiteChrome } from '../../components/public/PublicSiteChrome'

export function PublicForEditorsPage() {
  const { isAuthenticated } = useAuth()
  const requestTo = isAuthenticated ? '/request-journal' : '/login'

  return (
    <PublicSiteChrome>
      <PublicPageHeader
        title="For editors"
        description="Host your journal on MMS. After site-admin approval you manage settings, staff, and the editorial workflow."
      />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <ul className="max-w-2xl overflow-hidden rounded-xl border border-[var(--pub-line)] bg-white">
          {[
            'Request a journal workspace from your account.',
            'Site admin reviews and approves the request.',
            'Configure the journal, invite editors and reviewers, and open submissions.',
            'Run peer review, decisions, production, and publication online.',
          ].map((line) => (
            <li
              key={line}
              className="border-b border-[var(--pub-line)] px-5 py-4 text-sm leading-relaxed text-[var(--pub-ink-soft)] last:border-b-0 sm:px-6 sm:text-base"
            >
              {line}
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            to={requestTo}
            className="inline-flex rounded-md bg-[var(--pub-accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--pub-accent-hover)]"
          >
            {isAuthenticated ? 'Request a journal' : 'Sign in to request a journal'}
          </Link>
          <Link
            to="/how-it-works"
            className="inline-flex rounded-md border border-[var(--pub-line)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--pub-ink)] hover:bg-[var(--pub-page)]"
          >
            How it works
          </Link>
        </div>
      </div>
    </PublicSiteChrome>
  )
}
