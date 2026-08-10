type BrandMarkProps = {
  variant?: 'light' | 'dark'
  size?: 'sm' | 'md' | 'lg'
  showWordmark?: boolean
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
}: BrandMarkProps) {
  const isLight = variant === 'light'
  const sizes = sizeMap[size]

  return (
    <div className="inline-flex items-center gap-3">
      <span
        className={`relative grid ${sizes.mark} place-items-center overflow-hidden rounded-[0.85rem] font-semibold tracking-tight ${
          isLight
            ? 'bg-white/15 ring-1 ring-white/25'
            : 'bg-signal-600 shadow-[0_8px_20px_rgba(14,116,105,0.22)]'
        }`}
        style={{ color: '#ffffff' }}
        aria-hidden
      >
        <span className="absolute inset-x-0 bottom-0 h-1/2 bg-signal-500/35" />
        <span className="relative font-display italic leading-none">M</span>
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
            Manuscript System
          </p>
        </div>
      ) : null}
    </div>
  )
}
