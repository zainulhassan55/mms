import { Link } from 'react-router-dom'
import { activity } from '../data/mock'

export function NotificationsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-rise">
      <div>
        <p className="text-xs font-semibold tracking-[0.14em] text-signal-600 uppercase">
          Inbox
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink-800">
          Notifications
        </h1>
        <p className="mt-2 text-ink-500">
          Status changes, review invitations, and deadlines appear here.
        </p>
      </div>

      <div className="surface overflow-hidden">
        <ul className="divide-y divide-line">
          {activity.map((item) => (
            <li key={item.id}>
              <Link
                to={`/author/submissions/${item.manuscriptId}`}
                className="block px-4 py-4 transition hover:bg-paper-soft"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink-800">{item.label}</p>
                    <p className="mt-1 text-sm text-ink-500">{item.detail}</p>
                    <p className="mt-2 text-xs font-medium text-ink-300">
                      {item.manuscriptId}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-ink-300">
                    {item.at}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
