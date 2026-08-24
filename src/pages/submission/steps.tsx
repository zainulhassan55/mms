import type { ReactNode } from 'react'
import type { SubmissionDraft } from './types'
import { wrapUploadedFile } from './types'
import { articleTypes, specialIssues } from '../../data/journals'

export type JournalOption = {
  id: string
  name: string
  issn?: string | null
  description?: string | null
}

export function JournalStep({
  draft,
  onChange,
  journals,
  loading = false,
}: {
  draft: SubmissionDraft
  onChange: (patch: Partial<SubmissionDraft>) => void
  journals: JournalOption[]
  loading?: boolean
}) {
  return (
    <div className="space-y-6">
      <StepIntro
        title="Choose journal and article type"
        description="Select where this manuscript should be considered. You can change this before final submit."
      />

      <div className="space-y-3">
        <p className="text-xs font-semibold tracking-wide text-ink-500 uppercase">
          Journal
        </p>
        {loading ? (
          <p className="text-sm text-ink-500">Loading journals…</p>
        ) : journals.length === 0 ? (
          <p className="text-sm text-rose-600">
            No journals available. Check that the API is running.
          </p>
        ) : (
          <div className="grid gap-3">
            {journals.map((journal) => {
              const selected = draft.journalId === journal.id
              return (
                <button
                  key={journal.id}
                  type="button"
                  onClick={() => onChange({ journalId: journal.id })}
                  className={`rounded-[var(--radius-lg)] border p-4 text-left transition ${
                    selected
                      ? 'border-signal-500 bg-signal-50 shadow-[var(--shadow-soft)]'
                      : 'border-line bg-paper-elevated hover:border-ink-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink-800">{journal.name}</p>
                      <p className="mt-1 text-sm text-ink-500">
                        {journal.description || 'No description'}
                      </p>
                      {journal.issn ? (
                        <p className="mt-2 text-xs font-medium text-ink-300">
                          ISSN {journal.issn}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={`mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${
                        selected
                          ? 'border-signal-600 bg-signal-600'
                          : 'border-ink-300 bg-white'
                      }`}
                    />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="field">
          <label htmlFor="articleType">Article type</label>
          <select
            id="articleType"
            value={draft.articleType}
            onChange={(e) => onChange({ articleType: e.target.value })}
          >
            {articleTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="specialIssue">Special issue</label>
          <select
            id="specialIssue"
            value={draft.specialIssueId}
            onChange={(e) => onChange({ specialIssueId: e.target.value })}
          >
            {specialIssues.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

export function DetailsStep({
  draft,
  onChange,
}: {
  draft: SubmissionDraft
  onChange: (patch: Partial<SubmissionDraft>) => void
}) {
  return (
    <div className="space-y-6">
      <StepIntro
        title="Manuscript details"
        description="Provide the core metadata reviewers and editors will see first."
      />

      <div className="field">
        <label htmlFor="title">Title</label>
        <input
          id="title"
          value={draft.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Enter the full manuscript title"
          required
        />
      </div>

      <div className="field">
        <label htmlFor="abstract">Abstract</label>
        <textarea
          id="abstract"
          rows={8}
          value={draft.abstract}
          onChange={(e) => onChange({ abstract: e.target.value })}
          placeholder="Summarize objectives, methods, and key findings"
          className="min-h-40 resize-y"
        />
        <p className="text-xs text-ink-300">{draft.abstract.trim().split(/\s+/).filter(Boolean).length} words</p>
      </div>

      <div className="field">
        <label htmlFor="keywords">Keywords</label>
        <input
          id="keywords"
          value={draft.keywords}
          onChange={(e) => onChange({ keywords: e.target.value })}
          placeholder="Comma-separated, e.g. flooding, mesh refinement, coastal modeling"
        />
      </div>
    </div>
  )
}

export function AuthorsStep({
  draft,
  onChange,
}: {
  draft: SubmissionDraft
  onChange: (patch: Partial<SubmissionDraft>) => void
}) {
  function updateAuthor(
    id: string,
    patch: Partial<SubmissionDraft['authors'][number]>,
  ) {
    onChange({
      authors: draft.authors.map((author) =>
        author.id === id ? { ...author, ...patch } : author,
      ),
    })
  }

  function setCorresponding(id: string) {
    onChange({
      authors: draft.authors.map((author) => ({
        ...author,
        corresponding: author.id === id,
      })),
    })
  }

  function addAuthor() {
    onChange({
      authors: [
        ...draft.authors,
        {
          id: `author-${Date.now()}`,
          name: '',
          email: '',
          affiliation: '',
          corresponding: false,
        },
      ],
    })
  }

  function removeAuthor(id: string) {
    if (draft.authors.length <= 1) return
    const next = draft.authors.filter((author) => author.id !== id)
    if (!next.some((author) => author.corresponding)) {
      next[0] = { ...next[0], corresponding: true }
    }
    onChange({ authors: next })
  }

  function moveAuthor(id: string, direction: -1 | 1) {
    const index = draft.authors.findIndex((author) => author.id === id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= draft.authors.length) return
    const next = [...draft.authors]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange({ authors: next })
  }

  return (
    <div className="space-y-6">
      <StepIntro
        title="Author list"
        description="Order authors as they should appear. Mark one corresponding author."
      />

      <div className="space-y-3">
        {draft.authors.map((author, index) => (
          <div key={author.id} className="surface p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-ink-800">
                Author {index + 1}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn btn-ghost min-h-9 px-2.5 text-xs"
                  onClick={() => moveAuthor(author.id, -1)}
                  disabled={index === 0}
                >
                  Up
                </button>
                <button
                  type="button"
                  className="btn btn-ghost min-h-9 px-2.5 text-xs"
                  onClick={() => moveAuthor(author.id, 1)}
                  disabled={index === draft.authors.length - 1}
                >
                  Down
                </button>
                <button
                  type="button"
                  className="btn btn-ghost min-h-9 px-2.5 text-xs text-rose-600"
                  onClick={() => removeAuthor(author.id)}
                  disabled={draft.authors.length <= 1}
                >
                  Remove
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="field">
                <label htmlFor={`${author.id}-name`}>Full name</label>
                <input
                  id={`${author.id}-name`}
                  value={author.name}
                  onChange={(e) => updateAuthor(author.id, { name: e.target.value })}
                  placeholder="Given name Family name"
                />
              </div>
              <div className="field">
                <label htmlFor={`${author.id}-email`}>Email</label>
                <input
                  id={`${author.id}-email`}
                  type="email"
                  value={author.email}
                  onChange={(e) => updateAuthor(author.id, { email: e.target.value })}
                  placeholder="name@institution.edu"
                />
              </div>
              <div className="field sm:col-span-2">
                <label htmlFor={`${author.id}-aff`}>Affiliation</label>
                <input
                  id={`${author.id}-aff`}
                  value={author.affiliation}
                  onChange={(e) =>
                    updateAuthor(author.id, { affiliation: e.target.value })
                  }
                  placeholder="Department, Institution, Country"
                />
              </div>
            </div>

            <label className="mt-3 flex items-center gap-2 text-sm font-medium text-ink-700">
              <input
                type="radio"
                name="corresponding"
                checked={author.corresponding}
                onChange={() => setCorresponding(author.id)}
                className="accent-[var(--color-signal-600)]"
              />
              Corresponding author
            </label>
          </div>
        ))}
      </div>

      <button type="button" className="btn btn-soft" onClick={addAuthor}>
        + Add co-author
      </button>
    </div>
  )
}

export function FilesStep({
  draft,
  onChange,
}: {
  draft: SubmissionDraft
  onChange: (patch: Partial<SubmissionDraft>) => void
}) {
  return (
    <div className="space-y-6">
      <StepIntro
        title="Cover letter and files"
        description="Upload the main manuscript and any supporting materials. Files stay private."
      />

      <div className="field">
        <label htmlFor="coverLetter">Cover letter</label>
        <textarea
          id="coverLetter"
          rows={6}
          value={draft.coverLetter}
          onChange={(e) => onChange({ coverLetter: e.target.value })}
          placeholder="Briefly explain the contribution and suitability for this journal"
          className="min-h-32 resize-y"
        />
      </div>

      <FilePicker
        label="Main manuscript"
        hint="PDF or Word — required"
        file={draft.manuscriptFile}
        onPick={(file) => onChange({ manuscriptFile: file })}
        onClear={() => onChange({ manuscriptFile: null })}
      />

      <MultiFilePicker
        label="Figures"
        hint="Optional — individual image files or a zip"
        files={draft.figureFiles}
        onAdd={(files) =>
          onChange({ figureFiles: [...draft.figureFiles, ...files] })
        }
        onRemove={(id) =>
          onChange({
            figureFiles: draft.figureFiles.filter((file) => file.id !== id),
          })
        }
      />

      <MultiFilePicker
        label="Supplementary materials"
        hint="Optional — data, appendices, source zip"
        files={draft.supplementaryFiles}
        onAdd={(files) =>
          onChange({
            supplementaryFiles: [...draft.supplementaryFiles, ...files],
          })
        }
        onRemove={(id) =>
          onChange({
            supplementaryFiles: draft.supplementaryFiles.filter(
              (file) => file.id !== id,
            ),
          })
        }
      />
    </div>
  )
}

export function EthicsStep({
  draft,
  onChange,
}: {
  draft: SubmissionDraft
  onChange: (patch: Partial<SubmissionDraft>) => void
}) {
  return (
    <div className="space-y-6">
      <StepIntro
        title="Ethics declarations"
        description="These statements are required before editorial screening."
      />

      <label className="surface flex items-start gap-3 p-4">
        <input
          type="checkbox"
          checked={draft.conflictOfInterest}
          onChange={(e) => onChange({ conflictOfInterest: e.target.checked })}
          className="mt-1 accent-[var(--color-signal-600)]"
        />
        <span>
          <span className="block text-sm font-semibold text-ink-800">
            I declare any conflicts of interest
          </span>
          <span className="mt-1 block text-sm text-ink-500">
            Check this box after reviewing COI guidance for all authors.
          </span>
        </span>
      </label>

      <div className="field">
        <label htmlFor="conflictDetails">Conflict of interest details</label>
        <textarea
          id="conflictDetails"
          rows={3}
          value={draft.conflictDetails}
          onChange={(e) => onChange({ conflictDetails: e.target.value })}
          placeholder="Enter “None” if there are no conflicts"
          className="resize-y"
        />
      </div>

      <div className="field">
        <label htmlFor="funding">Funding statement</label>
        <textarea
          id="funding"
          rows={3}
          value={draft.fundingStatement}
          onChange={(e) => onChange({ fundingStatement: e.target.value })}
          placeholder="List funding sources or write “No funding was received”"
          className="resize-y"
        />
      </div>

      <div className="field">
        <label htmlFor="dataAvailability">Data availability</label>
        <textarea
          id="dataAvailability"
          rows={3}
          value={draft.dataAvailability}
          onChange={(e) => onChange({ dataAvailability: e.target.value })}
          placeholder="Where data and code will be available, or why not"
          className="resize-y"
        />
      </div>

      <label className="surface flex items-start gap-3 p-4">
        <input
          type="checkbox"
          checked={draft.ethicsApproval}
          onChange={(e) => onChange({ ethicsApproval: e.target.checked })}
          className="mt-1 accent-[var(--color-signal-600)]"
        />
        <span>
          <span className="block text-sm font-semibold text-ink-800">
            Ethics approval confirmed (if applicable)
          </span>
          <span className="mt-1 block text-sm text-ink-500">
            Confirm institutional review where human/animal subjects are involved,
            or mark N/A in the notes below.
          </span>
        </span>
      </label>

      <div className="field">
        <label htmlFor="ethicsDetails">Ethics notes</label>
        <textarea
          id="ethicsDetails"
          rows={3}
          value={draft.ethicsDetails}
          onChange={(e) => onChange({ ethicsDetails: e.target.value })}
          placeholder="Approval ID / board name, or “Not applicable”"
          className="resize-y"
        />
      </div>
    </div>
  )
}

export function ReviewStep({
  draft,
  journals,
}: {
  draft: SubmissionDraft
  journals: JournalOption[]
}) {
  const journal =
    journals.find((item) => item.id === draft.journalId)?.name ?? '—'
  const specialIssue =
    specialIssues.find((item) => item.id === draft.specialIssueId)?.label ?? '—'

  return (
    <div className="space-y-6">
      <StepIntro
        title="Review and submit"
        description="Confirm everything looks correct. You can go back to edit any step."
      />

      <div className="grid gap-3">
        <SummaryCard title="Journal">
          <p>{journal}</p>
          <p className="mt-1 text-ink-500">{draft.articleType}</p>
          <p className="mt-1 text-ink-500">{specialIssue}</p>
        </SummaryCard>

        <SummaryCard title="Manuscript">
          <p className="font-semibold text-ink-800">
            {draft.title.trim() || 'Untitled manuscript'}
          </p>
          <p className="mt-2 line-clamp-4 text-ink-500">
            {draft.abstract.trim() || 'No abstract provided yet.'}
          </p>
          <p className="mt-2 text-ink-500">
            Keywords: {draft.keywords.trim() || '—'}
          </p>
        </SummaryCard>

        <SummaryCard title="Authors">
          <ol className="space-y-2">
            {draft.authors.map((author, index) => (
              <li key={author.id}>
                {index + 1}. {author.name || 'Unnamed author'}
                {author.corresponding ? ' (corresponding)' : ''}
                <span className="block text-ink-500">{author.affiliation || '—'}</span>
              </li>
            ))}
          </ol>
        </SummaryCard>

        <SummaryCard title="Files">
          <p>
            Manuscript:{' '}
            {draft.manuscriptFile?.name ?? 'Missing — required before submit'}
          </p>
          <p className="mt-1">
            Figures: {draft.figureFiles.length || 'None'}
          </p>
          <p className="mt-1">
            Supplementary: {draft.supplementaryFiles.length || 'None'}
          </p>
        </SummaryCard>

        <SummaryCard title="Ethics">
          <p>COI declared: {draft.conflictOfInterest ? 'Yes' : 'No'}</p>
          <p className="mt-1">
            Funding: {draft.fundingStatement.trim() || '—'}
          </p>
          <p className="mt-1">
            Data: {draft.dataAvailability.trim() || '—'}
          </p>
          <p className="mt-1">
            Ethics: {draft.ethicsDetails.trim() || '—'}
          </p>
        </SummaryCard>
      </div>
    </div>
  )
}

function StepIntro({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div>
      <h2 className="font-display text-2xl font-semibold tracking-tight text-ink-800">
        {title}
      </h2>
      <p className="mt-2 text-sm text-ink-500">{description}</p>
    </div>
  )
}

function SummaryCard({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="surface-quiet p-4 text-sm text-ink-700">
      <p className="text-xs font-semibold tracking-wide text-ink-300 uppercase">
        {title}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  )
}

function FilePicker({
  label,
  hint,
  file,
  onPick,
  onClear,
}: {
  label: string
  hint: string
  file: SubmissionDraft['manuscriptFile']
  onPick: (file: NonNullable<SubmissionDraft['manuscriptFile']>) => void
  onClear: () => void
}) {
  return (
    <div className="surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-ink-800">{label}</p>
          <p className="mt-1 text-sm text-ink-500">{hint}</p>
          {file ? (
            <p className="mt-2 text-sm font-medium text-signal-700">
              {file.name} · {file.sizeLabel}
            </p>
          ) : (
            <p className="mt-2 text-sm text-ink-300">No file selected</p>
          )}
        </div>
        <div className="flex gap-2">
          <label className="btn btn-ghost cursor-pointer">
            Choose file
            <input
              type="file"
              className="sr-only"
              accept=".pdf,.doc,.docx,.zip"
              onChange={(e) => {
                const selected = e.target.files?.[0]
                if (!selected) return
                onPick(wrapUploadedFile(selected))
                e.target.value = ''
              }}
            />
          </label>
          {file ? (
            <button type="button" className="btn btn-ghost" onClick={onClear}>
              Remove
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function MultiFilePicker({
  label,
  hint,
  files,
  onAdd,
  onRemove,
}: {
  label: string
  hint: string
  files: SubmissionDraft['figureFiles']
  onAdd: (files: SubmissionDraft['figureFiles']) => void
  onRemove: (id: string) => void
}) {
  return (
    <div className="surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink-800">{label}</p>
          <p className="mt-1 text-sm text-ink-500">{hint}</p>
          {files.length ? (
            <ul className="mt-3 space-y-2">
              {files.map((file) => (
                <li
                  key={file.id}
                  className="flex items-center justify-between gap-3 rounded-md bg-paper px-3 py-2 text-sm"
                >
                  <span className="truncate font-medium text-ink-700">
                    {file.name} · {file.sizeLabel}
                  </span>
                  <button
                    type="button"
                    className="shrink-0 font-semibold text-rose-600"
                    onClick={() => onRemove(file.id)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-ink-300">No files selected</p>
          )}
        </div>
        <label className="btn btn-ghost cursor-pointer shrink-0">
          Add files
          <input
            type="file"
            multiple
            className="sr-only"
            onChange={(e) => {
              const selected = Array.from(e.target.files ?? [])
              if (!selected.length) return
              onAdd(selected.map(wrapUploadedFile))
              e.target.value = ''
            }}
          />
        </label>
      </div>
    </div>
  )
}
