import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, useNavigate } from 'react-router-dom'
import AppRoutes from './routes'
import IntroTransition from '../components/Animation/IntroTransition'
import RoleIntroTransition from '../components/Animation/RoleIntroTransition'

type Role = 'FARMER' | 'NGO' | 'DRIVER' | 'CUSTOMER'

function AppContent() {
  const navigate = useNavigate()

  // Landing → Auth intro transition
  const [showIntro, setShowIntro] = useState(false)
  const [introTarget, setIntroTarget] = useState('')

  // Role intro transition (after login/signup)
  const [showRoleIntro, setShowRoleIntro] = useState(false)
  const [roleIntroTarget, setRoleIntroTarget] = useState('')
  const [roleIntroRole, setRoleIntroRole] = useState<Role>('FARMER')

  useEffect(() => {
    const introHandler = (e: Event) => {
      const path = (e as CustomEvent).detail as string
      setIntroTarget(path)
      setShowIntro(true)
    }
    const roleHandler = (e: Event) => {
      const { path, role } = (e as CustomEvent).detail as { path: string; role: string }
      setRoleIntroTarget(path)
      setRoleIntroRole(role.toUpperCase() as Role)
      setShowRoleIntro(true)
    }
    window.addEventListener('annam-intro-transition', introHandler)
    window.addEventListener('annam-role-transition', roleHandler)
    return () => {
      window.removeEventListener('annam-intro-transition', introHandler)
      window.removeEventListener('annam-role-transition', roleHandler)
    }
  }, [])

  const handleIntroComplete = useCallback(() => {
    navigate(introTarget)
    setTimeout(() => setShowIntro(false), 50)
  }, [navigate, introTarget])

  const handleRoleComplete = useCallback(() => {
    navigate(roleIntroTarget)
    setTimeout(() => setShowRoleIntro(false), 50)
  }, [navigate, roleIntroTarget])

  return (
    <>
      <AppRoutes />
      <IntroTransition isVisible={showIntro} onComplete={handleIntroComplete} />
      <RoleIntroTransition role={roleIntroRole} isVisible={showRoleIntro} onComplete={handleRoleComplete} />
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App
