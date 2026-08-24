import { useEffect, useState } from 'react'
import {
  DataPanel,
  EmptyState,
  PageHeader,
  ScrollArea,
  SectionTitle,
} from '../../components/ui'
import { fetchAdminDirectory } from '../../lib/manuscripts'

type DirectoryState = Awaited<ReturnType<typeof fetchAdminDirectory>>

export function AdminJournalsPage() {
  const [data, setData] = useState<DirectoryState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const directory = await fetchAdminDirectory()
        if (!cancelled) setData(directory)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load directory.')
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

  return (
    <div className="page-stack animate-rise">
      <PageHeader
        title="Journals"
        description="Journals and people directory from the live database."
      />

      {error ? (
        <p className="rounded-[var(--radius-lg)] bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      ) : null}

      <section>
        <SectionTitle title="Journals" />
        <div className="surface overflow-hidden">
          {loading ? (
            <EmptyState>Loading journals…</EmptyState>
          ) : !data?.journals.length ? (
            <EmptyState>No journals found.</EmptyState>
          ) : (
            <ScrollArea size="sm">
              <div className="divide-y divide-line">
                {data.journals.map((journal) => (
                  <div key={journal.id} className="px-5 py-4">
                    <p className="font-semibold text-ink-800">{journal.name}</p>
                    <p className="mt-1 text-sm text-ink-500">
                      {journal.description || 'No description'}
                    </p>
                    <p className="mt-2 text-xs font-medium text-ink-300">
                      {journal.issn ? `ISSN ${journal.issn} · ` : ''}
                      {journal.code}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <DataPanel
          title="Editors"
          count={loading ? undefined : data?.editors.length}
          size="md"
          scroll={!loading && Boolean(data?.editors.length)}
        >
          {loading ? (
            <EmptyState>Loading…</EmptyState>
          ) : !data?.editors.length ? (
            <EmptyState>No editors found.</EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {data.editors.map((editor) => (
                <li key={editor.id} className="px-4 py-3">
                  <p className="font-semibold text-ink-800">{editor.name}</p>
                  <p className="text-sm text-ink-500">
                    {editor.email}
                    {editor.affiliation ? ` · ${editor.affiliation}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </DataPanel>

        <DataPanel
          title="Reviewer directory"
          count={loading ? undefined : data?.reviewers.length}
          size="md"
          scroll={!loading && Boolean(data?.reviewers.length)}
        >
          {loading ? (
            <EmptyState>Loading…</EmptyState>
          ) : !data?.reviewers.length ? (
            <EmptyState>No reviewers found.</EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {data.reviewers.map((reviewer) => (
                <li key={reviewer.id} className="px-4 py-3">
                  <p className="font-semibold text-ink-800">{reviewer.name}</p>
                  <p className="text-sm text-ink-500">
                    {[reviewer.affiliation, reviewer.expertise]
                      .filter(Boolean)
                      .join(' · ') || reviewer.email}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </DataPanel>
      </section>
    </div>
  )
}
