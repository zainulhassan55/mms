import { Link } from 'react-router-dom'
import { StatusBadge } from '../components/StatusBadge'
import { activity, manuscripts } from '../data/mock'

const actionNeeded = manuscripts.filter((m) =>
  ['revision_requested', 'proof_sent', 'draft'].includes(m.status),
)

export function AuthorDashboard() {
  return (
    <div className="space-y-8">
      <section className="animate-rise">
        <p className="text-xs font-semibold tracking-[0.14em] text-signal-600 uppercase">
          Author workspace
        </p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-800 sm:text-4xl">
              Your manuscripts
            </h1>
            <p className="mt-2 max-w-xl text-ink-500">
              Follow every submission from draft to publication. Action items
              stay at the top so nothing stalls.
            </p>
          </div>
          <Link to="/author/submissions/new" className="btn btn-signal shrink-0">
            <PlusIcon />
            New submission
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3 animate-rise-delay-1">
        <Stat
          label="Active submissions"
          value={String(
            manuscripts.filter((m) => !['published', 'rejected', 'draft'].includes(m.status))
              .length,
          )}
        />
        <Stat label="Needs your action" value={String(actionNeeded.length)} accent />
        <Stat
          label="Published"
          value={String(manuscripts.filter((m) => m.status === 'published').length)}
        />
      </section>

      {actionNeeded.length > 0 ? (
        <section className="animate-rise-delay-2">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold tracking-wide text-ink-700 uppercase">
              Needs attention
            </h2>
          </div>
          <div className="grid gap-3">
            {actionNeeded.map((item) => (
              <Link
                key={item.id}
                to={`/author/submissions/${item.id}`}
                className="surface group flex flex-col gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold tracking-wide text-ink-500">
                    {item.id} · {item.journal}
                  </p>
                  <p className="mt-1 truncate font-semibold text-ink-800 group-hover:text-signal-700">
                    {item.title}
                  </p>
                </div>
                <StatusBadge status={item.status} />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr] animate-rise-delay-3">
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold tracking-wide text-ink-700 uppercase">
              All submissions
            </h2>
            <Link
              to="/author/submissions"
              className="text-sm font-semibold text-signal-600 hover:text-signal-700"
            >
              View all
            </Link>
          </div>

          <div className="surface overflow-hidden">
            <ul className="divide-y divide-line">
              {manuscripts.map((item) => (
                <li key={item.id}>
                  <Link
                    to={`/author/submissions/${item.id}`}
                    className="flex flex-col gap-3 px-4 py-4 transition hover:bg-paper-soft sm:flex-row sm:items-center sm:justify-between sm:gap-6"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-ink-500">
                        <span>{item.id}</span>
                        <span className="text-ink-300">·</span>
                        <span>{item.articleType}</span>
                        <span className="text-ink-300">·</span>
                        <span>v{item.version}</span>
                      </div>
                      <p className="mt-1 truncate font-semibold text-ink-800">
                        {item.title}
                      </p>
                      <p className="mt-1 truncate text-sm text-ink-500">
                        {item.authors}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                      <StatusBadge status={item.status} compact />
                      <p className="text-xs text-ink-300">Updated {item.updatedAt}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside className="space-y-4">
          <h2 className="text-sm font-semibold tracking-wide text-ink-700 uppercase">
            Recent activity
          </h2>
          <div className="surface-quiet p-4">
            <ol className="space-y-4">
              {activity.map((item, index) => (
                <li key={item.id} className="relative flex gap-3 pl-1">
                  {index < activity.length - 1 ? (
                    <span className="absolute top-3 left-[0.55rem] h-[calc(100%+0.5rem)] w-px bg-line" />
                  ) : null}
                  <span className="relative mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-signal-500 ring-4 ring-signal-50" />
                  <div>
                    <p className="text-sm font-semibold text-ink-800">{item.label}</p>
                    <p className="mt-0.5 text-sm text-ink-500">{item.detail}</p>
                    <p className="mt-1 text-xs font-medium text-ink-300">
                      {item.manuscriptId} · {item.at}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="surface overflow-hidden border-ink-800 bg-ink-800 p-5 text-white">
            <p className="font-display text-xl font-semibold tracking-tight text-white">
              Keep momentum
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink-100">
              Proofs and revision requests appear here with clear deadlines —
              no more hunting through email threads.
            </p>
            <Link to="/author/submissions/new" className="btn btn-on-dark mt-5">
              Start a submission
            </Link>
          </div>
        </aside>
      </section>
    </div>
  )
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div
      className={`surface p-4 ${accent ? 'border-signal-100 bg-signal-50/60' : ''}`}
    >
      <p className="text-xs font-semibold tracking-wide text-ink-500 uppercase">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink-800">
        {value}
      </p>
    </div>
  )
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 3v10M3 8h10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
