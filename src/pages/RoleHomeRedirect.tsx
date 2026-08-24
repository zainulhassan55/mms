import { Navigate } from 'react-router-dom'
import { homePathForRole, useAuth } from '../auth/AuthContext'

export function RoleHomeRedirect() {
  const { user } = useAuth()
  return <Navigate to={homePathForRole(user?.role ?? 'author')} replace />
}
