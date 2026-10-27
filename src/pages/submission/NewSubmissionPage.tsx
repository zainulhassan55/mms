import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { specialIssues } from '../../data/journals'
import { useToast } from '../../components/ToastProvider'
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

const PORTAL_JOURNAL_KEY = 'mms.portalJournal'

export function NewSubmissionPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [searchParams] = useSearchParams()
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
  const [saving, setSaving] = useState(false)

  const preferredJournal =
    searchParams.get('journal') ??
    sessionStorage.getItem(PORTAL_JOURNAL_KEY) ??
    null

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
          sections: item.sections ?? [],
        }))
        setJournals(options)
        setDraft((prev) => {
          if (
            preferredJournal &&
            options.some((item) => item.id === preferredJournal)
          ) {
            sessionStorage.removeItem(PORTAL_JOURNAL_KEY)
            const preferred = options.find((item) => item.id === preferredJournal)
            return {
              ...prev,
              journalId: preferredJournal,
              sectionId: preferred?.sections?.[0]?.id ?? '',
            }
          }
          if (options.some((item) => item.id === prev.journalId)) {
            const current = options.find((item) => item.id === prev.journalId)
            return {
              ...prev,
              sectionId:
                prev.sectionId || current?.sections?.[0]?.id || '',
            }
          }
          return {
            ...prev,
            journalId: options[0]?.id ?? prev.journalId,
            sectionId: options[0]?.sections?.[0]?.id ?? '',
          }
        })
      } catch (err) {
        if (!cancelled) {
          toast.error(
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
  }, [preferredJournal, toast])

  const step = wizardSteps[stepIndex]
  const progress = ((stepIndex + 1) / wizardSteps.length) * 100

  function patchDraft(patch: Partial<SubmissionDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }))
  }

  function goNext() {
    const message = getStepError(step.id, draft)
    if (message) {
      toast.error(message)
      return
    }
    setStepIndex((index) => Math.min(index + 1, wizardSteps.length - 1))
  }

  function goBack() {
    setStepIndex((index) => Math.max(index - 1, 0))
  }

  async function persist(status: 'draft' | 'submitted') {
    const message =
      status === 'submitted' ? getSubmitError(draft) : getDraftError(draft)
    if (message) {
      toast.error(message)
      return
    }

    setSaving(true)
    try {
      const specialIssue =
        specialIssues.find((item) => item.id === draft.specialIssueId)?.label ??
        null

      const manuscript = await createManuscript({
        status,
        title: draft.title.trim() || 'Untitled draft',
        journalCode: draft.journalId,
        sectionId: draft.sectionId || null,
        articleType: draft.articleType,
        abstract: draft.abstract.trim(),
        keywords: draft.keywords.trim(),
        specialIssue: draft.specialIssueId === 'none' ? null : specialIssue,
        authors: draft.authors.map((author) => ({
          name: author.name,
          email: author.email,
          affiliation: [author.affiliation, author.country]
            .map((v) => v.trim())
            .filter(Boolean)
            .join(', '),
          orcid: author.orcid,
          corresponding: author.corresponding,
        })),
        manuscriptFile: draft.manuscriptFile?.file ?? null,
        figureFiles: draft.figureFiles.map((item) => item.file),
        supplementaryFiles: draft.supplementaryFiles.map((item) => item.file),
        coverLetter: draft.commentsForEditor,
        ethics: {
          conflictDetails: draft.conflictDetails,
          fundingStatement: draft.fundingStatement,
          dataAvailability: draft.dataAvailability,
          ethicsDetails: draft.ethicsDetails,
        },
      })

      toast.success(
        status === 'submitted'
          ? 'Manuscript submitted successfully.'
          : 'Draft saved successfully.',
      )
      window.setTimeout(() => {
        navigate(`/author/submissions/${manuscript.id}`, { replace: true })
      }, 700)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save manuscript.')
      setSaving(false)
    }
  }

  return (
    <div className="page-stack mx-auto max-w-3xl animate-rise">
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
          {step.id === 'start' ? (
            <JournalStep
              draft={draft}
              onChange={patchDraft}
              journals={journals}
              loading={journalsLoading}
            />
          ) : null}
          {step.id === 'metadata' ? (
            <DetailsStep draft={draft} onChange={patchDraft} />
          ) : null}
          {step.id === 'contributors' ? (
            <AuthorsStep draft={draft} onChange={patchDraft} />
          ) : null}
          {step.id === 'files' ? (
            <FilesStep draft={draft} onChange={patchDraft} />
          ) : null}
          {step.id === 'declarations' ? (
            <EthicsStep draft={draft} onChange={patchDraft} />
          ) : null}
          {step.id === 'review' ? (
            <ReviewStep draft={draft} journals={journals} />
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
  if (stepId === 'start') {
    if (!draft.journalId) return 'Please select a journal.'
    if (!draft.sectionId) return 'Please select a journal section.'
    if (!draft.articleType) return 'Please select an article type.'
  }

  if (stepId === 'metadata') {
    if (!draft.title.trim()) return 'Please enter a manuscript title.'
    if (draft.abstract.trim().length < 40) {
      return 'Please provide a short abstract (at least a few sentences).'
    }
    const keywordCount = draft.keywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean).length
    if (keywordCount < 3) return 'Please add at least three keywords.'
  }

  if (stepId === 'contributors') {
    if (draft.authors.some((author) => !author.name.trim() || !author.email.trim())) {
      return 'Each contributor needs a name and email.'
    }
    if (
      draft.authors.some(
        (author) => !author.affiliation.trim() || !author.country.trim(),
      )
    ) {
      return 'Each contributor needs an affiliation and country.'
    }
    if (!draft.authors.some((author) => author.corresponding)) {
      return 'Please mark one corresponding author.'
    }
  }

  if (stepId === 'files') {
    if (!draft.manuscriptFile) return 'Please upload the article text file.'
  }

  if (stepId === 'declarations') {
    if (!draft.conflictOfInterest) {
      return 'Please confirm the competing interests declaration.'
    }
    if (!draft.conflictDetails.trim()) {
      return 'Please enter competing interests details, or write “None”.'
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
    if (
      !draft.checklistOriginal ||
      !draft.checklistGuidelines ||
      !draft.checklistCopyright
    ) {
      return 'Please complete all items on the submission checklist.'
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
