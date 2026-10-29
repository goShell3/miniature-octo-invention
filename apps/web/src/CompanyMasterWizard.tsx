import { useState, useId, useEffect } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import type { NfcCardTier, UserProfile } from '@amalink/types'
import { BrandLogo } from './BrandLogo'
import { DigitalCard } from './DigitalCard'
import { resolveMediaUrl } from './config'
import { getPortfolioDomainLabel, getPortfolioSubdomainUrl } from './url-helpers'
import './CompanyMasterWizard.css'

export interface CompanyMasterData {
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

interface CompanyMasterWizardProps {
  user: UserProfile
  onFinish: (data: CompanyMasterData) => Promise<void>
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

export function CompanyMasterWizard({
  user,
  onFinish,
  checkSubdomain,
  busy,
  error,
  onSkip,
  onSwitchToIndividual,
}: CompanyMasterWizardProps) {
  const [mobileTab, setMobileTab] = useState<'form' | 'preview'>('form')
  const [subdomainStatus, setSubdomainStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [fieldError, setFieldError] = useState('')

  const initialTier: NfcCardTier =
    user.customerType && user.customerType !== 'individual'
      ? user.customerType
      : 'business'

  const rawSubInitial = (user.companyName || user.name || 'company')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20)

  const [data, setData] = useState<CompanyMasterData>({
    companyName: user.companyName || '',
    subdomain: rawSubInitial || 'company',
    companyLogoUrl: user.companyLogoUrl || '',
    brandColor: user.brandColor || '#0e0e11',
    customerType: initialTier,
    tagline: 'Official Corporate Presence & Executive Contact',
    phone: user.phoneNumber || '',
    email: user.email || '',
    website: '',
    location: 'Addis Ababa, Ethiopia',
    bio: `${user.companyName || 'Our company'} provides premium contactless digital cards with unified team branding across all members.`,
  })

  const uid = useId()

  function patch(update: Partial<CompanyMasterData>) {
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

  // In-browser canvas image scaler for high-resolution logos
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
      setFieldError('Please enter your official organization or company name.')
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
    <div className="company-wizard-shell">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <header className="company-wizard-header">
        <div className="company-wizard-brand">
          <BrandLogo variant="wizard" />
          <span className="company-wizard-tier-tag">{tierLabel}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="company-wizard-step-pill">Step 1 of 2: Company Portfolio</span>
          {onSkip && (
            <button type="button" className="secondary-button" style={{ height: 32, fontSize: 12 }} onClick={onSkip}>
              Skip to Dashboard →
            </button>
          )}
        </div>
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
              Switch to Individual Personal Card →
            </button>
          </div>
        </div>
      )}

      {/* ── Mobile Viewport Switcher ──────────────────────────────── */}
      <div className="company-wizard-mobile-toggle-bar">
        <button
          type="button"
          className={`company-wizard-mobile-toggle-btn ${mobileTab === 'form' ? 'active' : ''}`}
          onClick={() => setMobileTab('form')}
        >
          1. Company Information
        </button>
        <button
          type="button"
          className={`company-wizard-mobile-toggle-btn ${mobileTab === 'preview' ? 'active' : ''}`}
          onClick={() => setMobileTab('preview')}
        >
          2. Company Card Preview
        </button>
      </div>

      {/* ── Body Grid ─────────────────────────────────────────────── */}
      <div className="company-wizard-body">
        {/* Left Column: Master Company Setup Form */}
        <section
          className={`company-wizard-form-col ${mobileTab === 'preview' ? 'company-wizard-mobile-hidden' : ''}`}
        >
          <div className="company-wizard-form-inner">
            <div className="company-wizard-intro">
              <span className="company-wizard-eyebrow">STEP 1: ORGANIZATION MASTER PRESENCE</span>
              <h1 className="company-wizard-headline">Create your company portfolio.</h1>
              <p className="company-wizard-sub">
                Establish your company's master link, official logo, and brand color. Once created, all employee cards will inherit this exact branding.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="company-wizard-fields">
              {/* ── Section 1: Company Name & Link ── */}
              <div className="company-wizard-section">
                <div className="company-section-header">
                  <span className="company-section-num">01</span>
                  <div>
                    <h3 className="company-section-title">Company Identity &amp; Master Link</h3>
                    <p className="company-section-sub">Your official organization name and main web presence.</p>
                  </div>
                </div>

