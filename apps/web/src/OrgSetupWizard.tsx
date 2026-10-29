import { useState, useId, useEffect } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import type { NfcCardTier, UserProfile } from '@amalink/types'
import { BrandLogo } from './BrandLogo'
import { DigitalCard } from './DigitalCard'
import { resolveMediaUrl } from './config'
import { getPortfolioDomainLabel, getPortfolioSubdomainUrl } from './url-helpers'
import './OrgSetupWizard.css'

export interface OrgWizardData {
  companyName: string
  subdomain: string
  companyLogoUrl: string
  brandColor: string
  customerType: NfcCardTier
  tagline: string
  phone: string
  email: string
  website: string
  location: string
  bio: string
}

interface OrgSetupWizardProps {
  user: UserProfile
  onFinish: (data: OrgWizardData) => Promise<void>
  checkSubdomain: (subdomain: string) => Promise<boolean>
  busy: boolean
  error: string
  onSkip?: () => void
  onSwitchToIndividual?: () => void
}

const BRAND_PALETTES = [
  { name: 'Matte Obsidian', value: '#0e0e11' },
  { name: 'Sapphire Blue', value: '#2563eb' },
  { name: 'Emerald Green', value: '#059669' },
  { name: 'Midnight Navy', value: '#0a101d' },
  { name: 'Crimson Red', value: '#dc2626' },
  { name: 'Royal Purple', value: '#7c3aed' },
  { name: 'Amber Gold', value: '#d97706' },
  { name: 'Titanium Slate', value: '#1c1e22' },
]

