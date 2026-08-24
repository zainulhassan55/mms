import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { specialIssues } from '../../data/journals'
import { Toast } from '../../components/Toast'
import { BackLink } from '../../components/ui'
import { createManuscript, fetchJournals } from '../../lib/manuscripts'
import {
  AuthorsStep,
  DetailsStep,
  EthicsStep,
  FilesStep,
  JournalStep,
  ReviewStep,
  type JournalOption,
} from './steps'
import {
  createInitialDraft,
  wizardSteps,
  type SubmissionDraft,
} from './types'

export function NewSubmissionPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [stepIndex, setStepIndex] = useState(0)
  const [draft, setDraft] = useState<SubmissionDraft>(() =>
    createInitialDraft({
      name: user?.name ?? '',
      email: user?.email ?? '',
      affiliation: user?.affiliation ?? '',
    }),
  )
  const [journals, setJournals] = useState<JournalOption[]>([])
  const [journalsLoading, setJournalsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setJournalsLoading(true)
      try {
        const items = await fetchJournals()
        if (cancelled) return
        const options = items.map((item) => ({
          id: item.code,
          name: item.name,
          issn: item.issn,
          description: item.description,
        }))
        setJournals(options)
        setDraft((prev) => {
          if (options.some((item) => item.id === prev.journalId)) return prev
          return { ...prev, journalId: options[0]?.id ?? prev.journalId }
        })
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load journals.',
          )
        }
      } finally {
        if (!cancelled) setJournalsLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const step = wizardSteps[stepIndex]
  const progress = ((stepIndex + 1) / wizardSteps.length) * 100

  const validationMessage = useMemo(
    () => getStepError(step.id, draft),
    [step.id, draft],
  )

  function patchDraft(patch: Partial<SubmissionDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }))
    setError(null)
  }

  function goNext() {
    const message = getStepError(step.id, draft)
    if (message) {
      setError(message)
      return
    }
    setError(null)
    setStepIndex((index) => Math.min(index + 1, wizardSteps.length - 1))
  }

  function goBack() {
    setError(null)
    setStepIndex((index) => Math.max(index - 1, 0))
  }

  async function persist(status: 'draft' | 'submitted') {
    const message =
      status === 'submitted' ? getSubmitError(draft) : getDraftError(draft)
    if (message) {
      setError(message)
      return
    }

    setSaving(true)
    setError(null)
    try {
      const specialIssue =
        specialIssues.find((item) => item.id === draft.specialIssueId)?.label ??
        null

      const manuscript = await createManuscript({
        status,
        title: draft.title.trim() || 'Untitled draft',
        journalCode: draft.journalId,
        articleType: draft.articleType,
        abstract: draft.abstract.trim(),
        keywords: draft.keywords.trim(),
        specialIssue: draft.specialIssueId === 'none' ? null : specialIssue,
        authors: draft.authors.map((author) => ({
          name: author.name,
          email: author.email,
          affiliation: author.affiliation,
          corresponding: author.corresponding,
        })),
        manuscriptFile: draft.manuscriptFile?.file ?? null,
        figureFiles: draft.figureFiles.map((item) => item.file),
        supplementaryFiles: draft.supplementaryFiles.map((item) => item.file),
        coverLetter: draft.coverLetter,
        ethics: {
          conflictDetails: draft.conflictDetails,
          fundingStatement: draft.fundingStatement,
          dataAvailability: draft.dataAvailability,
          ethicsDetails: draft.ethicsDetails,
        },
      })

      setToast(
        status === 'submitted'
          ? 'Manuscript submitted successfully.'
          : 'Draft saved successfully.',
      )
      window.setTimeout(() => {
        navigate(`/author/submissions/${manuscript.id}`, { replace: true })
      }, 700)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save manuscript.')
      setSaving(false)
    }
  }

  return (
    <div className="page-stack mx-auto max-w-3xl animate-rise">
      {toast ? <Toast message={toast} tone="success" /> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <BackLink to="/author/dashboard">← Back to dashboard</BackLink>
          <h1 className="mt-3 font-display text-[1.85rem] leading-[1.12] font-semibold tracking-tight text-ink-800 sm:text-[2.15rem]">
            New submission
          </h1>
          <p className="mt-2 text-sm text-ink-500">
            Step {stepIndex + 1} of {wizardSteps.length}: {step.label}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost shrink-0"
          disabled={saving}
          onClick={() => void persist('draft')}
        >
          Save draft
        </button>
      </div>

      <div className="surface overflow-hidden">
        <div className="border-b border-line bg-paper-soft px-4 py-3 sm:px-5">
          <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-signal-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <ol className="flex gap-1 overflow-x-auto">
            {wizardSteps.map((item, index) => {
              const active = index === stepIndex
              const done = index < stepIndex
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`rounded-md px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                      active
                        ? 'bg-signal-50 text-signal-700'
                        : done
                          ? 'text-ink-700 hover:bg-ink-50'
                          : 'text-ink-300'
                    }`}
                    onClick={() => {
                      if (index <= stepIndex) {
                        setError(null)
                        setStepIndex(index)
                      }
                    }}
                  >
                    {index + 1}. {item.label}
                  </button>
                </li>
              )
            })}
          </ol>
        </div>

        <div className="p-5 sm:p-6">
          {step.id === 'journal' ? (
            <JournalStep
              draft={draft}
              onChange={patchDraft}
              journals={journals}
              loading={journalsLoading}
            />
          ) : null}
          {step.id === 'details' ? (
            <DetailsStep draft={draft} onChange={patchDraft} />
          ) : null}
          {step.id === 'authors' ? (
            <AuthorsStep draft={draft} onChange={patchDraft} />
          ) : null}
          {step.id === 'files' ? (
            <FilesStep draft={draft} onChange={patchDraft} />
          ) : null}
          {step.id === 'ethics' ? (
            <EthicsStep draft={draft} onChange={patchDraft} />
          ) : null}
          {step.id === 'review' ? (
            <ReviewStep draft={draft} journals={journals} />
          ) : null}

          {error || validationMessage ? (
            <p className="mt-5 rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">
              {error ?? validationMessage}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={goBack}
              disabled={stepIndex === 0 || saving}
            >
              Back
            </button>

            <div className="flex flex-col gap-3 sm:flex-row">
              {step.id === 'review' ? (
                <button
                  type="button"
                  className="btn btn-signal"
                  disabled={saving}
                  onClick={() => void persist('submitted')}
                >
                  {saving ? 'Submitting…' : 'Submit manuscript'}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-signal"
                  onClick={goNext}
                  disabled={saving}
                >
                  Continue
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function getStepError(stepId: string, draft: SubmissionDraft): string | null {
  if (stepId === 'journal') {
    if (!draft.journalId) return 'Please select a journal.'
    if (!draft.articleType) return 'Please select an article type.'
  }

  if (stepId === 'details') {
    if (!draft.title.trim()) return 'Please enter a manuscript title.'
    if (draft.abstract.trim().length < 40) {
      return 'Please provide a short abstract (at least a few sentences).'
    }
    if (!draft.keywords.trim()) return 'Please add at least one keyword.'
  }

  if (stepId === 'authors') {
    if (draft.authors.some((author) => !author.name.trim() || !author.email.trim())) {
      return 'Each author needs a name and email.'
    }
    if (!draft.authors.some((author) => author.corresponding)) {
      return 'Please mark one corresponding author.'
    }
  }

  if (stepId === 'files') {
    if (!draft.coverLetter.trim()) return 'Please add a cover letter.'
    if (!draft.manuscriptFile) return 'Please upload the main manuscript file.'
  }

  if (stepId === 'ethics') {
    if (!draft.conflictOfInterest) {
      return 'Please confirm the conflict of interest declaration.'
    }
    if (!draft.conflictDetails.trim()) {
      return 'Please enter conflict details, or write “None”.'
    }
    if (!draft.fundingStatement.trim()) {
      return 'Please provide a funding statement.'
    }
    if (!draft.dataAvailability.trim()) {
      return 'Please provide a data availability statement.'
    }
    if (!draft.ethicsApproval) {
      return 'Please confirm ethics approval (or mark N/A in notes and check the box).'
    }
    if (!draft.ethicsDetails.trim()) {
      return 'Please add ethics notes, or write “Not applicable”.'
    }
  }

  return null
}

function getDraftError(draft: SubmissionDraft): string | null {
  if (!draft.title.trim() && !draft.abstract.trim()) {
    return 'Add a title or abstract before saving a draft.'
  }
  return null
}

function getSubmitError(draft: SubmissionDraft): string | null {
  for (const step of wizardSteps) {
    if (step.id === 'review') continue
    const message = getStepError(step.id, draft)
    if (message) return message
  }
  return null
}
