import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'

interface FarmerProfileGuardProps {
  children: ReactNode
}

/**
 * Ensures a farmer has completed their profile before accessing
 * any listing or marketplace-related routes.
 * If the profile is incomplete, redirects to the setup wizard.
 *
 * Must be used inside <ProtectedRoute> and <RoleGuard allowedRoles={['farmer']}>.
 */
export default function FarmerProfileGuard({ children }: FarmerProfileGuardProps) {
  const location = useLocation()

  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (!user?.profileComplete) {
      return (
        <Navigate
          to="/farmer/complete-profile"
          state={{ returnTo: location.pathname }}
          replace
        />
      )
    }
  } catch {
    return <Navigate to="/farmer/complete-profile" replace />
  }

  return <>{children}</>
}
