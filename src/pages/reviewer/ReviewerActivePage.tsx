import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DataPanel, EmptyState, PageHeader } from '../../components/ui'
import { recommendationLabels, type ReviewRecommendation } from '../../data/mock'
import {
  fetchMyInvitations,
  fetchMyReviews,
  type ApiInvitation,
  type ApiReview,
} from '../../lib/manuscripts'

export function ReviewerActivePage() {
  const [invitations, setInvitations] = useState<ApiInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const items = await fetchMyInvitations('accepted')
        const active = items.filter((item) => !item.review)
        if (!cancelled) setInvitations(active)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load reviews.')
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
        title="Active reviews"
        description="Accepted invitations awaiting your report."
      />

      {error ? (
        <p className="rounded-[var(--radius-lg)] bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      ) : null}

      <DataPanel
        title="In progress"
        count={loading ? undefined : invitations.length}
        size="lg"
        scroll={!loading && invitations.length > 0}
      >
        {loading ? (
          <EmptyState title="Loading">Loading…</EmptyState>
        ) : invitations.length === 0 ? (
          <EmptyState title="No active reviews">
            Accept an invitation first.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {invitations.map((item) => (
              <li key={item.id}>
                <Link to={`/reviewer/review/${item.id}`} className="icon-row">
                  <span className="icon-row-glyph" aria-hidden>
                    <ClockIcon />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-signal-600">
                      {item.manuscriptId} · Due {item.deadline}
                    </p>
                    <p className="mt-0.5 truncate font-semibold text-ink-800">
                      {item.manuscriptTitle ?? 'Manuscript'}
                    </p>
                    <p className="mt-0.5 text-sm text-ink-500">{item.journal}</p>
                  </div>
                  <span className="text-sm font-semibold text-signal-600">
                    Continue →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </DataPanel>
    </div>
  )
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 8v4l2.5 2.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function ReviewerHistoryPage() {
  const [reviews, setReviews] = useState<ApiReview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const items = await fetchMyReviews()
        if (!cancelled) setReviews(items)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load history.')
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
        title="Review history"
        description="Reports you have submitted for peer review."
      />

      {error ? (
        <p className="rounded-[var(--radius-lg)] bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      ) : null}

      <DataPanel
        title="Submitted reports"
        count={loading ? undefined : reviews.length}
        size="lg"
        scroll={!loading && reviews.length > 0}
      >
        {loading ? (
          <EmptyState title="Loading">Loading…</EmptyState>
        ) : reviews.length === 0 ? (
          <EmptyState title="No submitted reviews">
            Finish an active review to see it here.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {reviews.map((item) => (
              <li key={item.id} className="px-4 py-4 sm:px-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-ink-500">
                      {item.manuscriptId} · Submitted {item.submittedAt}
                    </p>
                    <p className="mt-1 font-semibold text-ink-800">
                      {item.manuscriptTitle ?? 'Manuscript'}
                    </p>
                    <p className="mt-1 text-sm text-ink-500">{item.journal}</p>
                    <p className="mt-2 line-clamp-2 text-sm text-ink-600">
                      {item.summary}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-ink-700">
                    {recommendationLabels[
                      item.recommendation as ReviewRecommendation
                    ] ?? item.recommendation}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DataPanel>
    </div>
  )
}
