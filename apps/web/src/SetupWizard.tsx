import { useState, useId, useEffect } from 'react'
import type { CSSProperties } from 'react'
import type { PortfolioBlock } from '@amalink/types'
import { DigitalCard } from './DigitalCard'
import type { CardSocial } from './DigitalCard'
import { getPortfolioDomainLabel, getPortfolioSubdomainUrl } from './url-helpers'
import { BrandLogo } from './BrandLogo'
import './SetupWizard.css'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WizardData {
  subdomain: string
  firstName: string
  lastName: string
  title: string
  company: string
  companyLogoUrl?: string
  email: string
  phone: string
  bio: string
  avatarUrl?: string
  location?: string
  website?: string
  telegram?: string
  whatsapp?: string
  linkedin?: string
  instagram?: string
  twitter?: string
  tiktok?: string
  youtube?: string
  github?: string
  facebook?: string
  accentColor: `#${string}`
}

interface SetupWizardProps {
  /** Called when the user finishes. App.tsx creates the portfolio from this data. */
  onFinish: (data: WizardData) => Promise<void>
  /** Check subdomain availability against the API */
  checkSubdomain: (subdomain: string) => Promise<boolean>
  busy: boolean
  error: string
  initialCompanyName?: string
  initialCompanyLogoUrl?: string | null
  initialBrandColor?: string | null
  onSwitchToOrg?: () => void
}

