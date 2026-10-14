import { useState, useId } from 'react'
import type { CSSProperties } from 'react'
import type { PortfolioBlock } from '@amalink/types'
import { DigitalCard } from './DigitalCard'
import type { CardSocial } from './DigitalCard'
import { getPortfolioDomainLabel, getPortfolioSubdomainUrl } from './url-helpers'
import './SetupWizard.css'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WizardData {
  subdomain: string
  firstName: string
  lastName: string
  title: string
  company: string
  email: string
  phone: string
  bio: string // Up to 140 characters
  telegram?: string
  whatsapp?: string
  linkedin?: string
  instagram?: string
  twitter?: string
  website?: string
  accentColor: `#${string}`
}

interface SetupWizardProps {
  /** Called when the user finishes. App.tsx creates the portfolio from this data. */
  onFinish: (data: WizardData) => Promise<void>
  /** Check subdomain availability against the API */
  checkSubdomain: (subdomain: string) => Promise<boolean>
  busy: boolean
  error: string
}

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS = [
  {
    key: 'address',
    label: 'Address',
    headline: 'Your profile address.',
    sub: 'Claim your personal URL for tap-to-share and instant QR profile access.',
  },
  {
    key: 'personal',
    label: 'Personal',
    headline: 'Personal information.',
    sub: 'Fill in your details for your digital business card.',
  },
  {
    key: 'socials',
    label: 'Socials',
    headline: 'Social & digital addresses.',
    sub: 'Connect your profiles and customize your card accent color.',
  },
] as const

// ─── Main component ────────────────────────────────────────────────────────────

