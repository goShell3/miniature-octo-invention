import { lazy, Suspense, useEffect, useState } from 'react'
import { getSubdomain, getPortfolioDomainLabel, getPortfolioSubdomainUrl, isAdminRoute } from './url-helpers'
import { API_URL } from './config'
import { PublicProfilePage } from './PublicProfilePage'

export { getSubdomain, getPortfolioSubdomainUrl, getPortfolioDomainLabel, isAdminRoute }

const WorkspaceApp = lazy(() => import('./WorkspaceApp'))
const AdminPage = lazy(() => import('./AdminPage').then((m) => ({ default: m.AdminPage })))

export function App() {
  const [routePath, setRoutePath] = useState(() =>
    typeof window !== 'undefined' ? window.location.pathname.toLowerCase() : '/'
  )

  useEffect(() => {
    const handlePopState = () => {
      setRoutePath(window.location.pathname.toLowerCase())
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  function navigateTo(targetPath: string) {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', targetPath)
      setRoutePath(targetPath.toLowerCase())
    }
  }

  const activeSubdomain = getSubdomain()

  if (activeSubdomain) {
    return <PublicProfilePage subdomain={activeSubdomain} apiUrl={API_URL} />
  }

  const isAdmin = isAdminRoute() || routePath === '/admin' || routePath.startsWith('/admin/')

  if (isAdmin) {
    return (
      <Suspense fallback={<div className="loading-screen"><div className="loading-spinner" /></div>}>
        <AdminPage onNavigateToUserWorkspace={() => navigateTo('/')} />
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<div className="loading-screen"><div className="loading-spinner" /></div>}>
      <WorkspaceApp onNavigateToAdmin={() => navigateTo('/admin')} />
    </Suspense>
  )
}

export default App
