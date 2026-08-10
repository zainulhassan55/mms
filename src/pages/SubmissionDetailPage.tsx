import { Link, useParams } from 'react-router-dom'
import { StatusBadge } from '../components/StatusBadge'
import { manuscripts, statusLabels } from '../data/mock'

const tabs = ['Overview', 'Files', 'Reviews', 'Decisions', 'Production', 'Log'] as const

export function SubmissionDetailPage() {
  const { id } = useParams()
  const manuscript =
    manuscripts.find((item) => item.id === id) ?? manuscripts[0]

  return (
    <div className="space-y-6 animate-rise">
      <div>
        <Link
          to="/dashboard"
          className="text-sm font-semibold text-signal-600 hover:text-signal-700"
        >
          ← Back to dashboard
        </Link>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wide text-ink-500">
              {manuscript.id} · {manuscript.journal}
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink-800">
              {manuscript.title}
            </h1>
            <p className="mt-2 text-sm text-ink-500">
              {manuscript.authors} · {manuscript.articleType} · Version{' '}
              {manuscript.version}
            </p>
          </div>
          <StatusBadge status={manuscript.status} />
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-line pb-px">
        {tabs.map((tab, index) => (
          <button
            key={tab}
            type="button"
            className={index === 0 ? 'detail-tab detail-tab-active' : 'detail-tab'}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
        <div className="surface space-y-5 p-5 sm:p-6">
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">
              Current status
            </h2>
            <p className="mt-2 text-lg font-semibold text-ink-800">
              {statusLabels[manuscript.status]}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">
              This is a design preview of the manuscript detail layout. Workflow
              actions, file versions, and review rounds will connect here next.
            </p>
          </div>

          <dl className="grid gap-4 sm:grid-cols-2">
            <Meta label="Submitted" value={manuscript.submittedAt ?? '—'} />
            <Meta label="Last updated" value={manuscript.updatedAt} />
            <Meta label="Article type" value={manuscript.articleType} />
            <Meta label="Version" value={`v${manuscript.version}`} />
          </dl>
        </div>

        <aside className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide text-ink-700 uppercase">
            Next steps
          </h2>
          <div className="surface-quiet space-y-3 p-4">
            {manuscript.status === 'revision_requested' ? (
              <Link
                to={`/author/submissions/${manuscript.id}/revise`}
                className="btn btn-signal w-full"
              >
                Upload revision
              </Link>
            ) : null}
            {manuscript.status === 'proof_sent' ? (
              <Link
                to={`/author/submissions/${manuscript.id}/proof`}
                className="btn btn-signal w-full"
              >
                Review proof
              </Link>
            ) : null}
            {manuscript.status === 'draft' ? (
              <Link
                to={`/author/submissions/${manuscript.id}`}
                className="btn btn-signal w-full"
              >
                Continue draft
              </Link>
            ) : null}
            <button type="button" className="btn btn-ghost w-full">
              Download latest files
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-wide text-ink-300 uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-ink-800">{value}</dd>
    </div>
  )
}
