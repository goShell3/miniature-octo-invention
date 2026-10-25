import { useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import QRCode from 'qrcode'
import { resolveMediaUrl } from './config'
import './DigitalCard.css'

export interface CardSocial {
  platform: string
  url?: string
  label?: string
  handle?: string
}

export interface DigitalCardProps {
  name?: string
  title?: string
  company?: string
  bio?: string
  avatarUrl?: string
  headerImageUrl?: string
  phone?: string
  email?: string
  socials?: CardSocial[]
  accentColor?: string
  profileUrl?: string
  displayUrl?: string
  previewOnly?: boolean
  initialQrMode?: 'vcard' | 'url'
  onSaveVcard?: () => void
  vcardDownloadUrl?: string
  vcardFilename?: string
}

export function renderSocialIcon(platform: string): ReactNode {
  switch (platform.toLowerCase()) {
    case 'facebook':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      )
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
        </svg>
      )
    case 'linkedin':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
        </svg>
      )
    case 'telegram':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
          <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.942z"/>
        </svg>
      )
    case 'whatsapp':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
        </svg>
      )
    case 'twitter':
    case 'x':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      )
    case 'phone':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
      )
    case 'email':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
      )
    case 'website':
    default:
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
      )
  }
}

function buildVCardText({
  name,
  title,
  company,
  phone,
  email,
  bio,
  profileUrl,
  socials,
}: {
  name: string
  title?: string
  company?: string
  phone?: string
  email?: string
  bio?: string
  profileUrl?: string
  socials?: CardSocial[]
}): string {
  const parts = name.trim().split(' ')
  const firstName = parts[0] || ''
  const lastName = parts.slice(1).join(' ') || ''

  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${lastName};${firstName};;;`,
    `FN:${name.trim() || 'Contact'}`,
  ]
  if (company?.trim()) lines.push(`ORG:${company.trim()}`)
  if (title?.trim()) lines.push(`TITLE:${title.trim()}`)
  if (phone?.trim()) lines.push(`TEL;TYPE=CELL,VOICE,PREF:${phone.trim()}`)
  if (email?.trim()) lines.push(`EMAIL;TYPE=INTERNET,PREF:${email.trim()}`)
  if (profileUrl?.trim()) lines.push(`URL:${profileUrl.trim()}`)
  if (bio?.trim()) lines.push(`NOTE:${bio.trim().slice(0, 140)}`)

  if (socials && Array.isArray(socials)) {
    for (const soc of socials) {
      if (soc.url?.trim()) {
        lines.push(`X-SOCIALPROFILE;type=${soc.platform}:${soc.url.trim()}`)
      }
    }
  }

  lines.push('END:VCARD')
  return lines.join('\n')
}

export function DigitalCard({
  name = 'Your Name',
  title = '',
  company = '',
  bio = 'Your short bio appears here.',
  avatarUrl,
  headerImageUrl,
  phone = '',
  email = '',
  socials = [],
  accentColor = '#ff3535',
  profileUrl = 'https://sewnet.et/yourname',
  displayUrl = 'koo.link/yourname',
  previewOnly = false,
  onSaveVcard,
  vcardDownloadUrl,
  vcardFilename,
}: DigitalCardProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
  const [showFullscreenQr, setShowFullscreenQr] = useState(false)
  const [showExchangeModal, setShowExchangeModal] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [avatarError, setAvatarError] = useState(false)

  useEffect(() => {
    setAvatarError(false)
  }, [avatarUrl])

  // Visitor Exchange Form State
  const [visitorName, setVisitorName] = useState('')
  const [visitorPhone, setVisitorPhone] = useState('')
  const [visitorEmail, setVisitorEmail] = useState('')
  const [visitorCompany, setVisitorCompany] = useState('')
  const [visitorNote, setVisitorNote] = useState('')
  const [exchangeSuccess, setExchangeSuccess] = useState(false)

  function showToast(message: string) {
    setToastMessage(message)
    setTimeout(() => {
      setToastMessage(null)
    }, 3200)
  }

  // Derive initial letter (e.g. "K" or first character of name)
  const initial = (name.trim().charAt(0) || 'K').toUpperCase()

  // Format title at company: "Your title at your company"
  let titleCompany = ''
  if (title && company) {
    titleCompany = `${title} at ${company}`
  } else if (title) {
    titleCompany = title
  } else if (company) {
    titleCompany = company
  } else {
    titleCompany = 'Your title at your company'
  }

  // Save Contact handler (downloads vCard or invokes callback)
  function handleSaveContact() {
    if (previewOnly) {
      showToast('Preview mode: Contact download simulated')
      return
    }
    if (onSaveVcard) {
      onSaveVcard()
      return
    }
    if (vcardDownloadUrl) {
      const a = document.createElement('a')
      a.href = vcardDownloadUrl
      a.download = vcardFilename || `${name.toLowerCase().replace(/\s+/g, '-')}-contact.vcf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      showToast('Contact file downloaded!')
      return
    }
    const vcardText = buildVCardText({
      name,
      title,
      company,
      phone,
      email,
      bio,
      profileUrl,
      socials,
    })
    const blob = new Blob([vcardText], { type: 'text/vcard;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${name.toLowerCase().replace(/\s+/g, '-')}-contact.vcf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast('Contact saved to your phone!')
  }

  // Native Web Share API with clipboard copy fallback
  async function handleShare() {
    const targetUrl = profileUrl || (typeof window !== 'undefined' ? window.location.href : '')
    const shareData = {
      title: `${name} — Digital Identity Card`,
      text: `${name}${title ? ` · ${title}` : ''}${company ? ` (${company})` : ''}`,
      url: targetUrl,
    }

    if (
      typeof navigator !== 'undefined' &&
      navigator.share &&
      navigator.canShare &&
      navigator.canShare(shareData)
    ) {
      try {
        await navigator.share(shareData)
        return
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(targetUrl)
        showToast('Profile link copied to clipboard!')
      } catch {
        showToast('Address: ' + targetUrl)
      }
    }
  }

  // Handle Contact Exchange submission
  function handleExchangeSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!visitorName.trim()) {
      alert('Please enter your name.')
      return
    }
    if (!visitorPhone.trim() && !visitorEmail.trim()) {
      alert('Please provide at least a phone number or email address.')
      return
    }

    // Build reciprocal vCard text for the visitor so they can download their card or share it
    const exchangeVcard = buildVCardText({
      name: visitorName,
      title: visitorCompany,
      company: visitorCompany,
      phone: visitorPhone,
      email: visitorEmail,
      bio: visitorNote ? `Met via Koolink card. Note: ${visitorNote}` : 'Met via Koolink NFC Card',
    })

    // If cardholder has email or phone, open direct connect
    const cleanPhone = phone ? phone.replace(/[^0-9+]/g, '') : ''
    const subject = encodeURIComponent(`Nice meeting you! My contact info (${visitorName})`)
    const bodyText = encodeURIComponent(
      `Hi ${name},\n\nIt was great connecting with you!\n\nHere are my details:\nName: ${visitorName}\nPhone: ${visitorPhone}\nEmail: ${visitorEmail}\nCompany: ${visitorCompany}\n${visitorNote ? `Note: ${visitorNote}\n` : ''}\nSent via your Koolink Digital Profile.`
    )

    if (email) {
      window.open(`mailto:${email}?subject=${subject}&body=${bodyText}`, '_blank')
    } else if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone.replace(/^\+/, '')}?text=${bodyText}`, '_blank')
    }

    // Also download visitor's vCard as backup
    const blob = new Blob([exchangeVcard], { type: 'text/vcard;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${visitorName.toLowerCase().replace(/\s+/g, '-')}-contact.vcf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    setExchangeSuccess(true)
  }

  // Generate dynamic QR code encoding the live profile URL
  useEffect(() => {
    let isCurrent = true
    const qrTarget = profileUrl || 'https://sewnet.et'

    QRCode.toDataURL(qrTarget, {
      width: 440,
      margin: 1,
      color: {
        dark: '#1c1917',
        light: '#00000000', // transparent background blends with card
      },
    })
      .then((url) => {
        if (isCurrent) setQrCodeDataUrl(url)
      })
      .catch((err) => {
        console.warn('QR code generation error:', err)
      })

    return () => {
      isCurrent = false
    }
  }, [profileUrl])

  return (
    <div className="intro-card-wrapper" style={{ '--card-accent': accentColor } as CSSProperties}>
      {/* 1. Identity Box (Dark Rounded Card) */}
      <div
        className="intro-identity-card"
        style={
          headerImageUrl
            ? {
                backgroundImage: `linear-gradient(to bottom, rgba(34,34,34,0.7), rgba(34,34,34,0.96)), url(${resolveMediaUrl(headerImageUrl)})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      >
        <div className="intro-avatar-box">
          {avatarUrl && !avatarError ? (
            <img
              src={resolveMediaUrl(avatarUrl)}
              alt={name}
              className="intro-avatar-photo"
              onError={() => setAvatarError(true)}
            />
          ) : (
            <div className="intro-avatar-placeholder">
              <span>{initial}</span>
            </div>
          )}
        </div>

        <div className="intro-identity-meta">
          <h1 className="intro-name">{name || 'Your Name'}</h1>
          {title && <p className="intro-title">{title}</p>}
          {company && <p className="intro-company">{company}</p>}
        </div>
      </div>

      {/* 2. Main Two Action Pills: SAVE CONTACT & CONNECT */}
      <div className="intro-action-pills">
        <button
          type="button"
          className="intro-pill-btn save-contact"
          onClick={handleSaveContact}
          title="Save Contact to your phonebook"
        >
          SAVE CONTACT
        </button>
        <button
          type="button"
          className="intro-pill-btn connect"
          onClick={() => {
            setExchangeSuccess(false)
            setShowExchangeModal(true)
          }}
          title="Exchange contact info"
        >
          CONNECT
        </button>
      </div>

      {/* 2b. Sticky Bottom Mobile Action Bar (Public Profile view) */}
      {!previewOnly && (
        <div className="intro-sticky-mobile-bar">
          <button
            type="button"
            className="intro-pill-btn save-contact"
            onClick={handleSaveContact}
          >
            📥 SAVE CONTACT
          </button>
          <button
            type="button"
            className="intro-pill-btn connect"
            onClick={() => {
              setExchangeSuccess(false)
              setShowExchangeModal(true)
            }}
          >
            💬 CONNECT
          </button>
        </div>
      )}

      {/* 3. Circular Social Icons */}
      {socials.length > 0 && (
        <div className="intro-social-circle-row">
          {socials.map((soc, idx) => (
            <a
              key={idx}
              href={soc.url || '#'}
              target="_blank"
              rel="noreferrer"
              className="intro-social-circle-btn"
              title={soc.label || soc.platform}
            >
              {renderSocialIcon(soc.platform)}
            </a>
          ))}
        </div>
      )}

      {/* 4. Bio Paragraph */}
      {bio && (
        <div className="intro-bio-text">
          {bio}
        </div>
      )}

      {/* 5. Contact Rows with Left Accent Icons and Right Chevron `>` */}
      <div className="intro-contact-list">
        {email && (
          <a href={`mailto:${email}`} className="intro-contact-item">
            <div className="intro-contact-left">
              <span className="intro-contact-icon email">@</span>
              <span className="intro-contact-text">{email}</span>
            </div>
            <span className="intro-contact-arrow">›</span>
          </a>
        )}
        {phone && (
          <a href={`tel:${phone}`} className="intro-contact-item">
            <div className="intro-contact-left">
              <span className="intro-contact-icon phone">📞</span>
              <span className="intro-contact-text">{phone}</span>
            </div>
            <span className="intro-contact-arrow">›</span>
          </a>
        )}
      </div>

      {/* 6. High-Contrast Scannable QR Code */}
      <div className="intro-qr-section">
        <div
          className="intro-qr-box"
          onClick={() => setShowFullscreenQr(true)}
          title="Click to view full-screen QR code"
        >
          {qrCodeDataUrl ? (
            <img src={qrCodeDataUrl} alt="QR Code" className="intro-qr-img" />
          ) : (
            <div className="intro-qr-skeleton" />
          )}
          <span className="intro-qr-hint">⤢ Enlarge</span>
        </div>
        <div className="intro-domain-label">
          {displayUrl || profileUrl.replace(/^https?:\/\//, '')}
        </div>
      </div>

      {/* ── Fullscreen High-Contrast QR Modal ──────────────────────── */}
      {showFullscreenQr && (
        <div className="fullscreen-qr-overlay" onClick={() => setShowFullscreenQr(false)}>
          <div className="fullscreen-qr-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="fullscreen-qr-close"
              onClick={() => setShowFullscreenQr(false)}
              aria-label="Close"
            >
              ×
            </button>

            <div className="fullscreen-qr-header">
              {avatarUrl && !avatarError ? (
                <img
                  src={resolveMediaUrl(avatarUrl)}
                  alt={name}
                  className="fullscreen-qr-avatar"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <div className="fullscreen-qr-fallback">{initial}</div>
              )}
              <h3 className="fullscreen-qr-name">{name}</h3>
              <p className="fullscreen-qr-title">{titleCompany}</p>
            </div>

            {/* Crisp High-Contrast QR Code box */}
            <div className="fullscreen-qr-box">
              {qrCodeDataUrl && (
                <img src={qrCodeDataUrl} alt={`QR Code for ${name}`} className="fullscreen-qr-img" />
              )}
            </div>

            <p style={{ fontSize: 12, color: '#726b63', margin: '4px 0 14px' }}>
              Scan with any smartphone camera to open this digital profile.
            </p>

            <div className="fullscreen-qr-actions">
              <button
                type="button"
                className="btn-qr-action"
                onClick={() => {
                  navigator.clipboard.writeText(profileUrl || window.location.href)
                  showToast('Profile link copied!')
                }}
              >
                Copy Link
              </button>
              <button
                type="button"
                className="btn-qr-action primary"
                onClick={handleShare}
              >
                Share Profile ↗
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Contact Exchange Modal ("Connect Back") ────────────────── */}
      {showExchangeModal && (
        <div className="exchange-overlay" onClick={() => setShowExchangeModal(false)}>
          <div className="exchange-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="fullscreen-qr-close"
              onClick={() => setShowExchangeModal(false)}
              aria-label="Close"
            >
              ×
            </button>

            {!exchangeSuccess ? (
              <>
                <div className="exchange-header">
                  <h3>Connect with {name}</h3>
                  <p>Send your contact information directly so you can stay in touch.</p>
                </div>

                <form className="exchange-form" onSubmit={handleExchangeSubmit}>
                  <label>
                    Your Full Name *
                    <input
                      type="text"
                      required
                      placeholder="e.g. Samuel Alazar"
                      value={visitorName}
                      onChange={(e) => setVisitorName(e.target.value)}
                      autoFocus
                    />
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <label>
                      Phone Number
                      <input
                        type="tel"
                        placeholder="+251 9..."
                        value={visitorPhone}
                        onChange={(e) => setVisitorPhone(e.target.value)}
                      />
                    </label>
                    <label>
                      Email Address
                      <input
                        type="email"
                        placeholder="you@email.com"
                        value={visitorEmail}
                        onChange={(e) => setVisitorEmail(e.target.value)}
                      />
                    </label>
                  </div>

                  <label>
                    Company / Organization (Optional)
                    <input
                      type="text"
                      placeholder="e.g. Horizon Tech"
                      value={visitorCompany}
                      onChange={(e) => setVisitorCompany(e.target.value)}
                    />
                  </label>

                  <label>
                    Add a Note (Optional)
                    <textarea
                      rows={2}
                      placeholder="e.g. Met at the Fintech Summit..."
                      value={visitorNote}
                      onChange={(e) => setVisitorNote(e.target.value)}
                    />
                  </label>

                  <div className="exchange-form-actions">
                    <button
                      type="button"
                      className="btn-qr-action"
                      onClick={() => setShowExchangeModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-qr-action primary"
                    >
                      Exchange Contact ↗
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="exchange-success-box">
                <div className="exchange-success-icon">✓</div>
                <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 6px', color: '#191513' }}>
                  Contact Information Prepared!
                </h3>
                <p style={{ fontSize: 13, color: '#726b63', lineHeight: 1.5, margin: '0 0 20px' }}>
                  Your contact card (.vcf) was generated and pre-filled for direct connection with {name}.
                </p>
                <button
                  type="button"
                  className="btn-qr-action primary"
                  style={{ width: '100%' }}
                  onClick={() => setShowExchangeModal(false)}
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="card-floating-toast" role="status">
          <span>✨</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
