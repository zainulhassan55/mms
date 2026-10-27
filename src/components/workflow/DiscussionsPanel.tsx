import { useEffect, useState } from 'react'
import { useToast } from '../ToastProvider'
import {
  createDiscussion,
  fetchDiscussions,
  replyToDiscussion,
  type DiscussionThread,
} from '../../lib/workflow'

const audiences = [
  { value: 'editorial', label: 'Editorial' },
  { value: 'author', label: 'With author' },
  { value: 'reviewer', label: 'With reviewer' },
  { value: 'copyediting', label: 'Copyediting' },
  { value: 'production', label: 'Production' },
]

export function DiscussionsPanel({ manuscriptId }: { manuscriptId: string }) {
  const toast = useToast()
  const [threads, setThreads] = useState<DiscussionThread[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState('editorial')
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [openId, setOpenId] = useState<string | null>(null)

  async function reload() {
    const list = await fetchDiscussions(manuscriptId)
    setThreads(list)
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        await reload()
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'Failed to load discussions')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manuscriptId, toast])

  async function handleCreate() {
    if (!subject.trim() || !body.trim()) {
      toast.error('Subject and message are required.')
      return
    }
    setPending(true)
    try {
      const thread = await createDiscussion(manuscriptId, {
        subject: subject.trim(),
        body: body.trim(),
        audience,
      })
      setSubject('')
      setBody('')
      setOpenId(thread.id)
      toast.success('Discussion started.')
      await reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start discussion')
    } finally {
      setPending(false)
    }
  }

  async function handleReply(threadId: string) {
    const text = (replyDrafts[threadId] ?? '').trim()
    if (!text) return
    setPending(true)
    try {
      await replyToDiscussion(manuscriptId, threadId, text)
      setReplyDrafts((prev) => ({ ...prev, [threadId]: '' }))
      toast.success('Reply posted.')
      await reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not post reply')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="surface space-y-4 p-5 sm:p-6">
      <div>
        <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">
          Discussions
        </h2>
        <p className="mt-1 text-sm text-ink-500">
          Threaded messages between editorial staff, authors, and reviewers.
        </p>
      </div>

      <div className="space-y-3 rounded-[var(--radius-md)] border border-line bg-paper-soft p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
          New thread
        </p>
        <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
          <div className="field">
            <label htmlFor="disc-subject">Subject</label>
            <input
              id="disc-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Clarification on methods section"
            />
          </div>
          <div className="field">
            <label htmlFor="disc-audience">Audience</label>
            <select
              id="disc-audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
            >
              {audiences.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="disc-body">Message</label>
          <textarea
            id="disc-body"
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write the first message…"
            className="resize-y"
          />
        </div>
        <button
          type="button"
          className="btn btn-signal"
          disabled={pending}
          onClick={() => void handleCreate()}
        >
          {pending ? 'Posting…' : 'Start discussion'}
        </button>
      </div>


      {loading ? (
        <p className="text-sm text-ink-400">Loading discussions…</p>
      ) : threads.length === 0 ? (
        <p className="text-sm text-ink-400">No discussions yet.</p>
      ) : (
        <ul className="space-y-3">
          {threads.map((thread) => {
            const open = openId === thread.id
            return (
              <li key={thread.id} className="rounded-[var(--radius-md)] border border-line">
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
                  onClick={() => setOpenId(open ? null : thread.id)}
                >
                  <span>
                    <span className="block font-semibold text-ink-800">
                      {thread.subject}
                    </span>
                    <span className="mt-1 block text-xs text-ink-400">
                      {thread.audience} · {thread.posts.length} post
                      {thread.posts.length === 1 ? '' : 's'}
                    </span>
                  </span>
                  <span className="text-xs font-medium text-signal-700">
                    {open ? 'Hide' : 'Open'}
                  </span>
                </button>
                {open ? (
                  <div className="space-y-3 border-t border-line px-4 py-3">
                    {thread.posts.map((post) => (
                      <div key={post.id} className="rounded-md bg-paper-soft px-3 py-2">
                        <p className="text-xs font-semibold text-ink-500">
                          {post.author.name}
                          <span className="font-normal text-ink-300">
                            {' '}
                            · {String(post.createdAt).slice(0, 16).replace('T', ' ')}
                          </span>
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-ink-700">
                          {post.body}
                        </p>
                      </div>
                    ))}
                    <div className="field">
                      <label htmlFor={`reply-${thread.id}`}>Reply</label>
                      <textarea
                        id={`reply-${thread.id}`}
                        rows={2}
                        value={replyDrafts[thread.id] ?? ''}
                        onChange={(e) =>
                          setReplyDrafts((prev) => ({
                            ...prev,
                            [thread.id]: e.target.value,
                          }))
                        }
                        className="resize-y"
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={pending}
                      onClick={() => void handleReply(thread.id)}
                    >
                      Post reply
                    </button>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