export function SetupWizard({ onFinish, checkSubdomain, busy, error }: SetupWizardProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [subdomainStatus, setSubdomainStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [fieldError, setFieldError] = useState('')

  const [data, setData] = useState<WizardData>({
    subdomain: '',
    firstName: '',
    lastName: '',
    title: '',
    company: '',
    email: '',
    phone: '',
    bio: '',
    telegram: '',
    whatsapp: '',
    linkedin: '',
    instagram: '',
    twitter: '',
    website: '',
    accentColor: '#eb6307', // vibrant orange default matching the attached mockup
  })

  const uid = useId()
  const step = STEPS[stepIndex]
  const isLast = stepIndex === STEPS.length - 1
  const progress = (stepIndex / (STEPS.length - 1)) * 100

  function patch(update: Partial<WizardData>) {
    setData((d) => ({ ...d, ...update }))
    setFieldError('')
  }

  // ── Subdomain check ──────────────────────────────────────────────────────────
  async function handleCheckSubdomain() {
    const val = data.subdomain.trim()
    if (!val) {
      setFieldError('Enter a profile address first.')
      return
    }
    if (!/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(val)) {
      setFieldError('Use 3–30 lowercase letters, numbers, or hyphens. Cannot start or end with a hyphen.')
      return
    }
    setSubdomainStatus('checking')
    setFieldError('')
    try {
      const available = await checkSubdomain(val)
      setSubdomainStatus(available ? 'available' : 'taken')
      if (!available) setFieldError('That address is already taken. Try another.')
    } catch {
      setSubdomainStatus('idle')
      setFieldError('Could not check availability. Try again.')
    }
  }

  // ── Navigation ───────────────────────────────────────────────────────────────
  function canAdvance(): boolean {
    switch (step.key) {
      case 'address':
        return subdomainStatus === 'available'
      case 'personal':
        return data.firstName.trim().length > 0
      case 'socials':
        return true
    }
  }

  function goNext() {
    if (!canAdvance()) {
      if (step.key === 'address' && subdomainStatus !== 'available') {
        setFieldError('Please check and claim an available address before continuing.')
      } else if (step.key === 'personal' && !data.firstName.trim()) {
        setFieldError('Please enter at least your first name.')
      }
      return
    }
    setDirection('forward')
    setFieldError('')
    if (isLast) {
      void onFinish(data)
    } else {
      setStepIndex((i) => i + 1)
    }
  }

  function goBack() {
    if (stepIndex === 0) return
    setDirection('back')
    setFieldError('')
    setStepIndex((i) => i - 1)
  }

  function goToStep(index: number) {
    if (index >= stepIndex) return // only allow going back
    setDirection('back')
    setFieldError('')
    setStepIndex(index)
  }

  // Derive preview socials
  const previewSocials: CardSocial[] = []
  if (data.telegram?.trim()) {
    previewSocials.push({ platform: 'telegram', label: 'Telegram' })
  }
  if (data.whatsapp?.trim() || data.phone?.trim()) {
    previewSocials.push({ platform: 'whatsapp', label: 'WhatsApp' })
  }
  if (data.linkedin?.trim()) {
    previewSocials.push({ platform: 'linkedin', label: 'LinkedIn' })
  }
  if (data.instagram?.trim()) {
    previewSocials.push({ platform: 'instagram', label: 'Instagram' })
  }
  if (data.twitter?.trim()) {
    previewSocials.push({ platform: 'twitter', label: 'X / Twitter' })
  }
  if (data.website?.trim()) {
    previewSocials.push({ platform: 'website', label: 'Website' })
  }

  const fullName = `${data.firstName} ${data.lastName}`.trim() || 'Your Name'
  const profileUrl = getPortfolioSubdomainUrl(data.subdomain || 'yourname', false)
  const displayUrl = getPortfolioDomainLabel(data.subdomain || 'yourname')

  return (
    <div className="wizard-shell">
      {/* ── Progress track ─────────────────────────────────────────── */}
      <header className="wizard-header">
        <div className="wizard-brand">
          <span className="brand-mark" style={{ background: data.accentColor }}>S</span>
          <span>sewnet</span>
        </div>
        <nav className="wizard-steps" aria-label="Setup progress">
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              className={`wizard-step-dot ${i === stepIndex ? 'active' : ''} ${i < stepIndex ? 'done' : ''}`}
              onClick={() => goToStep(i)}
              disabled={i >= stepIndex}
              aria-label={`${s.label}${i < stepIndex ? ' (completed)' : i === stepIndex ? ' (current)' : ''}`}
              aria-current={i === stepIndex ? 'step' : undefined}
            >
              <span className="dot-number">{i < stepIndex ? '✓' : String(i + 1)}</span>
              <span className="dot-label">{s.label}</span>
            </button>
          ))}
          <div className="wizard-progress-bar" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
            <div className="wizard-progress-fill" style={{ width: `${progress}%`, background: data.accentColor }} />
          </div>
        </nav>
        <div className="wizard-step-count" aria-hidden="true">
          {String(stepIndex + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}
        </div>
      </header>

      {/* ── Two-column body ────────────────────────────────────────── */}
      <div className="wizard-body">
        {/* Left: step form */}
        <section
          className={`wizard-form-col ${direction}`}
          key={step.key}
          aria-label={`Step ${stepIndex + 1}: ${step.label}`}
        >
          <div className="wizard-form-inner">
            <p className="wizard-eyebrow">STEP {String(stepIndex + 1).padStart(2, '0')} — {step.label.toUpperCase()}</p>
            <h2 className="wizard-headline">{step.headline}</h2>
            <p className="wizard-sub">{step.sub}</p>

            <div className="wizard-fields">
              {/* ── STEP 1: Address ──────────────────────────────── */}
              {step.key === 'address' && (
                <>
                  <div className="wizard-field">
                    <label htmlFor={`${uid}-subdomain`}>Your profile address</label>
                    <div className="wizard-domain-row">
                      <input
                        id={`${uid}-subdomain`}
                        type="text"
                        value={data.subdomain}
                        autoFocus
                        autoCapitalize="none"
                        autoComplete="off"
                        spellCheck={false}
                        maxLength={30}
                        placeholder="yourname"
                        onChange={(e) => {
                          const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                          patch({ subdomain: val })
                          setSubdomainStatus('idle')
                        }}
                        aria-describedby={`${uid}-subdomain-hint`}
                      />
                      <span className="domain-suffix">
                        {typeof window !== 'undefined' && window.location.hostname.endsWith('localhost') ? '.localhost:5173' : ''}
                      </span>
                    </div>
                    <span id={`${uid}-subdomain-hint`} className="wizard-field-hint">
                      Lowercase letters, numbers, hyphens. 3–30 characters.
                    </span>
                  </div>
                  <div className="wizard-check-row">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={handleCheckSubdomain}
                      disabled={!data.subdomain || subdomainStatus === 'checking'}
                    >
                      {subdomainStatus === 'checking' ? 'Checking…' : 'Check availability'}
                    </button>
                    {subdomainStatus === 'available' && (
                      <span className="wizard-status available" role="status">✓ Available</span>
                    )}
                    {subdomainStatus === 'taken' && (
                      <span className="wizard-status taken" role="status">✗ Already taken</span>
                    )}
                  </div>
                </>
              )}

              {/* ── STEP 2: Personal information ─────────────────── */}
              {step.key === 'personal' && (
                <>
                  <div className="wizard-field-row-2">
                    <div className="wizard-field">
                      <label htmlFor={`${uid}-fname`}>First name</label>
                      <input
                        id={`${uid}-fname`}
                        type="text"
                        value={data.firstName}
                        autoFocus
                        autoComplete="given-name"
                        placeholder="First name"
                        onChange={(e) => patch({ firstName: e.target.value })}
                      />
                    </div>
                    <div className="wizard-field">
                      <label htmlFor={`${uid}-lname`}>Last name</label>
                      <input
                        id={`${uid}-lname`}
                        type="text"
                        value={data.lastName}
                        autoComplete="family-name"
                        placeholder="Last name"
                        onChange={(e) => patch({ lastName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="wizard-field-row-2">
                    <div className="wizard-field">
                      <label htmlFor={`${uid}-title`}>
                        Title <span className="wizard-optional">OPTIONAL</span>
                      </label>
                      <input
                        id={`${uid}-title`}
                        type="text"
                        value={data.title}
                        placeholder="e.g. Lead Designer / Founder"
                        onChange={(e) => patch({ title: e.target.value })}
                      />
                    </div>
                    <div className="wizard-field">
                      <label htmlFor={`${uid}-company`}>
                        Company <span className="wizard-optional">OPTIONAL</span>
                      </label>
                      <input
                        id={`${uid}-company`}
                        type="text"
                        value={data.company}
                        placeholder="e.g. Sewnet / Acme Inc."
                        onChange={(e) => patch({ company: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="wizard-field-row-2">
                    <div className="wizard-field">
                      <label htmlFor={`${uid}-email`}>
                        Email <span className="wizard-optional">OPTIONAL</span>
                      </label>
                      <input
                        id={`${uid}-email`}
                        type="email"
                        value={data.email}
                        autoComplete="email"
                        placeholder="hello@example.com"
                        onChange={(e) => patch({ email: e.target.value })}
                      />
                    </div>
                    <div className="wizard-field">
                      <label htmlFor={`${uid}-phone`}>
                        Phone <span className="wizard-optional">OPTIONAL</span>
                      </label>
                      <input
                        id={`${uid}-phone`}
                        type="tel"
                        value={data.phone}
                        autoComplete="tel"
                        placeholder="+251 91 123 4567"
                        onChange={(e) => patch({ phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="wizard-field">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <label htmlFor={`${uid}-bio`}>Short bio</label>
                      <span
                        className="wizard-bio-counter"
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: data.bio.length >= 135 ? '#e06b24' : '#8f857a',
                        }}
                      >
                        {data.bio.length}/140
                      </span>
                    </div>
                    <textarea
                      id={`${uid}-bio`}
                      rows={3}
                      maxLength={140}
                      value={data.bio}
                      placeholder="Your short bio appears here."
                      onChange={(e) => patch({ bio: e.target.value.slice(0, 140) })}
                    />
                    <span className="wizard-field-hint">
                      Up to 140 characters.
                    </span>
                  </div>
                </>
              )}

              {/* ── STEP 3: Socials & Digital Addresses ──────────── */}
              {step.key === 'socials' && (
                <>
                  <div className="wizard-field-row-2">
                    <div className="wizard-field">
                      <label htmlFor={`${uid}-telegram`}>
                        Telegram <span className="wizard-optional">OPTIONAL</span>
                      </label>
                      <input
                        id={`${uid}-telegram`}
                        type="text"
                        value={data.telegram ?? ''}
                        placeholder="@username"
                        onChange={(e) => patch({ telegram: e.target.value })}
                      />
                    </div>
                    <div className="wizard-field">
                      <label htmlFor={`${uid}-whatsapp`}>
                        WhatsApp <span className="wizard-optional">OPTIONAL</span>
                      </label>
                      <input
                        id={`${uid}-whatsapp`}
                        type="text"
                        value={data.whatsapp ?? ''}
                        placeholder="+251 91 123 4567"
                        onChange={(e) => patch({ whatsapp: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="wizard-field-row-2">
                    <div className="wizard-field">
                      <label htmlFor={`${uid}-linkedin`}>
                        LinkedIn <span className="wizard-optional">OPTIONAL</span>
                      </label>
                      <input
                        id={`${uid}-linkedin`}
                        type="text"
                        value={data.linkedin ?? ''}
                        placeholder="in/yourprofile or URL"
                        onChange={(e) => patch({ linkedin: e.target.value })}
                      />
                    </div>
                    <div className="wizard-field">
                      <label htmlFor={`${uid}-instagram`}>
                        Instagram <span className="wizard-optional">OPTIONAL</span>
                      </label>
                      <input
                        id={`${uid}-instagram`}
                        type="text"
                        value={data.instagram ?? ''}
                        placeholder="@username"
                        onChange={(e) => patch({ instagram: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="wizard-field-row-2">
                    <div className="wizard-field">
                      <label htmlFor={`${uid}-twitter`}>
                        X / Twitter <span className="wizard-optional">OPTIONAL</span>
                      </label>
                      <input
                        id={`${uid}-twitter`}
                        type="text"
                        value={data.twitter ?? ''}
                        placeholder="@handle"
                        onChange={(e) => patch({ twitter: e.target.value })}
                      />
                    </div>
                    <div className="wizard-field">
                      <label htmlFor={`${uid}-website`}>
                        Website <span className="wizard-optional">OPTIONAL</span>
                      </label>
                      <input
                        id={`${uid}-website`}
                        type="text"
                        value={data.website ?? ''}
                        placeholder="yoursite.com"
                        onChange={(e) => patch({ website: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="wizard-field">
                    <label htmlFor={`${uid}-color`}>Card banner color</label>
                    <div className="wizard-color-row">
                      <input
                        id={`${uid}-color`}
                        type="color"
                        value={data.accentColor}
                        onChange={(e) => patch({ accentColor: e.target.value as `#${string}` })}
                      />
                      <div className="wizard-color-swatches" role="group" aria-label="Color presets">
                        {(['#eb6307', '#ea580c', '#191513', '#2563eb', '#0f766e', '#7c3aed'] as const).map((c) => (
                          <button
                            key={c}
                            type="button"
                            className={`color-swatch ${data.accentColor === c ? 'selected' : ''}`}
                            style={{ '--swatch-color': c } as CSSProperties}
                            onClick={() => patch({ accentColor: c })}
                            aria-label={`Color ${c}`}
                            aria-pressed={data.accentColor === c}
                          />
                        ))}
                      </div>
                      <code className="wizard-color-code">{data.accentColor}</code>
                    </div>
                  </div>

                  <div className="wizard-summary">
                    <p className="wizard-summary-label">YOUR DIGITAL NFC CARD INCLUDES</p>
                    <ul>
                      <li><span>↗</span>Address: {data.subdomain || 'your-address'}</li>
                      <li><span>↗</span>Name: {fullName}</li>
                      {(data.title || data.company) && (
                        <li><span>↗</span>{data.title && data.company ? `${data.title} at ${data.company}` : data.title || data.company}</li>
                      )}
                      {data.bio && <li><span>↗</span>Bio ({data.bio.length}/140 chars)</li>}
                      {data.phone && <li><span>↗</span>Call action — {data.phone}</li>}
                      {data.email && <li><span>↗</span>Email action — {data.email}</li>}
                      <li><span>↗</span>Dynamic QR Code &amp; vCard contact download</li>
                    </ul>
                    <p className="wizard-summary-note">Everything can be updated anytime in your workspace.</p>
                  </div>
                </>
              )}
            </div>

            {/* Errors */}
            {(fieldError || error) && (
              <p className="wizard-error" role="alert">{fieldError || error}</p>
            )}

            {/* Navigation */}
            <div className="wizard-nav">
              {stepIndex > 0 && (
                <button type="button" className="wizard-back-btn" onClick={goBack} disabled={busy}>
                  ← Back
                </button>
              )}
              <button
                type="button"
                className="primary-button wizard-next-btn"
                onClick={goNext}
                disabled={!canAdvance() || busy}
                style={{ background: data.accentColor, borderColor: data.accentColor }}
              >
                {busy ? 'Creating your card…' : isLast ? 'Create my digital card →' : 'Continue →'}
              </button>
            </div>
          </div>
        </section>

        {/* Right: live preview matching mockup */}
        <aside className="wizard-preview-col" aria-label="Live preview">
          <div className="wizard-preview-label" style={{ color: '#a89f91', width: '100%', maxWidth: 380 }}>
            <span><i className="preview-dot" style={{ background: data.accentColor }} aria-hidden="true" /> LIVE PREVIEW</span>
            <span>{data.subdomain ? displayUrl : 'preview'}</span>
          </div>

          <div style={{ width: '100%', maxWidth: 380, margin: 'auto 0' }}>
            <DigitalCard
              name={fullName}
              title={data.title}
              company={data.company}
              bio={data.bio}
              phone={data.phone}
              email={data.email}
              socials={previewSocials}
              accentColor={data.accentColor}
              profileUrl={profileUrl}
              displayUrl={displayUrl}
              previewOnly={true}
            />
          </div>
        </aside>
      </div>
    </div>
  )
}

// ─── Helpers used by App.tsx ──────────────────────────────────────────────────

/** Convert wizard data into the standard portfolio blocks array. */
export function wizardDataToBlocks(data: WizardData): PortfolioBlock[] {
  const socials = []
  if (data.telegram?.trim()) {
    const raw = data.telegram.trim()
    const handle = raw.startsWith('@') ? raw : `@${raw}`
    const url = raw.startsWith('http') ? raw : `https://t.me/${raw.replace(/^@/, '')}`
    socials.push({ platform: 'telegram', url, label: 'Telegram', handle })
  }
  if (data.whatsapp?.trim()) {
    const raw = data.whatsapp.trim().replace(/[^0-9+]/g, '')
    const url = `https://wa.me/${raw.replace(/^\+/, '')}`
    socials.push({ platform: 'whatsapp', url, label: 'WhatsApp', handle: raw })
  }
  if (data.linkedin?.trim()) {
    const raw = data.linkedin.trim()
    const handle = raw.includes('linkedin.com') ? raw : `in/${raw.replace(/^in\//, '')}`
    const url = raw.startsWith('http') ? raw : `https://linkedin.com/in/${raw.replace(/^in\//, '')}`
    socials.push({ platform: 'linkedin', url, label: 'LinkedIn', handle })
  }
  if (data.instagram?.trim()) {
    const raw = data.instagram.trim()
    const handle = raw.startsWith('@') ? raw : `@${raw}`
    const url = raw.startsWith('http') ? raw : `https://instagram.com/${raw.replace(/^@/, '')}`
    socials.push({ platform: 'instagram', url, label: 'Instagram', handle })
  }
  if (data.twitter?.trim()) {
    const raw = data.twitter.trim()
    const handle = raw.startsWith('@') ? raw : `@${raw}`
    const url = raw.startsWith('http') ? raw : `https://x.com/${raw.replace(/^@/, '')}`
    socials.push({ platform: 'twitter', url, label: 'X / Twitter', handle })
  }
  if (data.website?.trim()) {
    const raw = data.website.trim()
    const url = raw.startsWith('http') ? raw : `https://${raw}`
    socials.push({ platform: 'website', url, label: 'Website', handle: raw.replace(/^https?:\/\//, '') })
  }

  const fullName = `${data.firstName} ${data.lastName}`.trim() || data.subdomain

  return [
    {
      type: 'hero',
      data: {
        name: fullName,
        tagline: data.title || '',
        company: data.company || '',
        location: 'Addis Ababa, Ethiopia',
        phone: data.phone || '',
        email: data.email || '',
      },
    },
    {
      type: 'about',
      data: {
        title: 'About',
        body: data.bio || '',
      },
    },
    {
      type: 'contact',
      data: {
        email: data.email || '',
        phone: data.phone || '',
        whatsapp: data.whatsapp || data.phone || '',
        telegram: data.telegram || '',
        socials,
      },
    },
  ]
}