export function OrgSetupWizard({
  user,
  onFinish,
  checkSubdomain,
  busy,
  error,
  onSkip,
  onSwitchToIndividual,
}: OrgSetupWizardProps) {
  const [mobileTab, setMobileTab] = useState<'form' | 'preview'>('form')
  const [subdomainStatus, setSubdomainStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [fieldError, setFieldError] = useState('')

  // Derive initial subdomain suggestion from company name or user name
  const rawSubInitial = (user.companyName || user.name || 'organization')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20)

  const initialTier: NfcCardTier = (user.customerType && user.customerType !== 'individual') ? user.customerType : 'business'

  const [data, setData] = useState<OrgWizardData>({
    companyName: user.companyName || '',
    subdomain: rawSubInitial || 'org',
    companyLogoUrl: user.companyLogoUrl || '',
    brandColor: user.brandColor || '#0e0e11',
    customerType: initialTier,
    tagline: 'Official Corporate Workspace & Executive Contact',
    phone: user.phoneNumber || '',
    email: user.email || '',
    website: '',
    location: 'Addis Ababa, Ethiopia',
    bio: `${user.companyName || 'Our organization'} delivers premium contactless digital smart business cards with unified company branding across all team members.`,
  })

  const uid = useId()

  function patch(update: Partial<OrgWizardData>) {
    setData((cur) => ({ ...cur, ...update }))
    setFieldError('')
  }

  // Debounced Subdomain Check
  useEffect(() => {
    const raw = data.subdomain.trim()
    if (!raw || raw.length < 3) {
      setSubdomainStatus('idle')
      return
    }
    setSubdomainStatus('checking')
    let isCurrent = true
    const timer = setTimeout(async () => {
      try {
        const ok = await checkSubdomain(raw)
        if (isCurrent) setSubdomainStatus(ok ? 'available' : 'taken')
      } catch {
        if (isCurrent) setSubdomainStatus('idle')
      }
    }, 400)

    return () => {
      isCurrent = false
      clearTimeout(timer)
    }
  }, [data.subdomain, checkSubdomain])

  // Logo file upload handler with canvas optimization
  function handleLogoUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setFieldError('Please select a valid image file (PNG, SVG, JPG, WEBP).')
      return
    }

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
          patch({ companyLogoUrl: finalUrl })
        } else {
          patch({ companyLogoUrl: rawDataUrl })
        }
      }
      img.onerror = () => patch({ companyLogoUrl: rawDataUrl })
      img.src = rawDataUrl
    }
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!data.companyName.trim()) {
      setFieldError('Please enter your organization or company name.')
      setMobileTab('form')
      return
    }
    if (!data.subdomain.trim() || data.subdomain.trim().length < 3) {
      setFieldError('Please choose a valid workspace address (at least 3 characters).')
      setMobileTab('form')
      return
    }
    if (subdomainStatus === 'taken') {
      setFieldError('The chosen address is already taken. Please choose another.')
      setMobileTab('form')
      return
    }

    setFieldError('')
    await onFinish(data)
  }

  const tierLabel = data.customerType
    ? data.customerType === 'business'
      ? 'S&M Business (5–19 Cards)'
      : data.customerType === 'enterprise'
        ? 'Enterprise (20–49 Cards)'
        : 'Corporate Organization (50+ Cards)'
    : 'Organization Workspace'

  const profileUrl = getPortfolioSubdomainUrl(data.subdomain || 'company', false)
  const displayUrl = getPortfolioDomainLabel(data.subdomain || 'company')

  return (
    <div className="org-wizard-shell">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <header className="org-wizard-header">
        <div className="org-wizard-brand">
          <BrandLogo variant="wizard" />
          <span className="org-wizard-tier-tag">{tierLabel}</span>
        </div>
        {onSkip && (
          <button type="button" className="org-wizard-skip-btn" onClick={onSkip}>
            Skip to Dashboard →
          </button>
        )}
      </header>

      {/* ── Mode Switcher: Switch to Individual Personal Card ──────── */}
      {onSwitchToIndividual && (
        <div className="wizard-mode-banner">
          <div className="wizard-mode-content">
            <span className="wizard-mode-label">Looking to create a single personal portfolio card instead?</span>
            <button
              type="button"
              className="wizard-mode-switch-btn"
              onClick={onSwitchToIndividual}
            >
              👤 Switch to Individual Personal Card →
            </button>
          </div>
        </div>
      )}

      {/* ── Mobile Viewport Switcher ──────────────────────────────── */}
      <div className="org-wizard-mobile-toggle-bar">
        <button
          type="button"
          className={`org-wizard-mobile-toggle-btn ${mobileTab === 'form' ? 'active' : ''}`}
          onClick={() => setMobileTab('form')}
        >
          ✎ 1. Brand Configuration
        </button>
        <button
          type="button"
          className={`org-wizard-mobile-toggle-btn ${mobileTab === 'preview' ? 'active' : ''}`}
          onClick={() => setMobileTab('preview')}
        >
          👁️ 2. Organization Card Preview
        </button>
      </div>

      {/* ── Body Grid ─────────────────────────────────────────────── */}
      <div className="org-wizard-body">
        {/* Left Column: Common Brand Setup Form */}
        <section
          className={`org-wizard-form-col ${mobileTab === 'preview' ? 'org-wizard-mobile-hidden' : ''}`}
        >
          <div className="org-wizard-form-inner">
            <div className="org-wizard-intro">
              <span className="org-wizard-eyebrow">ORGANIZATION ONBOARDING</span>
              <h1 className="org-wizard-headline">Configure your common brand.</h1>
              <p className="org-wizard-sub">
                Instead of creating a single personal card, configure your company’s shared logo, primary color, and contact identity. All employee smart cards will automatically inherit these assets.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="org-wizard-fields">
              {/* ── Section 1: Organization Identity & Subdomain ── */}
              <div className="org-wizard-section">
                <div className="org-section-header">
                  <span className="org-section-num">01</span>
                  <div>
                    <h3 className="org-section-title">Organization Identity &amp; Link</h3>
                    <p className="org-section-sub">Your master company handle and branded public presence.</p>
                  </div>
                </div>

                <div className="org-field">
                  <label className="org-label" htmlFor={`${uid}-companyName`}>
                    <span>Company / Organization Name *</span>
                  </label>
                  <input
                    id={`${uid}-companyName`}
                    type="text"
                    className="org-input"
                    value={data.companyName}
                    autoFocus
                    onChange={(e) => patch({ companyName: e.target.value })}
                    placeholder="e.g. Commercial Bank of Ethiopia, Ethio Telecom"
                  />
                </div>

                <div className="org-field">
                  <label className="org-label">
                    <span>Organization Account Tier</span>
                    <span className="opt">Select card package volume</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
                    {[
                      { id: 'business', label: 'S&M Business', meta: '5–19 Cards' },
                      { id: 'enterprise', label: 'Enterprise', meta: '20–49 Cards' },
                      { id: 'corporate', label: 'Corporate', meta: '50+ Cards' },
                    ].map((tier) => (
                      <button
                        key={tier.id}
                        type="button"
                        style={{
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: data.customerType === tier.id ? '2px solid #0284c7' : '1px solid #cbd5e1',
                          background: data.customerType === tier.id ? '#f0f9ff' : '#ffffff',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                        onClick={() => patch({ customerType: tier.id as NfcCardTier })}
                      >
                        <strong style={{ display: 'block', fontSize: 13, color: '#0f172a' }}>{tier.label}</strong>
                        <span style={{ fontSize: 11, color: '#64748b' }}>{tier.meta}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="org-field">
                  <label className="org-label" htmlFor={`${uid}-subdomain`}>
                    <span>Branded Workspace Address *</span>
                    <span className="opt">Unique live subdomain</span>
                  </label>
                  <div className="org-domain-bar">
                    <span className="org-domain-protocol">https://</span>
                    <input
                      id={`${uid}-subdomain`}
                      type="text"
                      className="org-domain-input"
                      value={data.subdomain}
                      maxLength={30}
                      autoCapitalize="none"
                      autoComplete="off"
                      spellCheck={false}
                      onChange={(e) => {
                        const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                        patch({ subdomain: val })
                      }}
                      placeholder="company"
                    />
                    <span className="org-domain-suffix">
                      {typeof window !== 'undefined' && window.location.hostname.endsWith('localhost')
                        ? '.localhost:5173'
                        : '.koo-link.com'}
                    </span>
                  </div>
                  <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    {subdomainStatus === 'checking' && <span style={{ color: '#64748b' }}>⟳ Checking availability…</span>}
                    {subdomainStatus === 'available' && <span style={{ color: '#059669', fontWeight: 600 }}>✓ Address available</span>}
                    {subdomainStatus === 'taken' && <span style={{ color: '#dc2626', fontWeight: 600 }}>✗ Already taken</span>}
                  </div>
                </div>

                <div className="org-field">
                  <label className="org-label" htmlFor={`${uid}-tagline`}>
                    <span>Company Tagline / Industry <span className="opt">OPTIONAL</span></span>
                  </label>
                  <input
                    id={`${uid}-tagline`}
                    type="text"
                    className="org-input"
                    value={data.tagline}
                    onChange={(e) => patch({ tagline: e.target.value })}
                    placeholder="e.g. Technology Solutions & Financial Infrastructure"
                  />
                </div>
              </div>

              {/* ── Section 2: Official Company Logo ── */}
              <div className="org-wizard-section">
                <div className="org-section-header">
                  <span className="org-section-num">02</span>
                  <div>
                    <h3 className="org-section-title">Official Company Logo</h3>
                    <p className="org-section-sub">
                      Uploaded once, this logo appears on every employee digital card and CR80 executive print.
                    </p>
                  </div>
                </div>

                <div className="org-logo-upload-card">
                  <div className="org-logo-preview-frame">
                    {data.companyLogoUrl ? (
                      <img src={resolveMediaUrl(data.companyLogoUrl)} alt="Company Logo Preview" />
                    ) : (
                      <span className="org-logo-empty-icon">🏢</span>
                    )}
                  </div>
                  <div className="org-logo-action-meta">
                    <label className="org-upload-btn-label">
                      <span>📁 Upload Vector / High-Res Logo</span>
                      <input
                        type="file"
                        accept="image/png,image/svg+xml,image/jpeg,image/webp"
                        onChange={handleLogoUpload}
                      />
                    </label>
                    {data.companyLogoUrl && (
                      <button
                        type="button"
                        className="org-remove-logo-btn"
                        onClick={() => patch({ companyLogoUrl: '' })}
                      >
                        Remove Logo
                      </button>
                    )}
                    <p className="org-logo-hint">
                      Supported: Transparent PNG, SVG, or high-resolution JPEG. Auto-scaled for crisp UV card printing.
                    </p>
                  </div>
                </div>

                <div className="org-field">
                  <label className="org-label" htmlFor={`${uid}-logoUrl`}>
                    <span>Or Logo Image Direct URL <span className="opt">OPTIONAL</span></span>
                  </label>
                  <input
                    id={`${uid}-logoUrl`}
                    type="url"
                    className="org-input"
                    value={data.companyLogoUrl.startsWith('data:') ? '' : data.companyLogoUrl}
                    onChange={(e) => patch({ companyLogoUrl: e.target.value })}
                    placeholder="https://yourcompany.com/logo.png"
                  />
                </div>
              </div>

              {/* ── Section 3: Executive Brand Accent Color ── */}
              <div className="org-wizard-section">
                <div className="org-section-header">
                  <span className="org-section-num">03</span>
                  <div>
                    <h3 className="org-section-title">Primary Brand Color &amp; Palette</h3>
                    <p className="org-section-sub">Sets the accent highlights, card badges, and corporate buttons.</p>
                  </div>
                </div>

                <div className="org-palette-grid">
                  {BRAND_PALETTES.map((pal) => (
                    <button
                      key={pal.value}
                      type="button"
                      className={`org-color-swatch ${data.brandColor.toLowerCase() === pal.value.toLowerCase() ? 'active' : ''}`}
                      style={{ backgroundColor: pal.value }}
                      onClick={() => patch({ brandColor: pal.value })}
                      title={pal.name}
                    />
                  ))}
                  <div className="org-custom-color-wrap">
                    <input
                      type="color"
                      className="org-native-color-picker"
                      value={data.brandColor.startsWith('#') && data.brandColor.length === 7 ? data.brandColor : '#0e0e11'}
                      onChange={(e) => patch({ brandColor: e.target.value })}
                    />
                    <input
                      type="text"
                      className="org-input"
                      style={{ width: 85, height: 30, padding: '0 6px', fontSize: 12 }}
                      value={data.brandColor}
                      onChange={(e) => patch({ brandColor: e.target.value })}
                      placeholder="#0e0e11"
                    />
                  </div>
                </div>
              </div>

              {/* ── Section 4: Headquarters Contact & Credentials ── */}
              <div className="org-wizard-section">
                <div className="org-section-header">
                  <span className="org-section-num">04</span>
                  <div>
                    <h3 className="org-section-title">Headquarters Contacts &amp; Location</h3>
                    <p className="org-section-sub">Company-wide contact information displayed on the card footer.</p>
                  </div>
                </div>

                <div className="org-field-row">
                  <div className="org-field">
                    <label className="org-label" htmlFor={`${uid}-phone`}>
                      <span>HQ Office Phone <span className="opt">OPTIONAL</span></span>
                    </label>
                    <input
                      id={`${uid}-phone`}
                      type="tel"
                      className="org-input"
                      value={data.phone}
                      onChange={(e) => patch({ phone: e.target.value })}
                      placeholder="+251 11 123 4567"
                    />
                  </div>
                  <div className="org-field">
                    <label className="org-label" htmlFor={`${uid}-email`}>
                      <span>Official Company Email <span className="opt">OPTIONAL</span></span>
                    </label>
                    <input
                      id={`${uid}-email`}
                      type="email"
                      className="org-input"
                      value={data.email}
                      onChange={(e) => patch({ email: e.target.value })}
                      placeholder="contact@company.com"
                    />
                  </div>
                </div>

                <div className="org-field-row">
                  <div className="org-field">
                    <label className="org-label" htmlFor={`${uid}-website`}>
                      <span>Official Website <span className="opt">OPTIONAL</span></span>
                    </label>
                    <input
                      id={`${uid}-website`}
                      type="url"
                      className="org-input"
                      value={data.website}
                      onChange={(e) => patch({ website: e.target.value })}
                      placeholder="https://company.com"
                    />
                  </div>
                  <div className="org-field">
                    <label className="org-label" htmlFor={`${uid}-location`}>
                      <span>Headquarters Location <span className="opt">OPTIONAL</span></span>
                    </label>
                    <input
                      id={`${uid}-location`}
                      type="text"
                      className="org-input"
                      value={data.location}
                      onChange={(e) => patch({ location: e.target.value })}
                      placeholder="Bole, Addis Ababa, Ethiopia"
                    />
                  </div>
                </div>

                <div className="org-field">
                  <label className="org-label" htmlFor={`${uid}-bio`}>
                    <span>Organization Overview <span className="opt">OPTIONAL</span></span>
                  </label>
                  <textarea
                    id={`${uid}-bio`}
                    className="org-textarea"
                    value={data.bio}
                    onChange={(e) => patch({ bio: e.target.value })}
                    placeholder="Brief 1-2 sentence description of your organization..."
                  />
                </div>
              </div>

              {/* Error Notice */}
              {(fieldError || error) && (
                <div className="notice error-notice" role="alert" style={{ marginTop: 8 }}>
                  {fieldError || error}
                </div>
              )}

              {/* Submit Button */}
              <div className="org-submit-bar">
                <button
                  type="submit"
                  className="org-btn-submit"
                  disabled={busy || subdomainStatus === 'checking' || subdomainStatus === 'taken'}
                >
                  {busy ? 'Configuring Organization…' : '✓ Save Brand & Launch Workspace →'}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Right Column: Live Sticky Card Preview */}
        <aside
          className={`org-wizard-preview-col ${mobileTab === 'form' ? 'org-wizard-mobile-hidden' : ''}`}
        >
          <div className="org-preview-sticky-wrap">
            <div className="org-preview-top-badge">
              <span>LIVE CARD PREVIEW</span>
              <span>{displayUrl}</span>
            </div>

            <div className="org-preview-card-frame">
              <DigitalCard
                name={data.companyName || 'Your Organization'}
                title={data.tagline || 'Official Smart Card Presence'}
                company={data.companyName}
                companyLogoUrl={data.companyLogoUrl}
                bio={data.bio}
                phone={data.phone}
                email={data.email}
                accentColor={data.brandColor}
                profileUrl={profileUrl}
                displayUrl={displayUrl}
                previewOnly
                socials={
                  data.website
                    ? [{ platform: 'website', url: data.website, label: 'Official Website' }]
                    : []
                }
              />
            </div>

            <div className="org-preview-promise-box">
              <span className="org-promise-icon">✨</span>
              <div className="org-promise-content">
                <strong>Unified Team Branding Guarantee</strong>
                <p>
                  When you invite members or create new cards, your official logo, brand color, and credentials will be pre-configured on every profile.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
