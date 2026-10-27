type JournalCoverProps = {
  code: string
  name: string
  coverImageUrl?: string | null
  className?: string
}

/**
 * Catalog cover: crisp SVG/CSS scholarly thumbnail (OJS-style).
 * Prefer vector covers; fall back to a generated layout so text never crops.
 */
export function JournalCover({
  code,
  name,
  coverImageUrl,
  className = '',
}: JournalCoverProps) {
  const src = resolveCoverSrc(code, coverImageUrl)
  const useImage = Boolean(src?.endsWith('.svg') || src?.endsWith('.png'))

  return (
    <div
      className={`relative aspect-[3/4] w-[4.5rem] shrink-0 overflow-hidden rounded-[2px] bg-[#12171c] shadow-[0_1px_3px_rgba(15,23,42,0.2)] ring-1 ring-black/15 sm:w-[5.5rem] ${className}`}
    >
      {useImage && src ? (
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
            const fallback = e.currentTarget.nextElementSibling
            if (fallback instanceof HTMLElement) fallback.hidden = false
          }}
        />
      ) : null}
      <div
        hidden={useImage}
        className="absolute inset-0 flex flex-col bg-gradient-to-b from-[#1a242c] to-[#0c1216] px-[12%] py-[10%] text-white"
      >
        <span className="block h-[2px] w-full shrink-0 bg-[#2f9d86]" />
        <div className="flex flex-1 flex-col items-center justify-center gap-1 text-center">
          <span className="font-display text-[1.05rem] leading-none font-semibold tracking-[0.12em] sm:text-[1.2rem]">
            {code.toUpperCase()}
          </span>
          <span className="mt-1 line-clamp-4 text-[0.48rem] leading-[1.25] text-white/85 sm:text-[0.52rem]">
            {shortTitle(name)}
          </span>
        </div>
        <span className="text-center text-[0.38rem] tracking-[0.08em] text-white/45 uppercase">
          Open access
        </span>
      </div>
    </div>
  )
}

function shortTitle(name: string) {
  return name.replace(/\s*\([^)]*\)\s*$/, '').trim()
}

function resolveCoverSrc(code: string, coverImageUrl?: string | null) {
  const base = import.meta.env.BASE_URL
  if (coverImageUrl?.startsWith('http')) return coverImageUrl
  if (coverImageUrl?.startsWith('/')) {
    return `${base}${coverImageUrl.replace(/^\//, '')}`
  }
  return `${base}covers/${code.toLowerCase()}.svg`
}
