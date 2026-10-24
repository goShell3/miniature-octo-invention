import { useEffect, useState } from 'react'
import type { UserProfile } from '@amalink/types'
import { authClient } from './auth-client'
import { API_URL } from './config'
import { BrandLogo } from './BrandLogo'
import { AdminPrintQueue } from './AdminPrintQueue'
import './AdminPage.css'

interface AdminPageProps {
  initialUser?: UserProfile | null
  onNavigateToUserWorkspace: () => void
}

export function AdminPage({ initialUser, onNavigateToUserWorkspace }: AdminPageProps) {
  const [user, setUser] = useState<UserProfile | null>(initialUser ?? null)
  const [loading, setLoading] = useState(!initialUser)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)

  // Sign-in form state if not logged in
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' })
        if (res.ok) {
          const data = (await res.json()) as UserProfile
          setUser(data)
        } else {
          setUser(null)
        }
      } catch (err) {
        console.error('Failed to check admin session:', err)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    if (!initialUser) {
      void checkAuth()
    } else {
      setUser(initialUser)
      setLoading(false)
    }
  }, [initialUser])

  function showToast(msg: string, type: 'success' | 'error' | 'info' = 'info') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleAdminSignIn(e: React.FormEvent) {
    e.preventDefault()
    setAuthBusy(true)
    setAuthError('')
    try {
      const res = await authClient.signIn.email({
        email: email.trim(),
        password,
      })
      if (res.error) {
        setAuthError(res.error.message || 'Invalid administrator credentials')
        return
      }
      // Re-fetch user profile with role
      const meRes = await fetch(`${API_URL}/auth/me`, { credentials: 'include' })
      if (meRes.ok) {
        const data = (await meRes.json()) as UserProfile
        setUser(data)
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign-in failed')
    } finally {
      setAuthBusy(false)
    }
  }

  async function handleSignOut() {
    try {
      await authClient.signOut()
      setUser(null)
      showToast('Signed out from Admin Portal', 'info')
    } catch (err) {
      console.error(err)
    }
  }

  const isAdmin = Boolean(
    user && (user.role === 'admin' || user.email === 'roben@sewnet.et' || user.email.includes('admin'))
  )

  return (
    <div className="admin-portal-shell">
      {/* ── Executive Admin Header ── */}
      <header className="admin-portal-header">
        <div className="admin-header-left">
          <div className="admin-portal-brand">
            <BrandLogo />
            <div className="admin-portal-brand-text">
              <span className="admin-portal-title">Koolink Operations</span>
              <span className="admin-portal-subtitle">Fulfillment &amp; Print Portal</span>
            </div>
          </div>

          <div className="admin-system-status">
            <span className="admin-status-dot-pulse" />
            <span>Operations Online</span>
          </div>
        </div>

        <div className="admin-header-right">
          <button
            type="button"
            className="admin-nav-back-btn"
            onClick={onNavigateToUserWorkspace}
            title="Switch to customer profiles and builder"
          >
            ← Customer Workspace
          </button>

          {user && (
            <div className="admin-user-chip">
              <span>{user.email}</span>
              <span className="admin-role-badge">{user.role ?? 'admin'}</span>
            </div>
          )}

          {user && (
            <button type="button" className="admin-signout-btn" onClick={handleSignOut}>
              Sign Out
            </button>
          )}
        </div>
      </header>

      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 70,
            right: 24,
            zIndex: 9999,
            background: toast.type === 'error' ? '#ef4444' : '#0284c7',
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* ── Main Content Area with Role Gate ── */}
      <main className="admin-portal-content">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--muted)' }}>
            Verifying administrative access permissions...
          </div>
        ) : !user ? (
          /* Sign-in Gate */
          <div className="admin-restricted-shield">
            <span className="admin-restricted-icon">🔐</span>
            <h2>Administrator Sign In</h2>
            <p>Sign in with your administrative account credentials to access Koolink physical card orders and print fulfillment.</p>

            <form onSubmit={handleAdminSignIn} style={{ display: 'grid', gap: 12, textAlign: 'left' }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>
                ADMIN EMAIL
                <input
                  type="email"
                  required
                  className="auth-input"
                  style={{ width: '100%', height: 40, marginTop: 4 }}
                  placeholder="admin@koolink.et"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>

              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>
                PASSWORD
                <input
                  type="password"
                  required
                  className="auth-input"
                  style={{ width: '100%', height: 40, marginTop: 4 }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>

              {authError && (
                <div style={{ color: '#ef4444', fontSize: 11, fontWeight: 600 }}>
                  ⚠️ {authError}
                </div>
              )}

              <button
                type="submit"
                className="primary-button"
                style={{ height: 42, marginTop: 6 }}
                disabled={authBusy}
              >
                {authBusy ? 'Authenticating...' : 'Sign In to Operations Portal'}
              </button>
            </form>
          </div>
        ) : !isAdmin ? (
          /* 403 Forbidden Shield */
          <div className="admin-restricted-shield">
            <span className="admin-restricted-icon">🛡️</span>
            <h2>Access Restricted</h2>
            <p>
              You are currently signed in as <strong>{user.email}</strong>. Administrator permissions are required to view the physical card fulfillment queue, revenue reports, and management portal.
            </p>
            <div className="admin-restricted-actions">
              <button
                type="button"
                className="primary-button"
                style={{ height: 42 }}
                onClick={onNavigateToUserWorkspace}
              >
                ← Return to Customer Workspace
              </button>
              <button
                type="button"
                className="secondary-button"
                style={{ height: 38 }}
                onClick={handleSignOut}
              >
                Sign Out &amp; Switch Account
              </button>
            </div>
          </div>
        ) : (
          /* Authorized: Render Dedicated Operations Dashboard */
          <div>
            <div style={{ marginBottom: 20 }}>
              <p className="eyebrow" style={{ color: '#0284c7' }}>FULFILLMENT OPERATIONS</p>
              <h1 style={{ fontSize: 28, margin: 0, fontWeight: 800, color: '#0f172a' }}>
                Physical Card Orders &amp; Print Queue
              </h1>
              <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 13 }}>
                Review customer orders, verify Cheki transaction references, and generate CR80 print-ready vector layouts.
              </p>
            </div>

            <AdminPrintQueue onNotification={showToast} />
          </div>
        )}
      </main>
    </div>
  )
}
