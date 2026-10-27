import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { GuestRoute, ProtectedRoute } from './auth/RouteGuards'
import { RoleRoute } from './auth/RoleRoute'
import { AppShell } from './components/AppShell'
import { ToastProvider } from './components/ToastProvider'
import { AdminAnalyticsPage } from './pages/admin/AdminAnalyticsPage'
import { AdminJournalsPage } from './pages/admin/AdminJournalsPage'
import { PortalSyncPage } from './pages/admin/PortalSyncPage'
import { AuthorDashboard } from './pages/AuthorDashboard'
import { EditorManuscriptPage } from './pages/editor/EditorManuscriptPage'
import { EditorQueuePage } from './pages/editor/EditorQueuePage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { LoginPage } from './pages/LoginPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { ProofApprovalPage } from './pages/ProofApprovalPage'
import { ProductionManuscriptPage } from './pages/production/ProductionManuscriptPage'
import { ProductionQueuePage } from './pages/production/ProductionQueuePage'
import { ProfilePage } from './pages/ProfilePage'
import {
  ReviewerActivePage,
  ReviewerHistoryPage,
} from './pages/reviewer/ReviewerActivePage'
import { ReviewFormPage } from './pages/reviewer/ReviewFormPage'
import { ReviewerInvitationsPage } from './pages/reviewer/ReviewerInvitationsPage'
import { RegisterPage } from './pages/RegisterPage'
import { RevisionPage } from './pages/RevisionPage'
import { RoleHomeRedirect } from './pages/RoleHomeRedirect'
import { SettingsPage } from './pages/SettingsPage'
import { NewSubmissionPage } from './pages/submission/NewSubmissionPage'
import { SubmissionDetailPage } from './pages/SubmissionDetailPage'
import { JournalManagerPage } from './pages/manager/JournalManagerPage'
import { CopyeditQueuePage } from './pages/copyedit/CopyeditQueuePage'
import { AdminUsersPage } from './pages/admin/AdminUsersPage'
import { PublicHomePage } from './pages/public/PublicHomePage'
import {
  PublicArticlePage,
  PublicJournalPage,
} from './pages/public/PublicJournalPage'

function OfficeManuscriptRedirect() {
  const { id } = useParams()
  return <Navigate to={`/editor/manuscript/${id ?? ''}`} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
      <BrowserRouter>
        <Routes>
            <Route path="/" element={<PublicHomePage />} />
            <Route
              path="/login"
              element={
                <GuestRoute>
                  <LoginPage />
                </GuestRoute>
              }
            />
            <Route
              path="/register"
              element={
                <GuestRoute>
                  <RegisterPage />
                </GuestRoute>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <GuestRoute>
                  <ForgotPasswordPage />
                </GuestRoute>
              }
            />

            <Route path="/j/:code" element={<PublicJournalPage />} />
            <Route path="/j/:code/article/:number" element={<PublicArticlePage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route path="/dashboard" element={<RoleHomeRedirect />} />

                <Route element={<RoleRoute allow={['author']} />}>
                  <Route path="/author/dashboard" element={<AuthorDashboard />} />
                  <Route path="/author/submissions" element={<AuthorDashboard />} />
                  <Route
                    path="/author/submissions/new"
                    element={<NewSubmissionPage />}
                  />
                  <Route
                    path="/author/submissions/:id"
                    element={<SubmissionDetailPage />}
                  />
                  <Route
                    path="/author/submissions/:id/revise"
                    element={<RevisionPage />}
                  />
                  <Route
                    path="/author/submissions/:id/proof"
                    element={<ProofApprovalPage />}
                  />
                </Route>

                <Route
                  element={
                    <RoleRoute
                      allow={['editor', 'office', 'journal_manager', 'admin']}
                    />
                  }
                >
                  <Route path="/editor/queue" element={<EditorQueuePage />} />
                  <Route
                    path="/editor/manuscript/:id"
                    element={<EditorManuscriptPage />}
                  />
                  <Route
                    path="/office/screening"
                    element={<Navigate to="/editor/queue" replace />}
                  />
                  <Route
                    path="/office/manuscript/:id"
                    element={<OfficeManuscriptRedirect />}
                  />
                </Route>

                <Route
                  element={
                    <RoleRoute allow={['journal_manager', 'admin', 'editor']} />
                  }
                >
                  <Route path="/manager/journals" element={<JournalManagerPage />} />
                </Route>

                <Route
                  element={
                    <RoleRoute
                      allow={['copyeditor', 'editor', 'journal_manager', 'admin']}
                    />
                  }
                >
                  <Route path="/copyedit/queue" element={<CopyeditQueuePage />} />
                </Route>

                <Route
                  element={
                    <RoleRoute
                      allow={[
                        'production',
                        'editor',
                        'admin',
                        'journal_manager',
                      ]}
                    />
                  }
                >
                  <Route path="/production/queue" element={<ProductionQueuePage />} />
                  <Route
                    path="/production/manuscript/:id"
                    element={<ProductionManuscriptPage />}
                  />
                </Route>

                <Route element={<RoleRoute allow={['admin']} />}>
                  <Route path="/admin/journals" element={<AdminJournalsPage />} />
                  <Route path="/admin/users" element={<AdminUsersPage />} />
                  <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
                  <Route path="/admin/portal-sync" element={<PortalSyncPage />} />
                </Route>

                <Route element={<RoleRoute allow={['reviewer']} />}>
                  <Route
                    path="/reviewer/invitations"
                    element={<ReviewerInvitationsPage />}
                  />
                  <Route path="/reviewer/active" element={<ReviewerActivePage />} />
                  <Route
                    path="/reviewer/history"
                    element={<ReviewerHistoryPage />}
                  />
                  <Route path="/reviewer/review/:id" element={<ReviewFormPage />} />
                </Route>

                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
