type PublicPageHeaderProps = {
  title: string
  description: string
}

export function PublicPageHeader({ title, description }: PublicPageHeaderProps) {
  return (
    <div className="border-b border-[var(--pub-line)] bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
        <div className="h-1 w-12 rounded-full bg-[var(--pub-accent)]" aria-hidden />
        <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight text-[var(--pub-ink)] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--pub-muted)] sm:text-base">
          {description}
        </p>
      </div>
    </div>
  )
}
