import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  DataPanel,
  EmptyState,
  Notice,
  PageHeader,
} from '../../components/ui'
import {
  fetchPortalSync,
  retryPortalSync,
  type ApiManuscript,
  type PortalSyncLogItem,
} from '../../lib/manuscripts'

export function PortalSyncPage() {
  const [endpoint, setEndpoint] = useState('POST /api/portal/articles')
  const [syncLog, setSyncLog] = useState<PortalSyncLogItem[]>([])
  const [published, setPublished] = useState<ApiManuscript[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function reload() {
    const data = await fetchPortalSync()
    setEndpoint(data.endpoint)
    setSyncLog(data.syncLog)
    setPublished(data.published)
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        await reload()
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load portal sync.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleRetry(id: string) {
    setPendingId(id)
    setError(null)
    setMessage(null)
    try {
      await retryPortalSync(id)
      setMessage(`Portal sync retried for ${id}.`)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Re-sync failed.')
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="page-stack animate-rise">
      <PageHeader
        title="Portal sync"
        description={`On publish, MMS records public metadata sync events for ${endpoint}.`}
      />

      {error ? <Notice tone="warn">{error}</Notice> : null}
      {message ? <Notice tone="success">{message}</Notice> : null}

      <DataPanel
        title="Sync log"
        count={loading ? undefined : syncLog.length}
        size="lg"
        scroll={!loading && syncLog.length > 0}
      >
        {loading ? (
          <EmptyState>Loading…</EmptyState>
        ) : syncLog.length === 0 ? (
          <EmptyState>
            No sync events yet. Publish an article from Production to create one.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {syncLog.map((item) => (
              <li key={item.id} className="px-4 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-ink-500">
                      {item.manuscriptId} · {item.at} · {item.status}
                    </p>
                    <p className="mt-1 font-semibold text-ink-800">{item.title}</p>
                    <p className="mt-1 text-sm text-ink-500">
                      {item.doi} · {item.journal}
                    </p>
                    <p className="mt-2 text-sm text-ink-600">{item.detail}</p>
                    <p className="mt-2 rounded-md bg-paper px-3 py-2 font-mono text-xs text-ink-500 break-all">
                      {item.payloadPreview}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-signal-700">
                    {item.endpoint}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DataPanel>

      <DataPanel
        title="Published articles"
        count={loading ? undefined : published.length}
        size="md"
        scroll={!loading && published.length > 0}
      >
        {loading ? (
          <EmptyState>Loading…</EmptyState>
        ) : published.length === 0 ? (
          <EmptyState>No published articles yet.</EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {published.map((item) => (
              <li key={item.id} className="list-row">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-ink-500">
                    {item.id}
                    {item.portalSyncStatus
                      ? ` · Portal ${item.portalSyncStatus}`
                      : ''}
                  </p>
                  <p className="mt-1 font-semibold text-ink-800">{item.title}</p>
                  <p className="mt-1 text-sm text-ink-500">{item.doi ?? 'No DOI'}</p>
                </div>
                <div className="flex gap-2">
                  <Link
                    to={`/author/submissions/${item.id}`}
                    className="btn btn-ghost"
                  >
                    View
                  </Link>
                  <button
                    type="button"
                    className="btn btn-signal"
                    disabled={pendingId === item.id}
                    onClick={() => void handleRetry(item.id)}
                  >
                    {pendingId === item.id ? 'Syncing…' : 'Re-sync'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DataPanel>
    </div>
  )
}