                <div className="company-field">
                  <label className="company-label" htmlFor={`${uid}-companyName`}>
                    <span>Official Company / Organization Name *</span>
                  </label>
                  <input
                    id={`${uid}-companyName`}
                    type="text"
                    className="company-input"
                    value={data.companyName}
                    autoFocus
                    onChange={(e) => {
                      const val = e.target.value
                      const autoSub = val.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20)
                      patch({
                        companyName: val,
                        ...((!data.subdomain || data.subdomain === rawSubInitial) && autoSub ? { subdomain: autoSub } : {}),
                      })
                    }}
                    placeholder="e.g. Safari Technologies PLC, Commercial Bank of Ethiopia"
                  />
                </div>

                <div className="company-field">
                  <label className="company-label">
                    <span>Card Package Tier</span>
                    <span className="opt">Volume tier</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
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

                <div className="company-field">
                  <label className="company-label" htmlFor={`${uid}-subdomain`}>
                    <span>Main Company Address *</span>
                    <span className="opt">Master public link</span>
                  </label>
                  <div className="company-domain-bar">
                    <span className="company-domain-protocol">https://</span>
                    <input
                      id={`${uid}-subdomain`}
                      type="text"
                      className="company-domain-input"
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
                    <span className="company-domain-suffix">
                      {typeof window !== 'undefined' && window.location.hostname.endsWith('localhost')
                        ? '.localhost:5173'
                        : '.koo-link.com'}
                    </span>
                  </div>
                  <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    {subdomainStatus === 'checking' && <span style={{ color: '#64748b' }}>Checking availability…</span>}
                    {subdomainStatus === 'available' && <span style={{ color: '#059669', fontWeight: 600 }}>Address available</span>}
                    {subdomainStatus === 'taken' && <span style={{ color: '#dc2626', fontWeight: 600 }}>Already taken</span>}
                  </div>
                </div>

                <div className="company-field">
                  <label className="company-label" htmlFor={`${uid}-tagline`}>
                    <span>Company Slogan / Industry <span className="opt">OPTIONAL</span></span>
                  </label>
                  <input
                    id={`${uid}-tagline`}
                    type="text"
                    className="company-input"
                    value={data.tagline}
                    onChange={(e) => patch({ tagline: e.target.value })}
                    placeholder="e.g. Enterprise Cloud & Contactless Smart Card Solutions"
                  />
                </div>
              </div>

              {/* ── Section 2: Official Company Logo ── */}
              <div className="company-wizard-section">
                <div className="company-section-header">
                  <span className="company-section-num">02</span>
                  <div>
                    <h3 className="company-section-title">Official Company Logo</h3>
                    <p className="company-section-sub">
                      Uploaded once, this exact logo will be printed on the front of all physical cards and pinned to all employee profiles.
                    </p>
                  </div>
                </div>

                <div className="company-logo-upload-card">
                  <div className="company-logo-preview-frame">
                    {data.companyLogoUrl ? (
                      <img src={resolveMediaUrl(data.companyLogoUrl)} alt="Company Logo Preview" />
                    ) : (
                      <span className="company-logo-empty-icon" style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8' }}>LOGO</span>
                    )}
                  </div>
                  <div className="company-logo-action-meta">
                    <label className="company-upload-btn-label">
                      <span>Upload Vector / High-Res Logo</span>
                      <input
                        type="file"
                        accept="image/png,image/svg+xml,image/jpeg,image/webp"
                        onChange={handleLogoUpload}
                      />
                    </label>
                    {data.companyLogoUrl && (
                      <button
                        type="button"
                        className="company-remove-logo-btn"
                        onClick={() => patch({ companyLogoUrl: '' })}
                      >
                        Remove Logo
                      </button>
                    )}
                    <p className="company-logo-hint">
                      Supported: Transparent PNG, SVG, or high-res JPG. Scaled for ultra-crisp UV contactless card printing.
                    </p>
                  </div>
                </div>

                <div className="company-field">
                  <label className="company-label" htmlFor={`${uid}-logoUrl`}>
                    <span>Or Logo Image Direct URL <span className="opt">OPTIONAL</span></span>
                  </label>
                  <input
                    id={`${uid}-logoUrl`}
                    type="url"
                    className="company-input"
                    value={data.companyLogoUrl.startsWith('data:') ? '' : data.companyLogoUrl}
                    onChange={(e) => patch({ companyLogoUrl: e.target.value })}
                    placeholder="https://yourcompany.com/logo.png"
                  />
                </div>
              </div>

              {/* ── Section 3: Executive Brand Accent Color ── */}
              <div className="company-wizard-section">
                <div className="company-section-header">
                  <span className="company-section-num">03</span>
                  <div>
                    <h3 className="company-section-title">Primary Brand Accent Color</h3>
                    <p className="company-section-sub">Applied to card edges, action buttons, and digital card badges.</p>
                  </div>
                </div>

