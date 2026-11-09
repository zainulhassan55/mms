import { Navigate } from 'react-router-dom'

/**
 * Public journal microsites are closed on the platform.
 * Visitors only see how many journals are running (/journals).
 * Authors enter via /submit/:code.
 */
export function PublicJournalPage() {
  return <Navigate to="/journals" replace />
}

export function PublicArticlePage() {
  return <Navigate to="/journals" replace />
}
