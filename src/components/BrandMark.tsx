import { Link } from 'react-router-dom'

type BrandMarkProps = {
  variant?: 'light' | 'dark'
  size?: 'sm' | 'md' | 'lg'
  showWordmark?: boolean
  /** Where the logo/title navigates. Default: public journals home. */
  to?: string
  link?: boolean
}

const sizeMap = {
  sm: { mark: 'h-8 w-8 text-sm', word: 'text-lg' },
  md: { mark: 'h-10 w-10 text-base', word: 'text-xl' },
  lg: { mark: 'h-12 w-12 text-lg', word: 'text-2xl' },
}

export function BrandMark({
  variant = 'dark',
  size = 'md',
  showWordmark = true,
  to = '/',
  link = true,
}: BrandMarkProps) {
  const isLight = variant === 'light'
  const sizes = sizeMap[size]

  const mark = (
    <div className="inline-flex shrink-0 items-center gap-3">
      <span
        className={`relative grid ${sizes.mark} shrink-0 place-items-center overflow-hidden rounded-[0.85rem] font-semibold tracking-tight ${
          isLight
            ? 'bg-white/15 ring-1 ring-white/25'
            : 'bg-signal-600 shadow-[0_8px_20px_rgba(14,116,105,0.22)]'
        }`}
        style={{ color: '#ffffff', minHeight: '2rem', minWidth: '2rem' }}
        aria-hidden
      >
        <span className="absolute inset-x-0 bottom-0 h-1/2 bg-signal-500/35" />
        <span className="relative z-[1] font-display italic leading-none">M</span>
      </span>
      {showWordmark ? (
        <div className="leading-tight">
          <p
            className={`font-display font-semibold tracking-tight ${sizes.word}`}
            style={{ color: isLight ? '#ffffff' : '#14323c' }}
          >
            MMS
          </p>
          <p
            className={`text-[0.7rem] font-medium tracking-[0.08em] uppercase`}
            style={{ color: isLight ? 'rgba(255,255,255,0.7)' : '#3d6673' }}
          >
            Manuscript Systems
          </p>
        </div>
      ) : null}
    </div>
  )

  if (!link) return mark

  return (
    <Link
      to={to}
      className="inline-flex rounded-[0.85rem] outline-offset-4 transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal-400"
      aria-label="MMS home — view journals"
    >
      {mark}
    </Link>
  )
}