                <div className="company-palette-grid">
                  {BRAND_PALETTES.map((pal) => (
                    <button
                      key={pal.value}
                      type="button"
                      className={`company-color-swatch ${data.brandColor.toLowerCase() === pal.value.toLowerCase() ? 'active' : ''}`}
                      style={{ backgroundColor: pal.value }}
                      onClick={() => patch({ brandColor: pal.value })}
                      title={pal.name}
                    />
                  ))}
                  <div className="company-custom-color-wrap">
                    <input
                      type="color"
                      className="company-native-color-picker"
                      value={data.brandColor.startsWith('#') && data.brandColor.length === 7 ? data.brandColor : '#0e0e11'}
                      onChange={(e) => patch({ brandColor: e.target.value })}
                    />
                    <input
                      type="text"
                      className="company-input"
                      style={{ width: 85, height: 30, padding: '0 6px', fontSize: 12 }}
                      value={data.brandColor}
                      onChange={(e) => patch({ brandColor: e.target.value })}
                      placeholder="#0e0e11"
                    />
                  </div>
                </div>
              </div>

              {/* ── Section 4: Headquarters Contacts & Location ── */}
              <div className="company-wizard-section">
                <div className="company-section-header">
                  <span className="company-section-num">04</span>
                  <div>
                    <h3 className="company-section-title">Company Headquarters Contacts</h3>
                    <p className="company-section-sub">Default official contact information for company inquiries.</p>
                  </div>
                </div>

                <div className="company-field-row">
                  <div className="company-field">
                    <label className="company-label" htmlFor={`${uid}-phone`}>
                      <span>HQ Office Phone <span className="opt">OPTIONAL</span></span>
                    </label>
                    <input
                      id={`${uid}-phone`}
                      type="tel"
                      className="company-input"
                      value={data.phone}
                      onChange={(e) => patch({ phone: e.target.value })}
                      placeholder="+251 11 123 4567"
                    />
                  </div>
                  <div className="company-field">
                    <label className="company-label" htmlFor={`${uid}-email`}>
                      <span>General Inquiries Email <span className="opt">OPTIONAL</span></span>
                    </label>
                    <input
                      id={`${uid}-email`}
                      type="email"
                      className="company-input"
                      value={data.email}
                      onChange={(e) => patch({ email: e.target.value })}
                      placeholder="info@company.com"
                    />
                  </div>
                </div>

                <div className="company-field-row">
                  <div className="company-field">
                    <label className="company-label" htmlFor={`${uid}-website`}>
                      <span>Corporate Website <span className="opt">OPTIONAL</span></span>
                    </label>
                    <input
                      id={`${uid}-website`}
                      type="url"
                      className="company-input"
                      value={data.website}
                      onChange={(e) => patch({ website: e.target.value })}
                      placeholder="https://company.com"
                    />
                  </div>
                  <div className="company-field">
                    <label className="company-label" htmlFor={`${uid}-location`}>
                      <span>Office Address / City <span className="opt">OPTIONAL</span></span>
                    </label>
                    <input
                      id={`${uid}-location`}
                      type="text"
                      className="company-input"
                      value={data.location}
                      onChange={(e) => patch({ location: e.target.value })}
                      placeholder="Bole Medhanialem, Addis Ababa, Ethiopia"
                    />
                  </div>
                </div>

                <div className="company-field">
                  <label className="company-label" htmlFor={`${uid}-bio`}>
                    <span>Company Overview <span className="opt">OPTIONAL</span></span>
                  </label>
                  <textarea
                    id={`${uid}-bio`}
                    className="company-textarea"
                    value={data.bio}
                    onChange={(e) => patch({ bio: e.target.value })}
                    placeholder="Brief description of what your organization does..."
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
              <div className="company-submit-bar">
                <button
                  type="submit"
                  className="company-btn-submit"
                  disabled={busy || subdomainStatus === 'checking' || subdomainStatus === 'taken'}
                >
                  {busy ? 'Creating Master Company Portfolio…' : 'Save & Publish Master Company Portfolio →'}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Right Column: Live Sticky Card Preview */}
        <aside
          className={`company-wizard-preview-col ${mobileTab === 'form' ? 'company-wizard-mobile-hidden' : ''}`}
        >
          <div className="company-preview-sticky-wrap">
            <div className="company-preview-top-badge">
              <span>MASTER COMPANY PORTFOLIO</span>
              <span>{displayUrl}</span>
            </div>

            <div className="company-preview-card-frame">
              <DigitalCard
                name={data.companyName || 'Your Company Name'}
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

            <div className="company-preview-promise-box">
              <span className="company-promise-icon">✨</span>
              <div className="company-promise-content">
                <strong>Uniform Corporate Identity Lock</strong>
                <p>
                  Once saved, all subsequent employee cards created in your workspace will automatically inherit this official logo, brand color, and company affiliation.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
