import { useState, useId } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import type { NfcCardTier, UserProfile } from '@amalink/types'
import { NFC_CARD_TIER_META, TIER_PROFILE_LIMITS } from '@amalink/types'
import { resolveMediaUrl } from './config'

import './CorporateSettingsView.css'

export interface CorporateSettingsData {
  companyName: string
  subdomain: string
  companyLogoUrl: string
  brandColor: string
  customerType: NfcCardTier
  location: string
  phone: string
  email: string
  website: string
  bio: string
}

interface CorporateSettingsViewProps {
  initialData: CorporateSettingsData
  user: UserProfile
  portfolioCount: number
  onSave: (data: CorporateSettingsData) => Promise<void>
  checkSubdomain: (subdomain: string) => Promise<boolean>
  onUpgradeClick?: () => void
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

export function CorporateSettingsView({
  initialData,
  user: _user,
  portfolioCount,
  onSave,
  checkSubdomain: _checkSubdomain,
  onUpgradeClick,
}: CorporateSettingsViewProps) {
  const uid = useId()
  const [data, setData] = useState<CorporateSettingsData>({ ...initialData })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_subdomainStatus, _setSubdomainStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')

  function patch(update: Partial<CorporateSettingsData>) {
    setData((cur) => ({ ...cur, ...update }))
    setMessage('')
    setError('')
  }

  function handleLogoUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, SVG, JPG, WEBP).')
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
      setError('Company name is required.')
      return
    }

    setBusy(true)
    setError('')
    setMessage('')

    try {
      await onSave(data)
      setMessage('Corporate settings saved successfully. All employee cards now share this configuration.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save settings.')
    } finally {
      setBusy(false)
    }
  }

  const currentTier = data.customerType || 'business'
  const tierMeta = NFC_CARD_TIER_META[currentTier]
  const profileLimit = TIER_PROFILE_LIMITS[currentTier]

  return (
    <div className="corp-settings-container">
      <form onSubmit={handleSubmit} className="corp-settings-form">
        {/* Header */}
        <div className="corp-settings-header">
          <div>
            <span className="corp-settings-eyebrow">ACCOUNT CONFIGURATION</span>
            <h2 className="corp-settings-title">Corporate Master Settings</h2>
            <p className="corp-settings-desc">
              Manage your company's master identity, official logo, brand color, and headquarters contact info.
              These settings are automatically inherited across all team member digital cards.
            </p>
          </div>
          <button
            type="submit"
            className="primary-button corp-settings-save-btn"
            disabled={busy}
          >
            {busy ? 'Saving…' : 'Save Changes'}
          </button>
        </div>

        {message && <div className="corp-settings-banner success">{message}</div>}
        {error && <div className="corp-settings-banner error">{error}</div>}

        {/* Section 1: Company Identity */}
        <div className="corp-settings-card">
          <h3 className="corp-card-title">1. Organization Identity &amp; Master Link</h3>
          <p className="corp-card-desc">Your official organization name and main company web presence.</p>

          <div className="corp-form-grid">
            <div className="corp-input-group full">
              <label htmlFor={`${uid}-companyName`}>Official Company / Organization Name</label>
              <input
                id={`${uid}-companyName`}
                type="text"
                className="corp-text-input"
                value={data.companyName}
                onChange={(e) => patch({ companyName: e.target.value })}
                placeholder="e.g. Safari Technologies PLC"
              />
            </div>

            <div className="corp-input-group full">
              <label htmlFor={`${uid}-subdomain`}>Master Subdomain Address</label>
              <div className="corp-subdomain-bar">
                <span className="corp-sub-prefix">https://</span>
                <input
                  id={`${uid}-subdomain`}
                  type="text"
                  className="corp-sub-input"
                  value={data.subdomain}
                  onChange={(e) => {
                    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                    patch({ subdomain: val })
                  }}
                  placeholder="company"
                />
                <span className="corp-sub-suffix">.koo-link.com</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Visual Brand Kit (Logo & Theme) */}
        <div className="corp-settings-card">
          <h3 className="corp-card-title">2. Official Corporate Seal &amp; Brand Color</h3>
          <p className="corp-card-desc">
            This logo is rendered in the common avatar placeholder on every team member's digital card.
          </p>

          <div className="corp-brand-layout">
            {/* Logo box */}
            <div className="corp-logo-zone">
              <div className="corp-logo-preview-box">
                {data.companyLogoUrl ? (
                  <img
                    src={resolveMediaUrl(data.companyLogoUrl)}
                    alt={data.companyName}
                    className="corp-logo-preview-img"
                  />
                ) : (
                  <div className="corp-logo-placeholder-text">
                    NO LOGO
                  </div>
                )}
              </div>
              <div className="corp-logo-actions">
                <label className="secondary-button corp-upload-btn">
                  Upload Official Logo
                  <input
                    type="file"
                    accept="image/png,image/svg+xml,image/jpeg,image/webp"
                    onChange={handleLogoUpload}
                    style={{ display: 'none' }}
                  />
                </label>
                {data.companyLogoUrl && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => patch({ companyLogoUrl: '' })}
                  >
                    Remove Logo
                  </button>
                )}
                <span className="corp-input-hint">Recommended: Transparent PNG or SVG</span>
              </div>
            </div>

            {/* Brand Accent Color */}
            <div className="corp-palette-zone">
              <label className="corp-palette-label">
                Signature Accent Color: <strong style={{ color: data.brandColor }}>{data.brandColor}</strong>
              </label>
              <div className="corp-palette-grid">
                {BRAND_PALETTES.map((palette) => (
                  <button
                    key={palette.value}
                    type="button"
                    className={`corp-color-chip ${data.brandColor.toLowerCase() === palette.value.toLowerCase() ? 'active' : ''}`}
                    style={{ background: palette.value }}
                    onClick={() => patch({ brandColor: palette.value })}
                    title={palette.name}
                  />
                ))}
              </div>
              <div className="corp-custom-color-row">
                <label htmlFor={`${uid}-hex`}>Custom Hex:</label>
                <input
                  id={`${uid}-hex`}
                  type="text"
                  className="corp-hex-input"
                  value={data.brandColor}
                  onChange={(e) => patch({ brandColor: e.target.value })}
                  placeholder="#0e0e11"
                  maxLength={7}
                />
                <input
                  type="color"
                  className="corp-color-picker"
                  value={data.brandColor}
                  onChange={(e) => patch({ brandColor: e.target.value })}
                  aria-label="Pick color"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Headquarters Contact Info */}
        <div className="corp-settings-card">
          <h3 className="corp-card-title">3. Headquarters Contact &amp; Location</h3>
          <p className="corp-card-desc">Office details pre-populated across organization profiles.</p>

          <div className="corp-form-grid">
            <div className="corp-input-group half">
              <label htmlFor={`${uid}-phone`}>Office Main Phone</label>
              <input
                id={`${uid}-phone`}
                type="tel"
                className="corp-text-input"
                value={data.phone}
                onChange={(e) => patch({ phone: e.target.value })}
                placeholder="+251 11 123 4567"
              />
            </div>

            <div className="corp-input-group half">
              <label htmlFor={`${uid}-email`}>General Inquiries Email</label>
              <input
                id={`${uid}-email`}
                type="email"
                className="corp-text-input"
                value={data.email}
                onChange={(e) => patch({ email: e.target.value })}
                placeholder="info@yourcompany.et"
              />
            </div>

            <div className="corp-input-group half">
              <label htmlFor={`${uid}-location`}>Headquarters Office Location</label>
              <input
                id={`${uid}-location`}
                type="text"
                className="corp-text-input"
                value={data.location}
                onChange={(e) => patch({ location: e.target.value })}
                placeholder="Bole, Addis Ababa, Ethiopia"
              />
            </div>

            <div className="corp-input-group half">
              <label htmlFor={`${uid}-website`}>Corporate Website URL</label>
              <input
                id={`${uid}-website`}
                type="url"
                className="corp-text-input"
                value={data.website}
                onChange={(e) => patch({ website: e.target.value })}
                placeholder="https://yourcompany.et"
              />
            </div>

            <div className="corp-input-group full">
              <label htmlFor={`${uid}-bio`}>Company Overview / About</label>
              <textarea
                id={`${uid}-bio`}
                className="corp-textarea"
                rows={3}
                value={data.bio}
                onChange={(e) => patch({ bio: e.target.value })}
                placeholder="Brief summary about your organization..."
              />
            </div>
          </div>
        </div>

        {/* Section 4: Capacity & Tier */}
        <div className="corp-settings-card">
          <div className="corp-tier-header">
            <div>
              <h3 className="corp-card-title">4. Organization Capacity &amp; Plan</h3>
              <p className="corp-card-desc">
                Current plan: <strong>{tierMeta.name}</strong> ({portfolioCount} of {profileLimit ?? '∞'} cards active).
              </p>
            </div>
            {onUpgradeClick && (
              <button
                type="button"
                className="secondary-button"
                onClick={onUpgradeClick}
              >
                Change Volume Tier →
              </button>
            )}
          </div>

          <div className="corp-tier-selector-grid">
            {[
              { id: 'business', name: 'S&M Business', meta: '5–19 Profiles' },
              { id: 'enterprise', name: 'Enterprise', meta: '20–49 Profiles' },
              { id: 'corporate', name: 'Corporate', meta: '50+ Profiles' },
            ].map((tier) => (
              <div
                key={tier.id}
                className={`corp-tier-card ${data.customerType === tier.id ? 'active' : ''}`}
                onClick={() => patch({ customerType: tier.id as NfcCardTier })}
              >
                <div className="corp-tier-radio">
                  <span className={`corp-radio-dot ${data.customerType === tier.id ? 'checked' : ''}`} />
                </div>
                <div>
                  <h4 className="corp-tier-card-name">{tier.name}</h4>
                  <span className="corp-tier-card-meta">{tier.meta}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Save Bar */}
        <div className="corp-settings-bottom-bar">
          <button
            type="submit"
            className="primary-button corp-settings-save-btn"
            disabled={busy}
          >
            {busy ? 'Saving Corporate Setup…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
