import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'

type UserRole = 'farmer' | 'customer' | 'ngo' | 'driver' | 'admin'

interface RoleGuardProps {
  /** One or more roles that are allowed to view this route */
  allowedRoles: UserRole[]
  children: ReactNode
}

/** Maps each role to its default home page */
const roleHomeMap: Record<UserRole, string> = {
  admin: '/admin',
  customer: '/home',
  farmer: '/home',
  ngo: '/home',
  driver: '/home',
}

/**
 * Checks if the logged-in user has one of the allowed roles.
 * If not, redirects them to their own role's home page.
 *
 * Should always be used INSIDE a <ProtectedRoute> so we can
 * assume `user` exists in localStorage.
 */
export default function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const raw = localStorage.getItem('user')

  if (!raw) {
    return <Navigate to="/auth" replace />
  }

  try {
    const user = JSON.parse(raw)
    const role: UserRole = user?.role

    if (!role || !allowedRoles.includes(role)) {
      // Send them to their own dashboard instead
      const fallback = roleHomeMap[role] || '/home'
      return <Navigate to={fallback} replace />
    }
  } catch {
    return <Navigate to="/auth" replace />
  }

  return <>{children}</>
}
