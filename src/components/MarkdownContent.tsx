import type { ReactNode } from 'react'

/** Lightweight markdown renderer for journal policy pages (headings, lists, bold, paragraphs). */
export function MarkdownContent({
  source,
  compact = false,
}: {
  source: string
  compact?: boolean
}) {
  const blocks = splitBlocks(source.trim())
  return (
    <div
      className={`prose-journal text-ink-700 ${
        compact
          ? 'space-y-3 text-[0.95rem] leading-[1.7]'
          : 'space-y-4 text-[1rem] leading-[1.75]'
      }`}
    >
      {blocks.map((block, index) => (
        <Block key={`${block.type}-${index}`} block={block} compact={compact} />
      ))}
    </div>
  )
}

type Block =
  | { type: 'h1' | 'h2' | 'h3'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'p'; text: string }
  | { type: 'hr' }

function splitBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let paragraph: string[] = []
  let list: string[] = []

  function flushParagraph() {
    if (!paragraph.length) return
    blocks.push({ type: 'p', text: paragraph.join(' ').trim() })
    paragraph = []
  }

  function flushList() {
    if (!list.length) return
    blocks.push({ type: 'ul', items: [...list] })
    list = []
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    const trimmed = line.trim()
    if (!trimmed) {
      flushList()
      flushParagraph()
      continue
    }
    if (/^---+$/.test(trimmed)) {
      flushList()
      flushParagraph()
      blocks.push({ type: 'hr' })
      continue
    }
    if (trimmed.startsWith('### ')) {
      flushList()
      flushParagraph()
      blocks.push({ type: 'h3', text: trimmed.slice(4) })
      continue
    }
    if (trimmed.startsWith('## ')) {
      flushList()
      flushParagraph()
      blocks.push({ type: 'h2', text: trimmed.slice(3) })
      continue
    }
    if (trimmed.startsWith('# ')) {
      flushList()
      flushParagraph()
      blocks.push({ type: 'h1', text: trimmed.slice(2) })
      continue
    }
    if (/^[-*]\s+/.test(trimmed)) {
      flushParagraph()
      list.push(trimmed.replace(/^[-*]\s+/, ''))
      continue
    }
    flushList()
    paragraph.push(trimmed)
  }
  flushList()
  flushParagraph()
  return blocks
}

function Block({ block, compact }: { block: Block; compact?: boolean }) {
  if (block.type === 'hr') {
    return <hr className="my-2 border-line" />
  }
  if (block.type === 'h1') {
    if (compact) return null
    return (
      <h2 className="font-display text-2xl font-semibold tracking-tight text-ink-800">
        {formatInline(block.text)}
      </h2>
    )
  }
  if (block.type === 'h2') {
    if (compact) return null
    return (
      <h3 className="mt-2 font-display text-xl font-semibold tracking-tight text-ink-800">
        {formatInline(block.text)}
      </h3>
    )
  }
  if (block.type === 'h3') {
    return (
      <h4 className="font-semibold tracking-tight text-ink-800">
        {formatInline(block.text)}
      </h4>
    )
  }
  if (block.type === 'ul') {
    return (
      <ul className="list-disc space-y-1.5 pl-5 text-justify marker:text-signal-600">
        {block.items.map((item) => (
          <li key={item} className="pl-1">
            {formatInline(item)}
          </li>
        ))}
      </ul>
    )
  }
  return (
    <p className="text-justify hyphens-auto [text-wrap:pretty]">
      {formatInline(block.text)}
    </p>
  )
}

function formatInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-ink-800">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return <span key={index}>{part}</span>
  })
}
