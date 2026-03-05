import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'

interface AdminGuardProps {
  children: ReactNode
}

/**
 * Shorthand guard that only allows users with role === 'admin'.
 * Unauthenticated users go to /auth; non-admin users go to /home.
 */
export default function AdminGuard({ children }: AdminGuardProps) {
  const raw = localStorage.getItem('user')

  if (!raw) {
    return <Navigate to="/auth" replace />
  }

  try {
    const user = JSON.parse(raw)

    if (user?.role !== 'admin') {
      return <Navigate to="/home" replace />
    }
  } catch {
    localStorage.removeItem('user')
    return <Navigate to="/auth" replace />
  }

  return <>{children}</>
}
