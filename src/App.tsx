import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { GuestRoute, ProtectedRoute } from './auth/RouteGuards'
import { AppShell } from './components/AppShell'
import { AuthorDashboard } from './pages/AuthorDashboard'
import { LoginPage } from './pages/LoginPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { ProfilePage } from './pages/ProfilePage'
import { SettingsPage } from './pages/SettingsPage'
import { SubmissionDetailPage } from './pages/SubmissionDetailPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
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
                <PlaceholderPage
                  standalone
                  title="Create your author account"
                  description="Registration flow comes next — email verification, profile, then your first submission."
                />
              </GuestRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <GuestRoute>
                <PlaceholderPage
                  standalone
                  title="Reset your password"
                  description="Password reset screens will follow once authentication is wired up."
                />
              </GuestRoute>
            }
          />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<AuthorDashboard />} />
              <Route path="/author/submissions" element={<AuthorDashboard />} />
              <Route
                path="/author/submissions/new"
                element={
                  <PlaceholderPage
                    title="New submission wizard"
                    description="Multi-step manuscript submission UI is the next build step after design sign-off."
                  />
                }
              />
              <Route
                path="/author/submissions/:id"
                element={<SubmissionDetailPage />}
              />
              <Route
                path="/author/submissions/:id/revise"
                element={
                  <PlaceholderPage
                    title="Revision upload"
                    description="Authors will upload revised files and a response letter here."
                  />
                }
              />
              <Route
                path="/author/submissions/:id/proof"
                element={
                  <PlaceholderPage
                    title="Proof approval"
                    description="Authors will review the production PDF and approve or request corrections."
                  />
                }
              />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
