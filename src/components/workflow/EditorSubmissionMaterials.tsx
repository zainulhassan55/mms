import { useState } from 'react'
import { useToast } from '../ToastProvider'
import {
  downloadManuscriptFile,
  updateFileVisibility,
  type ApiManuscript,
} from '../../lib/manuscripts'

const kindLabel: Record<string, string> = {
  manuscript: 'Article text',
  figure: 'Figure',
  figures: 'Figure',
  supplementary: 'Supplementary',
  revision: 'Revision',
  formatting_revision: 'Formatting revision',
  review_copy: 'Review copy',
  copyedit: 'Copyedit',
  other: 'Other',
}

/**
 * OJS-style submission package for editors: metadata + downloadable files.
 */
export function EditorSubmissionMaterials({
  manuscript,
  onChanged,
}: {
  manuscript: ApiManuscript
  onChanged?: () => void
}) {
  const toast = useToast()
  const [pending, setPending] = useState(false)
  const files = manuscript.files ?? []

  async function handleDownload(fileId: string, fileName: string) {
    setPending(true)
    try {
      await downloadManuscriptFile(manuscript.id, fileId, fileName)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="rounded-[var(--radius-lg)] border border-line bg-paper p-5 sm:p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h2 className="font-display text-xl font-semibold text-ink-800">
          Submission package
        </h2>
        <p className="text-sm text-ink-500">
          Review the author’s materials before screening or inviting reviewers
        </p>
      </div>

      <div className="mt-5 space-y-5">
        <div className="rounded-[var(--radius-md)] border border-line bg-paper-soft/60 p-4">
          <p className="text-xs font-semibold tracking-wide text-ink-400 uppercase">
            Metadata
          </p>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <Meta label="Article type" value={manuscript.articleType} />
            {manuscript.section ? (
              <Meta label="Section" value={manuscript.section.title} />
            ) : null}
            <Meta label="Authors" value={manuscript.authors} />
            <Meta
              label="Submitted"
              value={manuscript.submittedAt ?? manuscript.updatedAt}
            />
          </dl>
          {manuscript.keywords ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {manuscript.keywords.split(',').map((kw) => {
                const label = kw.trim()
                if (!label) return null
                return (
                  <span
                    key={label}
                    className="rounded-md bg-paper px-2.5 py-1 text-xs font-medium text-ink-600 ring-1 ring-line"
                  >
                    {label}
                  </span>
                )
              })}
            </div>
          ) : null}
        </div>

        {manuscript.abstract ? (
          <div>
            <h3 className="text-xs font-semibold tracking-wide text-ink-400 uppercase">
              Abstract
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-700 text-justify hyphens-auto">
              {manuscript.abstract}
            </p>
          </div>
        ) : null}

        {manuscript.commentsForEditor ? (
          <div className="rounded-[var(--radius-md)] border border-amber-100 bg-amber-50/70 px-4 py-3">
            <h3 className="text-xs font-semibold tracking-wide text-amber-800 uppercase">
              Comments for the editor
            </h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-700 text-justify">
              {manuscript.commentsForEditor}
            </p>
          </div>
        ) : null}

        {(manuscript.competingInterests ||
          manuscript.fundingStatement ||
          manuscript.dataAvailability ||
          manuscript.ethicsNotes) && (
          <div className="rounded-[var(--radius-md)] border border-line p-4">
            <h3 className="text-xs font-semibold tracking-wide text-ink-400 uppercase">
              Declarations
            </h3>
            <dl className="mt-3 space-y-3 text-sm">
              {manuscript.competingInterests ? (
                <Meta
                  label="Competing interests"
                  value={manuscript.competingInterests}
                />
              ) : null}
              {manuscript.fundingStatement ? (
                <Meta label="Funding" value={manuscript.fundingStatement} />
              ) : null}
              {manuscript.dataAvailability ? (
                <Meta
                  label="Data availability"
                  value={manuscript.dataAvailability}
                />
              ) : null}
              {manuscript.ethicsNotes ? (
                <Meta label="Ethics" value={manuscript.ethicsNotes} />
              ) : null}
            </dl>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold tracking-wide text-ink-400 uppercase">
              Submission files
            </h3>
            <span className="text-xs font-medium text-ink-400">
              {files.length} file{files.length === 1 ? '' : 's'}
            </span>
          </div>
          <p className="mt-1 text-sm text-ink-500">
            Download the article text and figures to screen the submission.
            Set visibility to <em>review</em> before sending to reviewers if
            you use anonymized copies.
          </p>

          {files.length === 0 ? (
            <p className="mt-3 rounded-[var(--radius-md)] bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
              No files were stored with this submission. Ask the author to
              re-upload.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line rounded-[var(--radius-md)] border border-line">
              {files.map((file) => (
                <li
                  key={file.id}
                  className="grid grid-cols-1 gap-3 px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <p
                      className="break-all font-semibold text-ink-800 sm:truncate sm:break-normal"
                      title={file.fileName}
                    >
                      {file.fileName}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-400">
                      {kindLabel[file.kind] ?? file.kind}
                      {file.sizeBytes
                        ? ` · ${formatBytes(file.sizeBytes)}`
                        : ''}
                      {' · '}
                      visibility: {file.visibility ?? 'author'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center justify-end gap-2">
                    <select
                      className="h-9 w-[6.75rem] shrink-0 rounded border border-line bg-paper px-2 text-xs text-ink-700"
                      value={file.visibility ?? 'author'}
                      disabled={pending}
                      aria-label={`Visibility for ${file.fileName}`}
                      onChange={(e) => {
                        const visibility = e.target.value as
                          | 'author'
                          | 'staff'
                          | 'review'
                        void (async () => {
                          setPending(true)
                          try {
                            await updateFileVisibility(
                              manuscript.id,
                              file.id,
                              visibility,
                            )
                            onChanged?.()
                          } catch (err) {
                            toast.error(
                              err instanceof Error
                                ? err.message
                                : 'Could not update visibility',
                            )
                          } finally {
                            setPending(false)
                          }
                        })()
                      }}
                    >
                      <option value="author">Author</option>
                      <option value="staff">Staff</option>
                      <option value="review">Review</option>
                    </select>
                    <button
                      type="button"
                      className="btn btn-signal h-9 shrink-0 whitespace-nowrap px-3 text-xs"
                      disabled={pending}
                      onClick={() =>
                        void handleDownload(file.id, file.fileName)
                      }
                    >
                      Download
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </section>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.65rem] font-semibold tracking-wide text-ink-300 uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-ink-800">{value}</dd>
    </div>
  )
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}
