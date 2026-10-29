import { useState } from 'react'
import type { CSSProperties, ChangeEvent } from 'react'
import type { NfcCardTier, UserProfile } from '@amalink/types'
import { API_URL, resolveMediaUrl } from './config'
import { getAuthToken } from './auth-client'
import './BrandKitModal.css'

interface BrandKitModalProps {
  user: UserProfile
  onClose: () => void
  onSaved: (brandKit: {
    companyName?: string | null
    companyLogoUrl?: string | null
    brandColor?: string | null
    customerType?: NfcCardTier
  }) => void
}

const BRAND_COLOR_PRESETS = [
  { name: 'Sapphire', value: '#2563eb' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Midnight', value: '#0e0e11' },
  { name: 'Ruby', value: '#dc2626' },
  { name: 'Amethyst', value: '#7c3aed' },
  { name: 'Amber Gold', value: '#d97706' },
  { name: 'Titanium', value: '#334155' },
  { name: 'Obsidian', value: '#18181b' },
]

export function BrandKitModal({ user, onClose, onSaved }: BrandKitModalProps) {
  const [companyName, setCompanyName] = useState(user.companyName || '')
  const [companyLogoUrl, setCompanyLogoUrl] = useState(user.companyLogoUrl || '')
  const [brandColor, setBrandColor] = useState(user.brandColor || '#2563eb')
  const [customerType, setCustomerType] = useState<NfcCardTier>(
    (user.customerType && user.customerType !== 'individual') ? user.customerType : 'business'
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function handleLogoFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (PNG, SVG, JPG, WEBP).')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string
      // Resize to max 600px width or height to keep SVG and payload size optimal
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
          // Use png if original was png to preserve transparency, otherwise jpeg
          const isPng = file.type === 'image/png' || file.name.endsWith('.png')
          const finalUrl = canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', 0.88)
          setCompanyLogoUrl(finalUrl)
        } else {
          setCompanyLogoUrl(rawDataUrl)
        }
      }
      img.onerror = () => setCompanyLogoUrl(rawDataUrl)
      img.src = rawDataUrl
    }
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    setBusy(true)
    setError('')
    try {
      const token = getAuthToken()
      const res = await fetch(`${API_URL}/auth/brand-kit`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
        },
        body: JSON.stringify({
          companyName: companyName.trim() || undefined,
          companyLogoUrl: companyLogoUrl.trim() || undefined,
          brandColor: brandColor.trim() || undefined,
          customerType,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update brand kit')
      }

      onSaved({
        companyName: companyName.trim() || null,
        companyLogoUrl: companyLogoUrl.trim() || null,
        brandColor: brandColor.trim() || null,
        customerType,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update Brand Kit')
    } finally {
      setBusy(false)
    }
  }

  const previewStyle = {
    backgroundColor: '#0e0e11',
    color: '#ffffff',
    borderTop: `3px solid ${brandColor}`,
  } as CSSProperties

  return (
    <div className="brand-kit-overlay" onClick={onClose}>
      <div className="brand-kit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="brand-kit-header">
          <div className="brand-kit-title-wrap">
            <span className="brand-kit-badge">ORGANIZATION ASSETS</span>
            <h2>Company Brand Kit</h2>
            <p>
              Set your official organization logo and primary brand color. All employee digital cards and printed cards will automatically inherit these assets.
            </p>
          </div>
          <button type="button" className="brand-kit-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="brand-kit-body">
          {error && <div className="notice error-notice" role="alert">{error}</div>}

          {/* Organization Tier */}
          <div className="brand-kit-field">
            <label className="brand-kit-label">
              <span>Organization Package Tier</span>
              <span className="hint">Card package volume & billing style</span>
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
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: customerType === tier.id ? '2px solid #38bdf8' : '1px solid #323644',
                    background: customerType === tier.id ? '#1e293b' : '#1a1c23',
                    color: customerType === tier.id ? '#38bdf8' : '#e2e8f0',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onClick={() => setCustomerType(tier.id as NfcCardTier)}
                >
                  <strong style={{ display: 'block', fontSize: 12 }}>{tier.label}</strong>
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>{tier.meta}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Company Name */}
          <div className="brand-kit-field">
            <label className="brand-kit-label">
              <span>Organization / Company Name</span>
              <span className="hint">Required for corporate profile badge</span>
            </label>
            <input
              type="text"
              className="brand-kit-input"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Commercial Bank of Ethiopia, Ethio Telecom"
            />
          </div>

          {/* Official Company Logo */}
          <div className="brand-kit-field">
            <label className="brand-kit-label">
              <span>Official Company Logo</span>
              <span className="hint">Vector PNG, SVG, or high-res JPG (transparency supported)</span>
            </label>
            <div className="brand-kit-logo-area">
              <div className="brand-kit-logo-preview">
                {companyLogoUrl ? (
                  <img src={resolveMediaUrl(companyLogoUrl)} alt="Company Logo" />
                ) : (
                  <span className="brand-kit-logo-placeholder">🏢</span>
                )}
              </div>
              <div className="brand-kit-logo-actions">
                <label className="brand-kit-upload-btn">
                  <span>📁 Upload Logo Image</span>
                  <input
                    type="file"
                    accept="image/png,image/svg+xml,image/jpeg,image/webp"
                    onChange={handleLogoFileUpload}
                  />
                </label>
                {companyLogoUrl && (
                  <button
                    type="button"
                    className="brand-kit-remove-btn"
                    onClick={() => setCompanyLogoUrl('')}
                  >
                    Remove logo
                  </button>
                )}
                <span className="brand-kit-logo-meta">
                  Will appear on front of all employee cards and above names on digital profiles.
                </span>
              </div>
            </div>
          </div>

          {/* Primary Brand Color */}
          <div className="brand-kit-field">
            <label className="brand-kit-label">
              <span>Primary Brand Accent Color</span>
              <span className="hint">Used for card accents, buttons, and badges</span>
            </label>
            <div className="brand-kit-colors">
              {BRAND_COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  className={`brand-kit-swatch ${brandColor.toLowerCase() === preset.value.toLowerCase() ? 'active' : ''}`}
                  style={{ backgroundColor: preset.value }}
                  onClick={() => setBrandColor(preset.value)}
                  title={preset.name}
                />
              ))}
              <div className="brand-kit-color-picker-wrap">
                <input
                  type="color"
                  className="brand-kit-color-input"
                  value={brandColor.startsWith('#') && brandColor.length === 7 ? brandColor : '#2563eb'}
                  onChange={(e) => setBrandColor(e.target.value)}
                  title="Choose custom color"
                />
                <input
                  type="text"
                  className="brand-kit-input"
                  style={{ width: 85, padding: '4px 8px', fontSize: 12 }}
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  placeholder="#2563eb"
                />
              </div>
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="brand-kit-preview-box">
            <div className="brand-kit-mini-card" style={previewStyle}>
              <div className="brand-kit-mini-logo">
                {companyLogoUrl ? (
                  <img src={resolveMediaUrl(companyLogoUrl)} alt="Preview Logo" />
                ) : (
                  <span className="brand-kit-mini-text-logo">{companyName || 'COMPANY'}</span>
                )}
              </div>
              <div>
                <div className="brand-kit-mini-name">{user.name || 'Employee Name'}</div>
                <div className="brand-kit-mini-role">{companyName || 'Organization'}</div>
              </div>
            </div>
            <div className="brand-kit-preview-info">
              <h4>Employee Card Preview</h4>
              <p>
                Every employee card created under your corporate workspace will display your unified logo and brand accent.
              </p>
            </div>
          </div>
        </div>

        <div className="brand-kit-footer">
          <button type="button" className="brand-kit-btn-cancel" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="brand-kit-btn-save" onClick={handleSave} disabled={busy}>
            {busy ? 'Saving...' : 'Save Brand Kit'}
          </button>
        </div>
      </div>
    </div>
  )
}
