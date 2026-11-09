import { Link } from 'react-router-dom'
import { PublicPageHeader } from '../../components/public/PublicPageHeader'
import { PublicSiteChrome } from '../../components/public/PublicSiteChrome'

const steps = [
  {
    title: 'Create an account',
    text: 'Register once. Use the same account to submit papers or manage a journal after approval.',
  },
  {
    title: 'Request or join a journal',
    text: 'Editors can request a journal workspace. Authors open an existing journal to submit.',
  },
  {
    title: 'Peer review',
    text: 'Editors screen submissions, invite reviewers, and collect recommendations.',
  },
  {
    title: 'Decision and publication',
    text: 'Accept, revise, or reject. Accepted papers move through production, proof, and publish.',
  },
]

export function PublicHowItWorksPage() {
  return (
    <PublicSiteChrome>
      <PublicPageHeader
        title="How it works"
        description="A simple path from journal setup to published articles."
      />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <ol className="overflow-hidden rounded-xl border border-[var(--pub-line)] bg-white">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="grid gap-3 border-b border-[var(--pub-line)] px-5 py-6 last:border-b-0 sm:grid-cols-[4.5rem_1fr] sm:gap-8 sm:px-6"
            >
              <p className="font-display text-2xl font-semibold text-[var(--pub-nav)]/25">
                {String(index + 1).padStart(2, '0')}
              </p>
              <div>
                <h2 className="font-display text-xl font-semibold text-[var(--pub-ink)]">
                  {step.title}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--pub-muted)] sm:text-base">
                  {step.text}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            to="/journals"
            className="inline-flex rounded-md bg-[var(--pub-accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--pub-accent-hover)]"
          >
            Browse journals
          </Link>
          <Link
            to="/for-editors"
            className="inline-flex rounded-md border border-[var(--pub-line)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--pub-ink)] hover:bg-[var(--pub-page)]"
          >
            For editors
          </Link>
        </div>
      </div>
    </PublicSiteChrome>
  )
}
