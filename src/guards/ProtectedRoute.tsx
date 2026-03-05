import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
}

/**
 * Redirects unauthenticated users to /auth.
 * Wrap any route/layout that requires a logged-in user.
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation()

  const raw = localStorage.getItem('user')
  if (!raw) {
    // Save where the user was trying to go so we can redirect back after login
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />
  }

  try {
    const user = JSON.parse(raw)
    if (!user?.id || !user?.role) {
      localStorage.removeItem('user')
      return <Navigate to="/auth" replace />
    }
  } catch {
    localStorage.removeItem('user')
    return <Navigate to="/auth" replace />
  }

  return <>{children}</>
}
