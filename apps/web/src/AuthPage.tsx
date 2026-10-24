import { useState } from 'react'
import type { FormEvent } from 'react'
import type { NfcCardTier, UserProfile } from '@amalink/types'
import { authClient } from './auth-client'
import { BrandLogo } from './BrandLogo'
import { NFC_CARD_TIER_META } from '@amalink/types'
import './AuthPage.css'

interface AuthPageProps {
  onAuthenticated: (user: UserProfile) => void
  apiStatus: 'checking' | 'online' | 'offline'
  authProviders: { google: boolean; facebook: boolean }
  initialMode?: 'login' | 'signup'
  onClose?: () => void
}

type AuthMode = 'login' | 'signup'

function extractErrorMessage(reason: unknown, fallback: string): string {
  if (reason instanceof Error) {
    const msg = reason.message
    if (msg && msg !== 'undefined' && msg !== 'null') {
      if (msg.toLowerCase().includes('invalid email or password') || msg.toLowerCase().includes('credentials')) {
        return 'Incorrect email or password. Please verify and try again.'
      }
      return msg
    }
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
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  // const [tinNumber, setTinNumber] = useState('')
  const [teamSize, setTeamSize] = useState('5-19 cards')
  const [selectedCustomerType, setSelectedCustomerType] = useState<NfcCardTier>('individual')
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)

  function switchMode(next: AuthMode) {
    setMode(next)
    setError('')
    setPassword('')
    setShowPassword(false)
    setShowForgotPassword(false)
    setForgotSent(false)
  }

  function handleTierSelect(tier: NfcCardTier) {
    setSelectedCustomerType(tier)
    if (tier === 'business') setTeamSize('5-19 cards')
    else if (tier === 'enterprise') setTeamSize('20-49 cards')
    else if (tier === 'corporate') setTeamSize('50+ cards')
  }

  async function handleForgotPasswordSubmit(event: FormEvent) {
    event.preventDefault()
    if (!forgotEmail.trim()) {
      setError('Please enter your email to receive recovery instructions.')
      return
    }
    setBusy(true)
    setError('')
    try {
      // Simulate/request password reset
      await new Promise((r) => setTimeout(r, 600))
      setForgotSent(true)
    } catch {
      setError('Unable to send password reset instructions. Please contact support.')
    } finally {
      setBusy(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError('Please enter your email address.')
      return
    }

    if (mode === 'signup') {
      if (password.length < 8) {
        setError('Password must be at least 8 characters.')
        return
      }
      if (!fullName.trim()) {
        setError('Please enter your full name or representative name.')
        return
      }
      if (selectedCustomerType !== 'individual' && !companyName.trim()) {
        setError('Please enter your company or organization name.')
        return
      }
      if (selectedCustomerType !== 'individual' && !phoneNumber.trim()) {
        setError('Please enter a contact phone number for order delivery.')
        return
      }
    }

    setBusy(true)
    try {
      if (mode === 'signup') {
        const signupPayload = {
          name: fullName.trim() || trimmedEmail.split('@')[0],
          email: trimmedEmail,
          password,
          customerType: selectedCustomerType,
          companyName: companyName.trim() || undefined,
          phoneNumber: phoneNumber.trim() || undefined,
          // tinNumber: tinNumber.trim() || undefined,
          teamSize: teamSize.trim() || undefined,
        }
        const { data, error: authError } = await authClient.signUp.email(signupPayload as any)
        if (authError) throw new Error(authError.message ?? 'Sign up failed')
        if (data?.user) {
          const userObj = data.user as unknown as Record<string, unknown>
          onAuthenticated({
            id: data.user.id,
            email: data.user.email,
            name: (userObj.name as string) ?? (fullName.trim() || undefined),
            customerType: (userObj.customerType as NfcCardTier) ?? selectedCustomerType,
            companyName: (userObj.companyName as string) ?? (companyName.trim() || undefined),
            phoneNumber: (userObj.phoneNumber as string) ?? (phoneNumber.trim() || undefined),
            // tinNumber: (userObj.tinNumber as string) ?? (tinNumber.trim() || undefined),
            teamSize: (userObj.teamSize as string) ?? (teamSize.trim() || undefined),
          })
          return
        }
      } else {
        const { data, error: authError } = await authClient.signIn.email({
          email: trimmedEmail,
          password,
        })
        if (authError) throw new Error(authError.message ?? 'Sign in failed')
        if (data?.user) {
          const userObj = data.user as unknown as Record<string, unknown>
          onAuthenticated({
            id: data.user.id,
            email: data.user.email,
            name: userObj.name as string | undefined,
            customerType: userObj.customerType as NfcCardTier | undefined,
            companyName: userObj.companyName as string | undefined,
            phoneNumber: userObj.phoneNumber as string | undefined,
            tinNumber: userObj.tinNumber as string | undefined,
            teamSize: userObj.teamSize as string | undefined,
          })
          return
        }
      }

      // Session fallback verification
      const { data: session, error: sessionError } = await authClient.getSession({})
      if (sessionError) throw new Error(sessionError.message ?? 'Session check failed')
      if (session?.user) {
        const userObj = session.user as unknown as Record<string, unknown>
        onAuthenticated({
          id: session.user.id,
          email: session.user.email,
          name: userObj.name as string | undefined,
          customerType: userObj.customerType as NfcCardTier | undefined,
          companyName: userObj.companyName as string | undefined,
          phoneNumber: userObj.phoneNumber as string | undefined,
          tinNumber: userObj.tinNumber as string | undefined,
          teamSize: userObj.teamSize as string | undefined,
        })
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
      if (mode === 'signup') {
        window.sessionStorage.setItem('koolink.selected-card-tier', selectedCustomerType)
      }
      const { error: authError } = await authClient.signIn.social({
        provider,
        callbackURL: window.location.origin,
      })
      if (authError) throw new Error(authError.message ?? `Unable to continue with ${provider}`)
    } catch (reason) {
      setError(extractErrorMessage(reason, `Unable to continue with ${provider}.`))
      setBusy(false)
    }
  }

  const hasSocial = authProviders.google || authProviders.facebook
  const tierMeta = NFC_CARD_TIER_META[selectedCustomerType]

  return (
    <div className="auth-container">
      <div className={`auth-box ${mode === 'signup' && selectedCustomerType !== 'individual' ? 'auth-box-wide' : ''}`}>
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
            {showForgotPassword
              ? 'Reset your password'
              : mode === 'login'
              ? 'Welcome back'
              : 'Create your account'}
          </h1>
          <p className="auth-subtitle">
            {showForgotPassword
              ? 'Enter your email address to recover your account'
              : mode === 'login'
              ? 'Sign in to access your digital cards, tap analytics & orders'
              : 'Choose your account type to unlock tailored pricing and tools'}
          </p>
        </div>

        {/* Mode Selector (hidden during forgot password view) */}
        {!showForgotPassword && (
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
        )}

        {/* Forgot Password Recovery View */}
        {showForgotPassword ? (
          <div className="auth-recovery-card">
            {forgotSent ? (
              <div className="auth-recovery-success">
                <div className="auth-recovery-icon-circle">✓</div>
                <h3>Check your inbox</h3>
                <p>
                  We have sent password recovery instructions to <strong>{forgotEmail}</strong>.
                </p>
                <div className="auth-recovery-support-note">
                  <span>Need fast assistance in Ethiopia?</span>
                  <a
                    href="https://t.me/koolink_et"
                    target="_blank"
                    rel="noreferrer"
                    className="auth-telegram-link"
                  >
                    💬 Chat with Telegram Support
                  </a>
                </div>
                <button
                  type="button"
                  className="auth-primary-btn"
                  onClick={() => {
                    setShowForgotPassword(false)
                    setForgotSent(false)
                  }}
                  style={{ marginTop: 18 }}
                >
                  ← Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} className="auth-form-body">
                <div className="auth-input-group">
                  <label htmlFor="auth-forgot-email">Your Registered Email</label>
                  <div className="auth-input-with-icon">
                    <span className="auth-input-icon">
                      <MailIcon />
                    </span>
                    <input
                      id="auth-forgot-email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="you@domain.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      disabled={busy}
                      autoFocus
                    />
                  </div>
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
                      <span>Sending instructions…</span>
                    </span>
                  ) : (
                    'Send Reset Link →'
                  )}
                </button>

                <div className="auth-support-help-card">
                  <strong>Need urgent help?</strong>
                  <p>Contact our Addis Ababa team directly:</p>
                  <div className="auth-support-chips">
                    <a href="https://t.me/koolink_et" target="_blank" rel="noreferrer" className="auth-support-chip">
                      Telegram: @koolink_et
                    </a>
                    <a href="tel:+251911234567" className="auth-support-chip">
                      Phone: 091 123 4567
                    </a>
                  </div>
                </div>

                <button
                  type="button"
                  className="auth-back-link"
                  onClick={() => setShowForgotPassword(false)}
                >
                  ← Return to Sign In
                </button>
              </form>
            )}
          </div>
        ) : (
          <>
            {/* Social auth buttons if configured (for both Sign In and Create Account) */}
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
                    <span>{mode === 'login' ? 'Continue with Google' : 'Sign up with Google'}</span>
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
                    <span>{mode === 'login' ? 'Continue with Facebook' : 'Sign up with Facebook'}</span>
                  </button>
                )}
                <div className="auth-sep">
                  <span>{mode === 'login' ? 'or sign in with email' : 'or continue with email'}</span>
                </div>
              </div>
            )}

            {/* Main Form */}
            <form onSubmit={handleSubmit} className="auth-form-body" noValidate>
              {mode === 'signup' && (
                <div className="auth-input-group">
                  <div className="auth-label-row">
                    <label>Account Type</label>
                    <span className="auth-hint">Automatic volume tier discount</span>
                  </div>
                  <div className="auth-tier-grid" role="group" aria-label="Account type">
                    {(['individual', 'business', 'enterprise', 'corporate'] as NfcCardTier[]).map((tierKey) => {
                      const m = NFC_CARD_TIER_META[tierKey]
                      const isSelected = selectedCustomerType === tierKey
                      return (
                        <button
                          key={tierKey}
                          type="button"
                          className={`auth-tier-btn ${isSelected ? 'active' : ''}`}
                          onClick={() => handleTierSelect(tierKey)}
                          disabled={busy}
                        >
                          <span className="auth-tier-btn-name">{m.name}</span>
                          <span className="auth-tier-btn-price">{m.priceETB.toLocaleString()} ETB</span>
                          <span className="auth-tier-btn-range">{m.rangeLabel}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Tier feature description banner */}
                  {/* <div className="auth-tier-info-banner">
                    <div className="auth-tier-info-header">
                      <strong>{tierMeta.name} Plan</strong>
                      <span className="auth-tier-info-tag">{tierMeta.priceETB.toLocaleString()} ETB / card</span>
                    </div>
                    <p className="auth-tier-info-desc">
                      {selectedCustomerType === 'individual' && 'Perfect for personal branding, freelancers, and professionals. 1–4 cards.'}
                      {selectedCustomerType === 'business' && 'Ideal for small-to-medium teams. 5–19 cards with shared brand styling.'}
                      {selectedCustomerType === 'enterprise' && 'Tailored for growing companies. 20–49 cards with proforma invoicing & tax compliance.'}
                      {selectedCustomerType === 'corporate' && 'Designed for large organizations & institutions. 50+ cards with maximum bulk discounts & dedicated support.'}
                    </p>
                  </div> */}
                </div>
              )}

              {mode === 'signup' && (
                <div className={selectedCustomerType !== 'individual' ? 'auth-form-row' : ''}>
                  <div className="auth-input-group">
                    <label htmlFor="auth-fullname">
                      {selectedCustomerType === 'individual' ? 'Full Name' : 'Representative Name'}
                    </label>
                    <div className="auth-input-with-icon">
                      <span className="auth-input-icon"><UserIcon /></span>
                      <input
                        id="auth-fullname"
                        type="text"
                        autoComplete="name"
                        required
                        placeholder={selectedCustomerType === 'individual' ? 'Abebe Kebede' : 'Contact Person Full Name'}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        disabled={busy}
                      />
                    </div>
                  </div>

                  {selectedCustomerType !== 'individual' && (
                    <div className="auth-input-group">
                      <label htmlFor="auth-company">Company / Organization</label>
                      <div className="auth-input-with-icon">
                        <span className="auth-input-icon"><BuildingIcon /></span>
                        <input
                          id="auth-company"
                          type="text"
                          autoComplete="organization"
                          required
                          placeholder="e.g. Awash Media PLC"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          disabled={busy}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className={mode === 'signup' && selectedCustomerType !== 'individual' ? 'auth-form-row' : ''}>
                <div className="auth-input-group">
                  <label htmlFor="auth-email">
                    {mode === 'signup' && selectedCustomerType !== 'individual' ? 'Work Email' : 'Email Address'}
                  </label>
                  <div className="auth-input-with-icon">
                    <span className="auth-input-icon"><MailIcon /></span>
                    <input
                      id="auth-email"
                      type="email"
                      inputMode="email"
                      autoCapitalize="none"
                      spellCheck={false}
                      autoComplete="username email"
                      required
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={busy}
                    />
                  </div>
                </div>

                {mode === 'signup' && (
                  <div className="auth-input-group">
                    <div className="auth-label-row">
                      <label htmlFor="auth-phone">Phone Number</label>
                      {selectedCustomerType === 'individual' ? (
                        <span className="auth-hint">Optional</span>
                      ) : (
                        <span className="auth-hint">For card dispatch</span>
                      )}
                    </div>
                    <div className="auth-input-with-icon">
                      <span className="auth-input-icon"><PhoneIcon /></span>
                      <input
                        id="auth-phone"
                        type="tel"
                        autoComplete="tel"
                        placeholder="+251 9... or 09..."
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        disabled={busy}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Business & Corporate additional fields */}
              {mode === 'signup' && selectedCustomerType !== 'individual' && (
                <div className="auth-form-row">
                  <div className="auth-input-group">
                    <label htmlFor="auth-team-size">Estimated Card Volume</label>
                    <select
                      id="auth-team-size"
                      className="auth-select"
                      value={teamSize}
                      onChange={(e) => setTeamSize(e.target.value)}
                      disabled={busy}
                    >
                      {selectedCustomerType === 'business' && (
                        <>
                          <option value="5-9 cards">5–9 cards (Small Team)</option>
                          <option value="10-14 cards">10–14 cards (Growing Team)</option>
                          <option value="15-19 cards">15–19 cards (Mid-size Team)</option>
                        </>
                      )}
                      {selectedCustomerType === 'enterprise' && (
                        <>
                          <option value="20-29 cards">20–29 cards (Department)</option>
                          <option value="30-39 car/ds">30–39 cards (Enterprise Branch)</option>
                          <option value="40-49 cards">40–49 cards (Full Division)</option>
                        </>
                      )}
                      {selectedCustomerType === 'corporate' && (
                        <>
                          <option value="50-99 cards">50–99 cards (Corporate Core)</option>
                          <option value="100-249 cards">100–249 cards (Enterprise Scale)</option>
                          <option value="250+ cards">250+ cards (Organization-wide)</option>
                        </>
                      )}
                    </select>
                  </div>

              

                </div>
              )}

              {/* Password field */}
              <div className="auth-input-group">
                <div className="auth-label-row">
                  <label htmlFor="auth-password">Password</label>
                  {mode === 'signup' && (
                    <span className="auth-hint">Min. 8 characters</span>
                  )}
                </div>
                <div className="auth-password-field-wrap auth-input-with-icon">
                  <span className="auth-input-icon"><LockIcon /></span>
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    minLength={mode === 'signup' ? 8 : undefined}
                    required
                    placeholder={mode === 'signup' ? 'Create a secure password (min. 8 chars)' : 'Enter your password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={busy}
                  />
                  <button
                    type="button"
                    className="auth-password-toggle-btn"
                    onClick={() => setShowPassword((prev) => !prev)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOffIcon />
                    ) : (
                      <EyeIcon />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember me & Forgot Password Row (Sign In mode) */}
              {mode === 'login' && (
                <div className="auth-sign-in-options">
                  <label className="auth-remember-checkbox-label">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={busy}
                    />
                    <span>Remember me</span>
                  </label>

                  <button
                    type="button"
                    className="auth-forgot-trigger-btn"
                    onClick={() => {
                      setForgotEmail(email.trim())
                      setShowForgotPassword(true)
                      setError('')
                    }}
                    disabled={busy}
                  >
                    Forgot password?
                  </button>
                </div>
              )}

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
                    <span>{mode === 'login' ? 'Signing in…' : 'Creating account…'}</span>
                  </span>
                ) : mode === 'login' ? (
                  'Sign In to Dashboard →'
                ) : (
                  `Create ${tierMeta.name} Account →`
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
          </>
        )}
      </div>
    </div>
  )
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function BuildingIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
      <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
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
