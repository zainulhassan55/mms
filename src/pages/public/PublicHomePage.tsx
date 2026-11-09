import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { PublicSiteChrome } from '../../components/public/PublicSiteChrome'

export function PublicHomePage() {
  const { isAuthenticated } = useAuth()

  return (
    <PublicSiteChrome>
      <section className="relative isolate min-h-[calc(100vh-4.25rem)] overflow-hidden">
        <img
          src="/hero-mms.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[center_35%]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(8,14,22,0.88)_0%,rgba(8,14,22,0.72)_38%,rgba(8,14,22,0.35)_72%,rgba(8,14,22,0.18)_100%)]" />

        <div className="relative mx-auto flex min-h-[calc(100vh-4.25rem)] max-w-6xl items-center px-4 py-20 sm:px-6 lg:py-24">
          <div className="public-hero-fade w-full max-w-3xl text-white">
            <p className="text-sm font-semibold tracking-[0.22em] text-white/75 uppercase sm:text-base">
              CCRI Research
            </p>
            <h1 className="mt-5 font-display text-6xl font-semibold tracking-tight sm:text-7xl lg:text-[6.25rem] lg:leading-[0.95]">
              MMS
            </h1>
            <p className="mt-7 max-w-2xl text-xl leading-relaxed text-white/90 sm:text-2xl sm:leading-snug">
              Host journals and manage manuscripts from submission to
              publication.
            </p>
            <div className="mt-11 flex flex-wrap gap-4">
              <Link
                to="/journals"
                className="inline-flex min-h-12 items-center rounded-md bg-white px-7 py-3 text-base font-semibold text-[var(--pub-ink)] transition hover:bg-white/95"
              >
                View journals
              </Link>
              <Link
                to={isAuthenticated ? '/dashboard' : '/login'}
                className="inline-flex min-h-12 items-center rounded-md border border-white/45 bg-white/12 px-7 py-3 text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                {isAuthenticated ? 'Go to dashboard' : 'Log in'}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicSiteChrome>
  )
}
