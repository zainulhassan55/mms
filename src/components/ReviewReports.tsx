import { useState } from 'react'
import {
  recommendationLabels,
  type ReviewRecommendation,
} from '../data/mock'
import type { ApiReview } from '../lib/manuscripts'

type Props = {
  reviews: ApiReview[]
  /** When true, hide confidential editor-only notes */
  forAuthor?: boolean
  title?: string
}

const recommendationTone: Record<
  ReviewRecommendation,
  { badge: string; bar: string }
> = {
  accept: {
    badge: 'bg-signal-50 text-signal-700 ring-1 ring-signal-100',
    bar: 'bg-signal-500',
  },
  minor_revision: {
    badge: 'bg-amber-50 text-amber-800 ring-1 ring-amber-100',
    bar: 'bg-amber-500',
  },
  major_revision: {
    badge: 'bg-orange-50 text-orange-800 ring-1 ring-orange-100',
    bar: 'bg-orange-500',
  },
  reject: {
    badge: 'bg-rose-50 text-rose-700 ring-1 ring-rose-100',
    bar: 'bg-rose-500',
  },
}

function Field({
  label,
  text,
  tone = 'default',
}: {
  label: string
  text?: string
  tone?: 'default' | 'author' | 'confidential'
}) {
  if (!text?.trim()) return null

  const shell =
    tone === 'confidential'
      ? 'border-amber-100 bg-amber-50/70'
      : tone === 'author'
        ? 'border-signal-100 bg-signal-50/60'
        : 'border-line bg-paper-soft/80'

  return (
    <section className={`rounded-[0.85rem] border px-3.5 py-3 ${shell}`}>
      <p className="text-[0.65rem] font-semibold tracking-[0.12em] text-ink-500 uppercase">
        {label}
      </p>
      <div className="mt-2 max-h-56 overflow-y-auto pr-1">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-700">
          {text}
        </p>
      </div>
    </section>
  )
}

function Score({ label, value }: { label: string; value?: number }) {
  if (value == null) return null
  return (
    <div className="rounded-md border border-line bg-white px-2.5 py-1.5 text-center">
      <p className="text-[0.6rem] font-semibold tracking-wide text-ink-400 uppercase">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-ink-800">
        {value}
        <span className="text-ink-300">/5</span>
      </p>
    </div>
  )
}

function ReviewCard({
  item,
  forAuthor,
  defaultOpen,
}: {
  item: ApiReview
  forAuthor: boolean
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const recommendation = item.recommendation as ReviewRecommendation
  const tone =
    recommendationTone[recommendation] ?? recommendationTone.minor_revision
  const label =
    recommendationLabels[recommendation] ?? item.recommendation

  const hasScores =
    item.originality != null ||
    item.methodology != null ||
    item.clarity != null

  return (
    <li className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-white shadow-[0_1px_0_rgba(7,20,26,0.04)]">
      <div className={`h-1 w-full ${tone.bar}`} aria-hidden />

      <button
        type="button"
        className="flex w-full cursor-pointer items-start gap-3 px-4 py-3.5 text-left transition hover:bg-paper-soft/70"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <span
          className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-paper-soft text-xs font-semibold text-ink-600 ring-1 ring-line"
          aria-hidden
        >
          {(item.reviewerName.trim()[0] || 'R').toUpperCase()}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-ink-800">
              {item.reviewerName}
            </p>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone.badge}`}
            >
              {label}
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-400">
            Submitted {item.submittedAt}
            {!open && item.summary ? (
              <span className="text-ink-500">
                {' '}
                · {item.summary.slice(0, 90)}
                {item.summary.length > 90 ? '…' : ''}
              </span>
            ) : null}
          </p>
        </div>

        <span
          className={`mt-1 shrink-0 text-ink-400 transition ${open ? 'rotate-180' : ''}`}
          aria-hidden
        >
          <ChevronIcon />
        </span>
      </button>

      {open ? (
        <div className="space-y-3 border-t border-line px-4 py-4">
          {!forAuthor && hasScores ? (
            <div className="grid grid-cols-3 gap-2 sm:max-w-xs">
              <Score label="Originality" value={item.originality} />
              <Score label="Methods" value={item.methodology} />
              <Score label="Clarity" value={item.clarity} />
            </div>
          ) : null}

          <Field label="Summary" text={item.summary} />

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Strengths" text={item.strengths} />
            <Field label="Weaknesses" text={item.weaknesses} />
          </div>

          <Field
            label="Comments to author"
            text={item.commentsToAuthor}
            tone="author"
          />

          {!forAuthor ? (
            <Field
              label="Comments to editor · confidential"
              text={item.commentsToEditor}
              tone="confidential"
            />
          ) : null}
        </div>
      ) : null}
    </li>
  )
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ReviewReports({
  reviews,
  forAuthor = false,
  title = 'Reviewer reports',
}: Props) {
  if (reviews.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">
          {title}
        </h2>
        <p className="text-xs font-medium text-ink-400">
          {reviews.length} report{reviews.length === 1 ? '' : 's'} · expand to
          read
        </p>
      </div>
      <ul className="space-y-3">
        {reviews.map((item, index) => (
          <ReviewCard
            key={item.id}
            item={item}
            forAuthor={forAuthor}
            defaultOpen={index === 0}
          />
        ))}
      </ul>
    </div>
  )
}