export function SetupWizard({
  onFinish,
  checkSubdomain,
  busy,
  error,
  initialCompanyName,
  initialCompanyLogoUrl,
  initialBrandColor,
  onSwitchToOrg,
}: SetupWizardProps) {
  const [subdomainStatus, setSubdomainStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [fieldError, setFieldError] = useState('')
  const [mobileTab, setMobileTab] = useState<'form' | 'preview'>('form')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string>('')
  const [showMoreSocials, setShowMoreSocials] = useState(false)

  const [data, setData] = useState<WizardData>({
    subdomain: '',
    firstName: '',
    lastName: '',
    title: '',
    company: initialCompanyName || '',
    companyLogoUrl: initialCompanyLogoUrl || '',
    email: '',
    phone: '',
    bio: '',
    avatarUrl: '',
    location: 'Addis Ababa, Ethiopia',
    website: '',
    telegram: '',
    whatsapp: '',
    linkedin: '',
    instagram: '',
    twitter: '',
    tiktok: '',
    youtube: '',
    github: '',
    facebook: '',
    accentColor: (initialBrandColor as `#${string}`) || '#ff3535',
  })

  const uid = useId()

  function patch(update: Partial<WizardData>) {
    setData((d) => ({ ...d, ...update }))
    setFieldError('')
  }

  // ── Debounced Subdomain Availability Check ────────────────────────────────────
  useEffect(() => {
    const val = data.subdomain.trim().toLowerCase()
    if (!val) {
      setSubdomainStatus('idle')
      return
    }

    if (!/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(val)) {
      setSubdomainStatus('idle')
      return
    }

    setSubdomainStatus('checking')
    const timer = setTimeout(async () => {
      try {
        const available = await checkSubdomain(val)
        setSubdomainStatus(available ? 'available' : 'taken')
      } catch {
        setSubdomainStatus('idle')
      }
    }, 350)

    return () => clearTimeout(timer)
  }, [data.subdomain, checkSubdomain])

  // ── Avatar Photo Upload Handler ───────────────────────────────────────────────
  async function handleAvatarUpload(file: File) {
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) {
      setFieldError('Please choose a JPG, PNG, WebP, or AVIF image.')
      return
    }

    setUploadingAvatar(true)
    setFieldError('')

    const reader = new FileReader()
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string
      const img = new Image()
      img.onload = () => {
        const maxDim = 800
        let w = img.width
        let h = img.height
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w)
            w = maxDim
          } else {
            w = Math.round((w * maxDim) / h)
            h = maxDim
          }
        }
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h)
          const isPng = file.type === 'image/png' || file.name.endsWith('.png')
          const finalUrl = canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', 0.9)
          patch({ avatarUrl: finalUrl })
          setAvatarPreviewUrl(finalUrl)
        } else {
          patch({ avatarUrl: rawDataUrl })
          setAvatarPreviewUrl(rawDataUrl)
        }
        setUploadingAvatar(false)
      }
      img.onerror = () => {
        patch({ avatarUrl: rawDataUrl })
        setAvatarPreviewUrl(rawDataUrl)
        setUploadingAvatar(false)
      }
      img.src = rawDataUrl
    }
    reader.onerror = () => {
      setFieldError('Failed to read image file. Please try another image.')
      setUploadingAvatar(false)
    }
    reader.readAsDataURL(file)
  }

  // ── Submission Validation ─────────────────────────────────────────────────────
  const isFormValid =
    data.subdomain.trim().length >= 3 &&
    subdomainStatus === 'available' &&
    data.firstName.trim().length > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!data.subdomain.trim()) {
      setFieldError('Please choose a profile address.')
      setMobileTab('form')
      return
    }
    if (subdomainStatus !== 'available') {
      setFieldError('Please choose an available address before proceeding.')
      setMobileTab('form')
      return
    }
    if (!data.firstName.trim()) {
      setFieldError('Please enter your first name.')
      setMobileTab('form')
      return
    }

    setFieldError('')
    await onFinish(data)
  }

  // Derive preview socials for the live card
  const previewSocials: CardSocial[] = []
  if (data.telegram?.trim()) previewSocials.push({ platform: 'telegram', label: 'Telegram' })
  if (data.whatsapp?.trim() || data.phone?.trim()) previewSocials.push({ platform: 'whatsapp', label: 'WhatsApp' })
  if (data.linkedin?.trim()) previewSocials.push({ platform: 'linkedin', label: 'LinkedIn' })
  if (data.instagram?.trim()) previewSocials.push({ platform: 'instagram', label: 'Instagram' })
  if (data.twitter?.trim()) previewSocials.push({ platform: 'twitter', label: 'X / Twitter' })
  if (data.tiktok?.trim()) previewSocials.push({ platform: 'tiktok', label: 'TikTok' })
  if (data.youtube?.trim()) previewSocials.push({ platform: 'youtube', label: 'YouTube' })
  if (data.github?.trim()) previewSocials.push({ platform: 'github', label: 'GitHub' })
  if (data.facebook?.trim()) previewSocials.push({ platform: 'facebook', label: 'Facebook' })
  if (data.website?.trim()) previewSocials.push({ platform: 'website', label: 'Website' })

  const fullName = `${data.firstName} ${data.lastName}`.trim() || 'Your Name'
  const profileUrl = getPortfolioSubdomainUrl(data.subdomain || 'yourname', false)
  const displayUrl = getPortfolioDomainLabel(data.subdomain || 'yourname')

  return (
    <div className="wizard-shell">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <header className="wizard-header">
        <div className="wizard-brand">
          <BrandLogo variant="wizard" />
        </div>
        <div className="wizard-header-title">
          <span>Smart NFC Card Setup</span>
        </div>
      </header>

      {/* ── Mode Switcher: Switch to Organization Brand Setup ──────── */}
      {onSwitchToOrg && (
        <div className="wizard-mode-banner">
          <div className="wizard-mode-content">
            <span className="wizard-mode-label">Looking to set up for a company or business?</span>
            <button
              type="button"
              className="wizard-mode-switch-btn"
              onClick={onSwitchToOrg}
            >
              🏢 Switch to Organization Brand Setup (Business &amp; Enterprise) →
            </button>
          </div>
        </div>
      )}

      {/* ── Mobile Viewport Switcher (<= 840px) ────────────────────── */}
      <div className="wizard-mobile-toggle-bar">
        <button
          type="button"
          className={`wizard-mobile-toggle-btn ${mobileTab === 'form' ? 'active' : ''}`}
          onClick={() => setMobileTab('form')}
        >
          ✎ 1. Profile Details
        </button>
        <button
          type="button"
          className={`wizard-mobile-toggle-btn ${mobileTab === 'preview' ? 'active' : ''}`}
          onClick={() => setMobileTab('preview')}
        >
          👁️ 2. Live Card Preview
        </button>
      </div>

      {/* ── Two-Column Layout: Form + Live Card Preview ────────────── */}
      <div className="wizard-body">
        {/* Left: Streamlined Creation Form */}
        <section
          className={`wizard-form-col ${mobileTab === 'preview' ? 'wizard-mobile-hidden' : ''}`}
          aria-label="Create your digital card"
        >
          <div className="wizard-form-inner">
            <div className="wizard-form-intro">
              <span className="wizard-eyebrow">PORTFOLIO REGISTRATION</span>
              <h1 className="wizard-headline">Create your digital card.</h1>
              <p className="wizard-sub">
                Fill in your details to activate your personal tap-to-share card and instant phonebook contact sync.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="wizard-fields">
              {/* ── 1. Profile Address (Domain) ──────────────────── */}
              <div className="wizard-form-section">
                <div className="wizard-section-header">
                  <span className="section-step-num">01</span>
                  <div>
                    <h3 className="section-step-title">Your Profile Address</h3>
                    <p className="section-step-sub">This is your unique link for NFC taps and QR scanning.</p>
                  </div>
                </div>

                <div className="wizard-field">
                  <div className="wizard-domain-bar">
                    <span className="domain-protocol">https://</span>
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
                      }}
                      className="wizard-domain-input"
                    />
                    <span className="domain-suffix">
                      {typeof window !== 'undefined' && window.location.hostname.endsWith('localhost')
                        ? '.localhost:5173'
                        : '.koo-link.com'}
                    </span>
                    <div className="domain-status-badge">
                      {subdomainStatus === 'checking' && (
                        <span className="domain-badge checking">⟳ Checking…</span>
                      )}
                      {subdomainStatus === 'available' && (
                        <span className="domain-badge available">✓ Available</span>
                      )}
                      {subdomainStatus === 'taken' && (
                        <span className="domain-badge taken">✗ Already taken</span>
                      )}
                    </div>
                  </div>
                  <span className="wizard-field-hint">
                    Use 3–30 lowercase letters, numbers, or hyphens.
                  </span>
                </div>
              </div>

              {/* ── 2. Profile Photo & Identity ───────────────────── */}
              <div className="wizard-form-section">
                <div className="wizard-section-header">
                  <span className="section-step-num">02</span>
                  <div>
                    <h3 className="section-step-title">Profile Photo &amp; Role</h3>
                    <p className="section-step-sub">Visual portrait synced to smartphone contacts.</p>
                  </div>
                </div>

                {/* Avatar Uploader Box */}
                <div className="wizard-avatar-uploader">
                  <div className="wizard-avatar-preview-box">
                    {avatarPreviewUrl || data.avatarUrl ? (
                      <img
                        src={avatarPreviewUrl || data.avatarUrl}
                        alt="Profile avatar preview"
                        className="wizard-avatar-preview-img"
                      />
                    ) : (
                      <div className="wizard-avatar-empty">
                        <span>{data.firstName ? data.firstName[0].toUpperCase() : '✦'}</span>
                      </div>
                    )}
                  </div>

                  <div className="wizard-avatar-actions">
                    <label className="secondary-button wizard-avatar-btn">
                      {uploadingAvatar
                        ? 'Uploading photo…'
                        : data.avatarUrl
                        ? 'Change photo'
                        : 'Upload profile photo'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        disabled={uploadingAvatar}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) void handleAvatarUpload(file)
                          e.target.value = ''
                        }}
                        style={{ display: 'none' }}
                      />
                    </label>
                    <span className="wizard-field-hint">
                      Recommended: Square or portrait image (JPG, PNG, WebP).
                    </span>
                  </div>
                </div>

                <div className="wizard-field-row-2" style={{ marginTop: 16 }}>
                  <div className="wizard-field">
                    <label htmlFor={`${uid}-fname`}>First name *</label>
                    <input
                      id={`${uid}-fname`}
                      type="text"
                      value={data.firstName}
                      autoComplete="given-name"
                      placeholder="e.g. Robba"
                      onChange={(e) => patch({ firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="wizard-field">
                    <label htmlFor={`${uid}-lname`}>Last name</label>
                    <input
                      id={`${uid}-lname`}
                      type="text"
                      value={data.lastName}
                      autoComplete="family-name"
                      placeholder="e.g. Bayisa"
                      onChange={(e) => patch({ lastName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="wizard-field-row-2">
                  <div className="wizard-field">
                    <label htmlFor={`${uid}-title`}>Job Title / Designation</label>
                    <input
                      id={`${uid}-title`}
                      type="text"
                      value={data.title}
                      placeholder="e.g. Founder &amp; CEO"
                      onChange={(e) => patch({ title: e.target.value })}
                    />
                  </div>
                  <div className="wizard-field">
                    <label htmlFor={`${uid}-company`}>Company / Organization</label>
                    <input
                      id={`${uid}-company`}
                      type="text"
                      value={data.company}
                      placeholder="e.g. Koolink Digital"
                      onChange={(e) => patch({ company: e.target.value })}
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
                        color: data.bio.length >= 135 ? '#ff3535' : '#8f857a',
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
                    placeholder="Brief intro about what you do (up to 140 characters)."
                    onChange={(e) => patch({ bio: e.target.value.slice(0, 140) })}
                  />
                </div>
              </div>

              {/* ── 3. Direct Contact Details ─────────────────────── */}
              <div className="wizard-form-section">
                <div className="wizard-section-header">
                  <span className="section-step-num">03</span>
                  <div>
                    <h3 className="section-step-title">Direct Contact Channels</h3>
                    <p className="section-step-sub">Synced into client phones when your card is tapped.</p>
                  </div>
                </div>

                <div className="wizard-field-row-2">
                  <div className="wizard-field">
                    <label htmlFor={`${uid}-phone`}>Phone number (Call &amp; vCard)</label>
                    <input
                      id={`${uid}-phone`}
                      type="tel"
                      inputMode="tel"
                      value={data.phone}
                      autoComplete="tel"
                      placeholder="+251 91 123 4567"
                      onChange={(e) => patch({ phone: e.target.value })}
                    />
                  </div>
                  <div className="wizard-field">
                    <label htmlFor={`${uid}-email`}>Email address</label>
                    <input
                      id={`${uid}-email`}
                      type="email"
                      inputMode="email"
                      value={data.email}
                      autoComplete="email"
                      placeholder="you@domain.com"
                      onChange={(e) => patch({ email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="wizard-field-row-2">
                  <div className="wizard-field">
                    <label htmlFor={`${uid}-website`}>Website URL <span className="wizard-optional">OPTIONAL</span></label>
                    <input
                      id={`${uid}-website`}
                      type="url"
                      inputMode="url"
                      value={data.website ?? ''}
                      placeholder="https://yourcompany.com"
                      onChange={(e) => patch({ website: e.target.value })}
                    />
                  </div>
                  <div className="wizard-field">
                    <label htmlFor={`${uid}-location`}>Location / City <span className="wizard-optional">OPTIONAL</span></label>
                    <input
                      id={`${uid}-location`}
                      type="text"
                      value={data.location ?? ''}
                      placeholder="Addis Ababa, Ethiopia"
                      onChange={(e) => patch({ location: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* ── 4. Social & Messaging Networks ────────────────── */}
              <div className="wizard-form-section">
                <div className="wizard-section-header">
                  <span className="section-step-num">04</span>
                  <div>
                    <h3 className="section-step-title">Social &amp; Messaging Links <span className="wizard-optional">OPTIONAL</span></h3>
                    <p className="section-step-sub">Add your active networking profiles.</p>
                  </div>
                </div>

                <div className="wizard-field-row-2">
                  <div className="wizard-field">
                    <label htmlFor={`${uid}-telegram`}>Telegram</label>
                    <input
                      id={`${uid}-telegram`}
                      type="text"
                      value={data.telegram ?? ''}
                      placeholder="@username"
                      onChange={(e) => patch({ telegram: e.target.value })}
                    />
                  </div>
                  <div className="wizard-field">
                    <label htmlFor={`${uid}-whatsapp`}>WhatsApp</label>
                    <input
                      id={`${uid}-whatsapp`}
                      type="tel"
                      inputMode="tel"
                      value={data.whatsapp ?? ''}
                      placeholder="+251 91 123 4567"
                      onChange={(e) => patch({ whatsapp: e.target.value })}
                    />
                  </div>
                </div>

                <div className="wizard-field-row-2">
                  <div className="wizard-field">
                    <label htmlFor={`${uid}-linkedin`}>LinkedIn</label>
                    <input
                      id={`${uid}-linkedin`}
                      type="text"
                      value={data.linkedin ?? ''}
                      placeholder="in/yourprofile or URL"
                      onChange={(e) => patch({ linkedin: e.target.value })}
                    />
                  </div>
                  <div className="wizard-field">
                    <label htmlFor={`${uid}-instagram`}>Instagram</label>
                    <input
                      id={`${uid}-instagram`}
                      type="text"
                      value={data.instagram ?? ''}
                      placeholder="@username"
                      onChange={(e) => patch({ instagram: e.target.value })}
                    />
                  </div>
                </div>

                {showMoreSocials ? (
                  <div className="wizard-more-socials-group">
                    <div className="wizard-field-row-2">
                      <div className="wizard-field">
                        <label htmlFor={`${uid}-twitter`}>X / Twitter</label>
                        <input
                          id={`${uid}-twitter`}
                          type="text"
                          value={data.twitter ?? ''}
                          placeholder="@username"
                          onChange={(e) => patch({ twitter: e.target.value })}
                        />
                      </div>
                      <div className="wizard-field">
                        <label htmlFor={`${uid}-tiktok`}>TikTok</label>
                        <input
                          id={`${uid}-tiktok`}
                          type="text"
                          value={data.tiktok ?? ''}
                          placeholder="@username"
                          onChange={(e) => patch({ tiktok: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="wizard-field-row-2">
                      <div className="wizard-field">
                        <label htmlFor={`${uid}-youtube`}>YouTube</label>
                        <input
                          id={`${uid}-youtube`}
                          type="text"
                          value={data.youtube ?? ''}
                          placeholder="@channel or URL"
                          onChange={(e) => patch({ youtube: e.target.value })}
                        />
                      </div>
                      <div className="wizard-field">
                        <label htmlFor={`${uid}-github`}>GitHub</label>
                        <input
                          id={`${uid}-github`}
                          type="text"
                          value={data.github ?? ''}
                          placeholder="username"
                          onChange={(e) => patch({ github: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="secondary-button wizard-show-more-btn"
                    onClick={() => setShowMoreSocials(true)}
                  >
                    + Add TikTok, YouTube, GitHub, or X
                  </button>
                )}
              </div>

              {/* ── 5. Card Accent Color ──────────────────────────── */}
              <div className="wizard-form-section">
                <div className="wizard-section-header">
                  <span className="section-step-num">05</span>
                  <div>
                    <h3 className="section-step-title">Card Banner Color</h3>
                    <p className="section-step-sub">Pick your signature accent tone.</p>
                  </div>
                </div>

                <div className="wizard-color-row">
                  <input
                    id={`${uid}-color`}
                    type="color"
                    value={data.accentColor}
                    onChange={(e) => patch({ accentColor: e.target.value as `#${string}` })}
                  />
                  <div className="wizard-color-swatches" role="group" aria-label="Color presets">
                    {(['#ff3535', '#e52e2e', '#191513', '#2563eb', '#0f766e', '#7c3aed'] as const).map((c) => (
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

              {/* Errors */}
              {(fieldError || error) && (
                <p className="wizard-error" role="alert">{fieldError || error}</p>
              )}

              {/* Submit CTA */}
              <div className="wizard-submit-wrap">
                <button
                  type="submit"
                  className="primary-button wizard-submit-btn"
                  disabled={!isFormValid || busy}
                  style={{ background: data.accentColor, borderColor: data.accentColor }}
                >
                  {busy ? 'Saving your profile…' : 'Save profile and review →'}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Right: Live Digital Card Preview */}
        <aside
          className={`wizard-preview-col ${mobileTab === 'form' ? 'wizard-mobile-hidden' : ''}`}
          aria-label="Live preview"
        >
          <div className="wizard-preview-label" style={{ color: '#a89f91', width: '100%', maxWidth: 380 }}>
            <span><i className="preview-dot" style={{ background: data.accentColor }} aria-hidden="true" /> LIVE PREVIEW (TEST SCAN)</span>
            <span>{data.subdomain ? displayUrl : 'preview'}</span>
          </div>

          <div style={{ width: '100%', maxWidth: 380, margin: 'auto 0' }}>
            <DigitalCard
              name={fullName}
              title={data.title}
              company={data.company}
              companyLogoUrl={data.companyLogoUrl}
              bio={data.bio}
              avatarUrl={avatarPreviewUrl || data.avatarUrl}
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

// ─── Helper: Convert WizardData to Portfolio Blocks ───────────────────────────

export function wizardDataToBlocks(data: WizardData): PortfolioBlock[] {
  const socials: Array<{ platform: string; url: string; label: string; handle: string }> = []

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
  if (data.tiktok?.trim()) {
    const raw = data.tiktok.trim()
    const handle = raw.startsWith('@') ? raw : `@${raw}`
    const url = raw.startsWith('http') ? raw : `https://tiktok.com/@${raw.replace(/^@/, '')}`
    socials.push({ platform: 'tiktok', url, label: 'TikTok', handle })
  }
  if (data.youtube?.trim()) {
    const raw = data.youtube.trim()
    const handle = raw.startsWith('@') ? raw : `@${raw}`
    const url = raw.startsWith('http') ? raw : `https://youtube.com/${raw.startsWith('@') ? raw : `@${raw}`}`
    socials.push({ platform: 'youtube', url, label: 'YouTube', handle })
  }
  if (data.github?.trim()) {
    const raw = data.github.trim()
    const handle = raw.startsWith('@') ? raw.slice(1) : raw
    const url = raw.startsWith('http') ? raw : `https://github.com/${handle}`
    socials.push({ platform: 'github', url, label: 'GitHub', handle })
  }
  if (data.facebook?.trim()) {
    const raw = data.facebook.trim()
    const url = raw.startsWith('http') ? raw : `https://facebook.com/${raw}`
    socials.push({ platform: 'facebook', url, label: 'Facebook', handle: raw })
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
        companyLogoUrl: data.companyLogoUrl || '',
        location: data.location || 'Addis Ababa, Ethiopia',
        phone: data.phone || '',
        email: data.email || '',
        avatarUrl: data.avatarUrl || '',
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
        website: data.website || '',
        location: data.location || '',
        whatsapp: data.whatsapp || data.phone || '',
        telegram: data.telegram || '',
        socials,
      },
    },
  ]
}
