import { useState, useId, useEffect } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { BrandLogo } from './BrandLogo'
import { DigitalCard } from './DigitalCard'
import { resolveMediaUrl } from './config'
import { getPortfolioDomainLabel, getPortfolioSubdomainUrl } from './url-helpers'
import './EmployeeCardWizard.css'

export interface EmployeeCardData {
  firstName: string
  lastName: string
  title: string
  department?: string
  avatarUrl?: string
  phone: string
  email: string
  subdomain: string
  linkedin?: string
  telegram?: string
  whatsapp?: string
  website?: string
  bio: string
}

interface CompanyInfo {
  companyName: string
  companyLogoUrl?: string | null
  brandColor?: string | null
  location?: string
  website?: string
  companySubdomain: string
}

interface EmployeeCardWizardProps {
  company: CompanyInfo
  onFinish: (data: EmployeeCardData) => Promise<void>
  checkSubdomain: (subdomain: string) => Promise<boolean>
  busy: boolean
  error: string
  onBack: () => void
}

export function EmployeeCardWizard({
  company,
  onFinish,
  checkSubdomain,
  busy,
  error,
  onBack,
}: EmployeeCardWizardProps) {
  const [mobileTab, setMobileTab] = useState<'form' | 'preview'>('form')
  const [subdomainStatus, setSubdomainStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [fieldError, setFieldError] = useState('')

  const [data, setData] = useState<EmployeeCardData>({
    firstName: '',
    lastName: '',
    title: '',
    department: '',
    avatarUrl: '',
    phone: '',
    email: '',
    subdomain: '',
    linkedin: '',
    telegram: '',
    whatsapp: '',
    website: company.website || '',
    bio: '',
  })

  const uid = useId()

  function patch(update: Partial<EmployeeCardData>) {
    setData((cur) => {
      const next = { ...cur, ...update }
      // Auto-suggest subdomain when employee name changes if user hasn't explicitly entered a custom handle
      if (('firstName' in update || 'lastName' in update) && (!cur.subdomain || cur.subdomain.includes(company.companySubdomain))) {
        const cleanFirst = next.firstName.toLowerCase().replace(/[^a-z0-9]/g, '')
        const cleanLast = next.lastName.toLowerCase().replace(/[^a-z0-9]/g, '')
        const slug = cleanFirst && cleanLast ? `${cleanFirst}-${cleanLast}` : cleanFirst || cleanLast
        if (slug) {
          next.subdomain = `${slug}-${company.companySubdomain}`.slice(0, 30)
        }
      }
      return next
    })
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

  function handleAvatarUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setFieldError('Please select a valid portrait image (PNG, JPG, WEBP).')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string
      const img = new Image()
      img.onload = () => {
        const maxDim = 600
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
          patch({ avatarUrl: canvas.toDataURL('image/jpeg', 0.88) })
        } else {
          patch({ avatarUrl: rawDataUrl })
        }
      }
      img.onerror = () => patch({ avatarUrl: rawDataUrl })
      img.src = rawDataUrl
    }
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!data.firstName.trim()) {
      setFieldError('Please enter the employee first name.')
      setMobileTab('form')
      return
    }
    if (!data.title.trim()) {
      setFieldError('Please enter the employee job title / designation.')
      setMobileTab('form')
      return
    }
    if (!data.subdomain.trim() || data.subdomain.trim().length < 3) {
      setFieldError('Please choose a valid card address (at least 3 characters).')
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

  const fullName = `${data.firstName} ${data.lastName}`.trim() || 'Employee Name'
  const profileUrl = getPortfolioSubdomainUrl(data.subdomain || 'employee', false)
  const displayUrl = getPortfolioDomainLabel(data.subdomain || 'employee')

  const previewSocials = []
  if (data.linkedin?.trim()) previewSocials.push({ platform: 'linkedin', label: 'LinkedIn', url: data.linkedin })
  if (data.telegram?.trim()) previewSocials.push({ platform: 'telegram', label: 'Telegram', url: data.telegram })
  if (data.whatsapp?.trim() || data.phone?.trim()) previewSocials.push({ platform: 'whatsapp', label: 'WhatsApp', url: data.whatsapp })
  if (data.website?.trim()) previewSocials.push({ platform: 'website', label: 'Company Website', url: data.website })

  return (
    <div className="emp-wizard-shell">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <header className="emp-wizard-header">
        <div className="emp-wizard-brand">
          <BrandLogo variant="wizard" />
          <span className="emp-wizard-corp-tag">Employee Card Setup</span>
        </div>
        <button type="button" className="secondary-button" style={{ height: 34, fontSize: 12 }} onClick={onBack}>
          ← Return to Dashboard
        </button>
      </header>

      {/* ── Corporate Brand Lock Banner ───────────────────────────── */}
      <div className="emp-brand-lock-banner">
        <div className="emp-brand-lock-inner">
          <div className="emp-brand-lock-badge">
            {company.companyLogoUrl ? (
              <img src={resolveMediaUrl(company.companyLogoUrl)} alt={company.companyName} className="emp-brand-lock-logo" />
            ) : (
              <div className="emp-brand-lock-initials">
                {company.companyName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="emp-brand-lock-text">
              <strong>{company.companyName}</strong>
              <span>Corporate Brand Locked (Logo, Company Name &amp; Color Theme Inherited)</span>
            </div>
          </div>
          <div className="emp-brand-lock-guarantee">
            <span>Verified Corporate Member Card</span>
          </div>
        </div>
      </div>

      {/* ── Mobile Viewport Switcher ──────────────────────────────── */}
      <div className="emp-wizard-mobile-toggle-bar">
        <button
          type="button"
          className={`emp-wizard-mobile-toggle-btn ${mobileTab === 'form' ? 'active' : ''}`}
          onClick={() => setMobileTab('form')}
        >
          ✎ 1. Employee Details
        </button>
        <button
          type="button"
          className={`emp-wizard-mobile-toggle-btn ${mobileTab === 'preview' ? 'active' : ''}`}
          onClick={() => setMobileTab('preview')}
        >
          👁️ 2. Live Card Preview
        </button>
      </div>

      {/* ── Body Grid ─────────────────────────────────────────────── */}
      <div className="emp-wizard-body">
        {/* Left Column: Employee Card Form */}
        <section
          className={`emp-wizard-form-col ${mobileTab === 'preview' ? 'emp-wizard-mobile-hidden' : ''}`}
        >
          <div className="emp-wizard-form-inner">
            <div className="emp-wizard-intro">
              <span className="emp-wizard-eyebrow">STEP 2: TEAM MEMBER CARD</span>
              <h1 className="emp-wizard-headline">Add an employee digital card.</h1>
              <p className="emp-wizard-sub">
                Official company logo and styling are locked to <strong>{company.companyName}</strong>. Enter the employee's personal details, designation, and direct contacts below.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="emp-wizard-fields">
              {/* ── Section 1: Employee Identity & Role ── */}
              <div className="emp-wizard-section">
                <div className="emp-section-header">
                  <span className="emp-section-num">01</span>
                  <div>
                    <h3 className="emp-section-title">Employee Identity &amp; Role</h3>
                    <p className="emp-section-sub">Name and designation synced to smartphones upon NFC card tap.</p>
                  </div>
                </div>

                <div className="emp-field-row">
                  <div className="emp-field">
                    <label className="emp-label" htmlFor={`${uid}-firstName`}>
                      <span>First Name *</span>
                    </label>
                    <input
                      id={`${uid}-firstName`}
                      type="text"
                      className="emp-input"
                      value={data.firstName}
                      autoFocus
                      onChange={(e) => patch({ firstName: e.target.value })}
                      placeholder="e.g. Abebe"
                    />
                  </div>
                  <div className="emp-field">
                    <label className="emp-label" htmlFor={`${uid}-lastName`}>
                      <span>Last Name</span>
                    </label>
                    <input
                      id={`${uid}-lastName`}
                      type="text"
                      className="emp-input"
                      value={data.lastName}
                      onChange={(e) => patch({ lastName: e.target.value })}
                      placeholder="e.g. Kebede"
                    />
                  </div>
                </div>

                <div className="emp-field-row">
                  <div className="emp-field">
                    <label className="emp-label" htmlFor={`${uid}-title`}>
                      <span>Job Title / Designation *</span>
                    </label>
                    <input
                      id={`${uid}-title`}
                      type="text"
                      className="emp-input"
                      value={data.title}
                      onChange={(e) => patch({ title: e.target.value })}
                      placeholder="e.g. Managing Director, Lead Engineer"
                    />
                  </div>
                  <div className="emp-field">
                    <label className="emp-label" htmlFor={`${uid}-department`}>
                      <span>Department <span className="opt">OPTIONAL</span></span>
                    </label>
                    <input
                      id={`${uid}-department`}
                      type="text"
                      className="emp-input"
                      value={data.department || ''}
                      onChange={(e) => patch({ department: e.target.value })}
                      placeholder="e.g. Technology, Operations"
                    />
                  </div>
                </div>

                {/* Personal Headshot Photo */}
                <div className="emp-avatar-box">
                  <div className="emp-avatar-frame">
                    {data.avatarUrl ? (
                      <img src={resolveMediaUrl(data.avatarUrl)} alt="Employee Portrait" />
                    ) : (
                      <span className="emp-avatar-initials">
                        {data.firstName ? data.firstName[0].toUpperCase() : '👤'}
                      </span>
                    )}
                  </div>
                  <div className="emp-avatar-actions">
                    <label className="emp-avatar-upload-btn">
                      <span>📸 Upload Employee Photo</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleAvatarUpload}
                      />
                    </label>
                    {data.avatarUrl && (
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 11, cursor: 'pointer', textAlign: 'left' }}
                        onClick={() => patch({ avatarUrl: '' })}
                      >
                        Remove photo
                      </button>
                    )}
                    <span style={{ fontSize: 11, color: '#64748b' }}>
                      Recommended: Square portrait headshot.
                    </span>
                  </div>
                </div>

                {/* Locked Company Name Display */}
                <div className="emp-field">
                  <label className="emp-label">
                    <span>Company Affiliation</span>
                    <span className="opt">🔒 Locked from Company Master</span>
                  </label>
                  <input
                    type="text"
                    className="emp-input emp-input-locked"
                    value={company.companyName}
                    readOnly
                    title="Company name is locked across all employee cards"
                  />
                </div>
              </div>

              {/* ── Section 2: Direct Contact Channels (vCard sync) ── */}
              <div className="emp-wizard-section">
                <div className="emp-section-header">
                  <span className="emp-section-num">02</span>
                  <div>
                    <h3 className="emp-section-title">Direct Work Contacts</h3>
                    <p className="emp-section-sub">
                      Saved straight into the client's phone contacts when the card is tapped.
                    </p>
                  </div>
                </div>

                <div className="emp-field-row">
                  <div className="emp-field">
                    <label className="emp-label" htmlFor={`${uid}-phone`}>
                      <span>Direct Mobile Phone (Call &amp; vCard)</span>
                    </label>
                    <input
                      id={`${uid}-phone`}
                      type="tel"
                      className="emp-input"
                      value={data.phone}
                      onChange={(e) => patch({ phone: e.target.value })}
                      placeholder="+251 91 123 4567"
                    />
                  </div>
                  <div className="emp-field">
                    <label className="emp-label" htmlFor={`${uid}-email`}>
                      <span>Direct Work Email</span>
                    </label>
                    <input
                      id={`${uid}-email`}
                      type="email"
                      className="emp-input"
                      value={data.email}
                      onChange={(e) => patch({ email: e.target.value })}
                      placeholder="name@company.com"
                    />
                  </div>
                </div>

                {/* Subdomain address */}
                <div className="emp-field">
                  <label className="emp-label" htmlFor={`${uid}-subdomain`}>
                    <span>Employee Card Address *</span>
                    <span className="opt">Tap link &amp; QR scan URL</span>
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
                      placeholder="employee-company"
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
              </div>

              {/* ── Section 3: Networking Links ── */}
              <div className="emp-wizard-section">
                <div className="emp-section-header">
                  <span className="emp-section-num">03</span>
                  <div>
                    <h3 className="emp-section-title">Professional Networking Channels</h3>
                    <p className="emp-section-sub">Direct social links displayed on the employee profile.</p>
                  </div>
                </div>

                <div className="emp-field-row">
                  <div className="emp-field">
                    <label className="emp-label" htmlFor={`${uid}-linkedin`}>
                      <span>LinkedIn Profile <span className="opt">OPTIONAL</span></span>
                    </label>
                    <input
                      id={`${uid}-linkedin`}
                      type="url"
                      className="emp-input"
                      value={data.linkedin || ''}
                      onChange={(e) => patch({ linkedin: e.target.value })}
                      placeholder="https://linkedin.com/in/username"
                    />
                  </div>
                  <div className="emp-field">
                    <label className="emp-label" htmlFor={`${uid}-telegram`}>
                      <span>Telegram Handle <span className="opt">OPTIONAL</span></span>
                    </label>
                    <input
                      id={`${uid}-telegram`}
                      type="text"
                      className="emp-input"
                      value={data.telegram || ''}
                      onChange={(e) => patch({ telegram: e.target.value })}
                      placeholder="@username"
                    />
                  </div>
                </div>
              </div>

              {/* ── Section 4: Employee Bio ── */}
              <div className="emp-wizard-section">
                <div className="emp-section-header">
                  <span className="emp-section-num">04</span>
                  <div>
                    <h3 className="emp-section-title">Brief Summary / Bio</h3>
                    <p className="emp-section-sub">Short individual professional summary.</p>
                  </div>
                </div>

                <div className="emp-field">
                  <textarea
                    id={`${uid}-bio`}
                    className="emp-textarea"
                    value={data.bio}
                    maxLength={200}
                    onChange={(e) => patch({ bio: e.target.value })}
                    placeholder="Brief 1-2 sentence professional bio..."
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
              <div className="emp-submit-bar">
                <button
                  type="submit"
                  className="emp-btn-submit"
                  disabled={busy || subdomainStatus === 'checking' || subdomainStatus === 'taken'}
                >
                  {busy ? 'Creating Employee Card…' : `✓ Save Employee Card for ${company.companyName} →`}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Right Column: Live Sticky Card Preview */}
        <aside
          className={`emp-wizard-preview-col ${mobileTab === 'form' ? 'emp-wizard-mobile-hidden' : ''}`}
        >
          <div className="emp-preview-sticky-wrap">
            <div className="emp-preview-top-badge">
              <span>EMPLOYEE CARD PREVIEW</span>
              <span>{displayUrl}</span>
            </div>

            <div className="emp-preview-card-frame">
              <DigitalCard
                name={fullName}
                title={data.title ? `${data.title}${data.department ? ` • ${data.department}` : ''}` : 'Designation'}
                company={company.companyName}
                companyLogoUrl={company.companyLogoUrl || undefined}
                avatarUrl={data.avatarUrl}
                bio={data.bio}
                phone={data.phone}
                email={data.email}
                accentColor={company.brandColor || '#0284c7'}
                profileUrl={profileUrl}
                displayUrl={displayUrl}
                previewOnly
                socials={previewSocials}
              />
            </div>

            <div className="emp-preview-note-box">
              <span style={{ fontSize: 22 }}>📇</span>
              <div>
                <strong>vCard Contact Sync Enabled</strong>
                <p>
                  When a client taps this card, your employee's name ({fullName}), job title, direct phone, and official company affiliation (<strong>{company.companyName}</strong>) are saved into their smartphone contacts in one tap.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
