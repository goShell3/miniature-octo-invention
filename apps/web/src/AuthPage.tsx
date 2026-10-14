import { useState } from 'react'
import type { FormEvent } from 'react'
import { authClient } from './auth-client'
import './AuthPage.css'

interface User {
  id: string
  email: string
}

interface AuthPageProps {
  onAuthenticated: (user: User) => void
  apiStatus: 'checking' | 'online' | 'offline'
  authProviders: { google: boolean; facebook: boolean }
  initialMode?: 'login' | 'signup'
  onClose?: () => void
}

type AuthMode = 'login' | 'signup'

// Extract the first meaningful message from a better-auth error response.
function extractErrorMessage(reason: unknown, fallback: string): string {
  if (reason instanceof Error) {
    // better-auth wraps API error messages in Error.message
    const msg = reason.message
    if (msg && msg !== 'undefined' && msg !== 'null') return msg
  }
  if (typeof reason === 'object' && reason !== null) {
    const r = reason as Record<string, unknown>
    const msg = r['message']
    if (typeof msg === 'string') return msg
    if (Array.isArray(msg)) return msg.join(', ')
  }
  return fallback
}

export function AuthPage({ onAuthenticated, apiStatus, authProviders, initialMode, onClose }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode ?? 'signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function switchMode(next: AuthMode) {
    setMode(next)
    setError('')
    setPassword('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError('Please enter your email address.')
      return
    }
    if (password.length < 12) {
      setError('Password must be at least 12 characters.')
      return
    }

    setBusy(true)
    try {
      if (mode === 'signup') {
        const { data, error: authError } = await authClient.signUp.email({
          name: trimmedEmail.split('@')[0],
          email: trimmedEmail,
          password,
        })
        if (authError) throw new Error(authError.message ?? 'Sign up failed')
        if (data?.user) {
          onAuthenticated({ id: data.user.id, email: data.user.email })
          return
        }
      } else {
        const { data, error: authError } = await authClient.signIn.email({
          email: trimmedEmail,
          password,
        })
        if (authError) throw new Error(authError.message ?? 'Sign in failed')
        if (data?.user) {
          onAuthenticated({ id: data.user.id, email: data.user.email })
          return
        }
      }

      // No error but no user either — fetch the session to confirm
      const { data: session, error: sessionError } = await authClient.getSession({})
      if (sessionError) throw new Error(sessionError.message ?? 'Session check failed')
      if (session?.user) {
        onAuthenticated({ id: session.user.id, email: session.user.email })
      } else {
        throw new Error('Authentication succeeded but no session was returned.')
      }
    } catch (reason) {
      setError(extractErrorMessage(reason, mode === 'signup' ? 'Unable to create account.' : 'Unable to sign in.'))
    } finally {
      setBusy(false)
    }
  }

  async function handleSocialSignIn(provider: 'google' | 'facebook') {
    setError('')
    setBusy(true)
    try {
      const { error: authError } = await authClient.signIn.social({
        provider,
        callbackURL: window.location.origin,
      })
      if (authError) throw new Error(authError.message ?? `Sign in with ${provider} failed`)
      // Social sign-in redirects, so no further action here.
    } catch (reason) {
      setError(extractErrorMessage(reason, `Unable to sign in with ${provider}.`))
      setBusy(false)
    }
  }

  const hasSocial = authProviders.google || authProviders.facebook

  return (
    <main className="auth-page">
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 24,
            right: 24,
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: '1px solid var(--line)',
            background: '#ffffff',
            color: 'var(--ink)',
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
            zIndex: 100,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}
        >
          ✕
        </button>
      )}
      {/* Brand */}
      <header className="auth-brand">
        <span className="brand-mark">S</span>
        <span className="brand-name">sewnet</span>
      </header>

      {/* API status badge */}
      <div className="auth-api-status" data-status={apiStatus} aria-live="polite">
        <span className="api-status-dot" aria-hidden="true" />
        {apiStatus === 'online' ? 'API online' : apiStatus === 'offline' ? 'API offline' : 'Checking API…'}
      </div>

      {/* Auth card */}
      <section className="auth-card" aria-label={mode === 'signup' ? 'Create an account' : 'Sign in'}>
        {/* Left: copy */}
        <div className="auth-card-copy">
          <p className="auth-eyebrow">DIGITAL IDENTITY &amp; NETWORKING PLATFORM</p>
          <h1 className="auth-headline">
            {mode === 'signup' ? 'One identity.\nOne tap.' : 'Welcome\nback.'}
          </h1>
          <p className="auth-sub">
            {mode === 'signup'
              ? 'One identity. One tap. Every connection measured.'
              : 'Good to have you back. Your network is waiting.'}
          </p>
          <div className="auth-art" aria-hidden="true">
            <div className="art-card">
              <span className="art-label">DIGITAL IDENTITY</span>
              <strong className="art-title">
                One identity.<br />One tap.<br /><em>Every connection measured.</em>
              </strong>
              <div className="art-rule" />
              <span className="art-foot">SEWNET / 2026</span>
            </div>
            <div className="art-badge">S / 01</div>
          </div>
        </div>

        {/* Right: form */}
        <div className="auth-card-form">
          {/* Mode tabs */}
          <div className="auth-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={mode === 'signup'}
              className={mode === 'signup' ? 'active' : ''}
              onClick={() => switchMode('signup')}
              disabled={busy}
              type="button"
            >
              Create account
            </button>
            <button
              role="tab"
              aria-selected={mode === 'login'}
              className={mode === 'login' ? 'active' : ''}
              onClick={() => switchMode('login')}
              disabled={busy}
              type="button"
            >
              Sign in
            </button>
          </div>

          {/* Social buttons */}
          {hasSocial && (
            <div className="auth-social">
              {authProviders.google && (
                <button
                  type="button"
                  className="social-button"
                  onClick={() => handleSocialSignIn('google')}
                  disabled={busy}
                >
                  <GoogleIcon />
                  Continue with Google
                </button>
              )}
              {authProviders.facebook && (
                <button
                  type="button"
                  className="social-button"
                  onClick={() => handleSocialSignIn('facebook')}
                  disabled={busy}
                >
                  <FacebookIcon />
                  Continue with Facebook
                </button>
              )}
              <div className="auth-divider" aria-hidden="true">
                <span>or continue with email</span>
              </div>
            </div>
          )}

          {/* Email/password form */}
          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="auth-field">
              <label htmlFor="auth-email">Email address</label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
                aria-describedby={error ? 'auth-error' : undefined}
              />
            </div>

            <div className="auth-field">
              <label htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
                minLength={12}
                placeholder={mode === 'signup' ? 'At least 12 characters' : 'Your password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
              />
              {mode === 'signup' && (
                <span className="auth-field-hint">
                  Use at least 12 characters — the longer, the better.
                </span>
              )}
            </div>

            {/* Error message */}
            {error && (
              <p id="auth-error" className="auth-error" role="alert" aria-live="assertive">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="auth-submit"
              disabled={busy}
            >
              {busy
                ? 'Please wait…'
                : mode === 'signup'
                  ? 'Create account'
                  : 'Sign in'}
            </button>

            {apiStatus === 'offline' && (
              <p className="auth-offline-notice" role="status">
                Connecting to API… (If dormant, Render takes ~30s to wake up). You can still submit.
              </p>
            )}
          </form>

          <p className="auth-switch-hint">
            {mode === 'signup'
              ? <>Already have an account?{' '}<button type="button" className="auth-switch-btn" onClick={() => switchMode('login')} disabled={busy}>Sign in</button></>
              : <>New to Sewnet?{' '}<button type="button" className="auth-switch-btn" onClick={() => switchMode('signup')} disabled={busy}>Create an account</button></>}
          </p>
        </div>
      </section>
    </main>
  )
}

// Inline SVG icons — no external dependency needed.
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.234 2.686.234v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
    </svg>
  )
}
