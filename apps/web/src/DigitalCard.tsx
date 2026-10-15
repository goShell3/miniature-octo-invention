import { useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import QRCode from 'qrcode'
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
  phone = '',
  email = '',
  socials = [],
  accentColor = '#eb6307',
  profileUrl = 'https://sewnet.et/yourname',
  displayUrl = 'koo.link/yourname',
  previewOnly = false,
  initialQrMode = 'vcard',
  onSaveVcard,
  vcardDownloadUrl,
  vcardFilename,
}: DigitalCardProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
  // qrMode: 'vcard' directly syncs contact when scanned by phone camera!
  const [qrMode, setQrMode] = useState<'vcard' | 'url'>(initialQrMode)

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

  // Generate dynamic QR code: encodes either direct vCard for instant camera sync, or live web URL with ?sync=vcf
  useEffect(() => {
    let isCurrent = true

    let qrTarget = ''
    if (qrMode === 'vcard') {
      qrTarget = buildVCardText({
        name,
        title,
        company,
        phone,
        email,
        bio,
        profileUrl,
        socials,
      })
    } else {
      const url = profileUrl || 'https://sewnet.et'
      qrTarget = `${url}${url.includes('?') ? '&' : '?'}sync=vcf`
    }

    QRCode.toDataURL(qrTarget, {
      width: 400,
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
  }, [qrMode, name, title, company, phone, email, bio, profileUrl, socials])

  return (
    <div className="digital-card-container" style={{ '--card-accent': accentColor } as CSSProperties}>
      <div className="digital-card">
        {/* Top Orange Header Banner */}
        <div className="card-top-banner" />

        {/* Centered Circular Avatar overlapping banner and card body */}
        <div className="card-avatar-wrapper">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="card-avatar-img" />
          ) : (
            <div className="card-avatar-fallback">{initial}</div>
          )}
        </div>

        {/* Card Content Section */}
        <div className="card-content">
          <h1 className="card-name">{name || 'Your Name'}</h1>

          <p className="card-title-company">{titleCompany}</p>

          <p className="card-bio">
            {bio || 'Your short bio appears here.'}
          </p>

          {/* Side-by-side Action Buttons: Call & Email */}
          <div className="card-action-row">
            <a
              href={phone ? `tel:${phone}` : '#'}
              className="card-pill-btn call-btn"
              onClick={previewOnly && !phone ? (e) => e.preventDefault() : undefined}
            >
              Call
            </a>
            <a
              href={email ? `mailto:${email}` : '#'}
              className="card-pill-btn email-btn"
              onClick={previewOnly && !email ? (e) => e.preventDefault() : undefined}
            >
              Email
            </a>
          </div>

          {/* Social Icons row if any present */}
          {socials.length > 0 && (
            <div className="card-social-row">
              {socials.map((soc, idx) => (
                <a
                  key={idx}
                  href={soc.url || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="card-social-btn"
                  title={soc.label || soc.platform}
                >
                  {renderSocialIcon(soc.platform)}
                </a>
              ))}
            </div>
          )}

          {/* QR Scan Sync Mode Toggle */}
          <div className="card-qr-mode-wrap">
            <div className="card-qr-mode-toggle" role="group" aria-label="QR Code scan mode">
              <button
                type="button"
                className={`qr-mode-pill ${qrMode === 'vcard' ? 'active' : ''}`}
                onClick={() => setQrMode('vcard')}
                title="When scanned by camera, directly adds contact to phonebook"
              >
                <span>📇 Camera Sync (vCard)</span>
              </button>
              <button
                type="button"
                className={`qr-mode-pill ${qrMode === 'url' ? 'active' : ''}`}
                onClick={() => setQrMode('url')}
                title="When scanned, opens full digital profile in browser"
              >
                <span>🌐 Web Profile</span>
              </button>
            </div>
          </div>

          {/* Centerpiece QR Code */}
          <div className="card-qr-box">
            {qrCodeDataUrl ? (
              <img src={qrCodeDataUrl} alt="QR Code" className="card-qr-image" />
            ) : (
              <div className="card-qr-skeleton" />
            )}
          </div>

          <div className="card-qr-subhint">
            {qrMode === 'vcard'
              ? 'Point camera to sync contact directly to phone'
              : 'Point camera to open web profile & download contact'}
          </div>

          {/* Profile URL Footer */}
          <div className="card-url-footer">
            <a href={profileUrl} target="_blank" rel="noreferrer" className="card-url-text">
              {displayUrl || profileUrl.replace(/^https?:\/\//, '')}
            </a>
          </div>
        </div>
      </div>

      {/* Save Contact action for NFC taps (vCard download) */}
      {!previewOnly && (vcardDownloadUrl || onSaveVcard) && (
        <div className="card-vcard-action-bar">
          {vcardDownloadUrl ? (
            <a
              href={vcardDownloadUrl}
              download={vcardFilename || 'contact.vcf'}
              className="card-save-vcard-btn"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <line x1="20" y1="8" x2="20" y2="14"/>
                <line x1="23" y1="11" x2="17" y2="11"/>
              </svg>
              <span>Save Contact to Phone (.vcf)</span>
            </a>
          ) : (
            <button
              type="button"
              onClick={onSaveVcard}
              className="card-save-vcard-btn"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <line x1="20" y1="8" x2="20" y2="14"/>
                <line x1="23" y1="11" x2="17" y2="11"/>
              </svg>
              <span>Save Contact to Phone (.vcf)</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
