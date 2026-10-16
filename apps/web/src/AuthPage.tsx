import { useState } from 'react'
import type { FormEvent } from 'react'
import { authClient } from './auth-client'
import { BrandLogo } from './BrandLogo'
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

function extractErrorMessage(reason: unknown, fallback: string): string {
  if (reason instanceof Error) {
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

export function AuthPage({
  onAuthenticated,
  apiStatus,
  authProviders,
  initialMode = 'login',
  onClose,
}: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
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
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
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

      // Session fallback verification
      const { data: session, error: sessionError } = await authClient.getSession({})
      if (sessionError) throw new Error(sessionError.message ?? 'Session check failed')
      if (session?.user) {
        onAuthenticated({ id: session.user.id, email: session.user.email })
      } else {
        throw new Error('Authentication succeeded but session could not be established.')
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
    } catch (reason) {
      setError(extractErrorMessage(reason, `Unable to sign in with ${provider}.`))
      setBusy(false)
    }
  }

  const hasSocial = authProviders.google || authProviders.facebook

  return (
    <div className="auth-container">
      <div className="auth-box">
        {onClose && (
          <button
            type="button"
            className="auth-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        )}

        {/* Brand header */}
        <div className="auth-header">
          <div className="auth-brand-lockup">
            <BrandLogo variant="auth" />
          </div>
          <h1 className="auth-title">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="auth-subtitle">
            {mode === 'login'
              ? 'Sign in to manage your digital cards & portfolios'
              : 'One identity. One tap. Start your digital presence'}
          </p>
        </div>

        {/* Mode Selector */}
        <div className="auth-mode-pills" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={`auth-pill ${mode === 'login' ? 'active' : ''}`}
            onClick={() => switchMode('login')}
            disabled={busy}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            className={`auth-pill ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => switchMode('signup')}
            disabled={busy}
          >
            Create Account
          </button>
        </div>

        {/* Social auth buttons if configured */}
        {hasSocial && (
          <div className="auth-social-stack">
            {authProviders.google && (
              <button
                type="button"
                className="auth-social-btn"
                onClick={() => handleSocialSignIn('google')}
                disabled={busy}
              >
                <GoogleIcon />
                <span>Continue with Google</span>
              </button>
            )}
            {authProviders.facebook && (
              <button
                type="button"
                className="auth-social-btn"
                onClick={() => handleSocialSignIn('facebook')}
                disabled={busy}
              >
                <FacebookIcon />
                <span>Continue with Facebook</span>
              </button>
            )}
            <div className="auth-sep">
              <span>or email</span>
            </div>
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="auth-form-body" noValidate>
          <div className="auth-input-group">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
            />
          </div>

          <div className="auth-input-group">
            <div className="auth-label-row">
              <label htmlFor="auth-password">Password</label>
              {mode === 'signup' && (
                <span className="auth-hint">Min. 8 characters</span>
              )}
            </div>
            <input
              id="auth-password"
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required
              placeholder={mode === 'signup' ? 'Create a secure password' : 'Enter your password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
            />
          </div>

          {error && (
            <div className="auth-alert" role="alert">
              <span>✕</span>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="auth-primary-btn"
            disabled={busy}
          >
            {busy ? (
              <span className="auth-spinner-wrap">
                <span className="auth-spinner" />
                <span>Connecting…</span>
              </span>
            ) : mode === 'login' ? (
              'Sign In →'
            ) : (
              'Create Account →'
            )}
          </button>

          {apiStatus === 'offline' && (
            <p style={{ fontSize: 11.5, color: '#a89f91', textAlign: 'center', margin: '4px 0 0' }}>
              API reconnecting. You can submit and requests will process.
            </p>
          )}
        </form>

        {/* Footer switch */}
        <div className="auth-switch-footer">
          {mode === 'signup' ? (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                className="auth-link-btn"
                onClick={() => switchMode('login')}
                disabled={busy}
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              New to Koolink?{' '}
              <button
                type="button"
                className="auth-link-btn"
                onClick={() => switchMode('signup')}
                disabled={busy}
              >
                Create Account
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

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
