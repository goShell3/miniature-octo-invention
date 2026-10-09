import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import type { PortfolioBlock, PortfolioTheme, SocialLink } from '@amalink/types'

interface PublicProfileData {
  id: string
  subdomain: string
  status: 'draft' | 'published' | 'unpublished'
  theme: PortfolioTheme
  blocks: PortfolioBlock[]
  updatedAt: string
}

interface PublicProfilePageProps {
  subdomain: string
  apiUrl: string
}

function renderSocialIcon(platform: string) {
  switch (platform.toLowerCase()) {
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
        </svg>
      )
    case 'linkedin':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
        </svg>
      )
    case 'telegram':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
          <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.942z"/>
        </svg>
      )
    case 'whatsapp':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
        </svg>
      )
    case 'twitter':
    case 'x':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      )
    case 'tiktok':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
        </svg>
      )
    case 'youtube':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      )
    case 'github':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
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
    default:
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
      )
  }
}

export function PublicProfilePage({ subdomain, apiUrl }: PublicProfilePageProps) {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<PublicProfileData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isCurrent = true
    setLoading(true)
    setError(null)

    // Fetch public portfolio data (with preview=true support)
    fetch(`${apiUrl}/sites/${encodeURIComponent(subdomain)}/data?preview=true`, {
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null)
          throw new Error(body?.message || `Portfolio "${subdomain}" not found or not published`)
        }
        return res.json() as Promise<PublicProfileData>
      })
      .then((data) => {
        if (isCurrent) {
          setProfile(data)
          setLoading(false)
        }
      })
      .catch((err: Error) => {
        if (isCurrent) {
          setError(err.message)
          setLoading(false)
        }
      })

    return () => {
      isCurrent = false
    }
  }, [subdomain, apiUrl])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#faf7f2', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 42, height: 42, borderRadius: 8, background: '#e06b24', color: '#fff', fontSize: 24, fontWeight: 900, display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>S</div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.5, color: '#7a7269' }}>LOADING SEWNET IDENTITY…</div>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#faf7f2', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 440, width: '100%', background: '#fff', border: '1px solid #e6e0d6', borderRadius: 12, padding: 36, textAlign: 'center', boxShadow: '0 12px 30px rgba(0,0,0,0.06)' }}>
          <div style={{ width: 44, height: 44, borderRadius: 8, background: '#e06b24', color: '#fff', fontSize: 24, fontWeight: 800, display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>S</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 10px', color: '#191513' }}>Profile Not Found</h2>
          <p style={{ fontSize: 13, color: '#7a7269', lineHeight: 1.55, margin: '0 0 24px' }}>
            The subdomain <strong>{subdomain}.localhost:5173</strong> is either not registered or currently saved as a draft.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <a
              href="http://localhost:5173"
              style={{ display: 'inline-block', padding: '12px 18px', background: '#e06b24', color: '#fff', borderRadius: 6, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}
            >
              Go to Workspace / Sign In →
            </a>
            <a
              href="http://localhost:5173"
              style={{ fontSize: 12, color: '#7a7269', textDecoration: 'none' }}
            >
              Return to Sewnet Home
            </a>
          </div>
        </div>
      </div>
    )
  }

  const blocks = profile.blocks ?? []
  const theme = profile.theme ?? { accentColor: '#e06b24' }
  const accentColor = theme.accentColor || '#e06b24'

  const hero = blocks.find((b) => b.type === 'hero')
  const about = blocks.find((b) => b.type === 'about')
  const projects = blocks.find((b) => b.type === 'projects')
  const contact = blocks.find((b) => b.type === 'contact')
  const linksBlock = blocks.find((b) => b.type === 'links')

  const heroData = (hero?.type === 'hero' ? hero.data : {}) as {
    name?: string
    tagline?: string
    avatarUrl?: string
    company?: string
    location?: string
    phone?: string
    email?: string
  }

  const contactData = (contact?.type === 'contact' ? contact.data : {}) as {
    email?: string
    phone?: string
    whatsapp?: string
    telegram?: string
    socials?: SocialLink[]
  }

  const name = heroData.name || profile.subdomain
  const tagline = heroData.tagline || ''
  const company = heroData.company || ''
  const location = heroData.location || ''
  const phone = contactData.phone || heroData.phone || ''
  const email = contactData.email || heroData.email || ''
  const whatsapp = contactData.whatsapp || (phone ? phone.replace(/[^0-9]/g, '') : '')
  const telegram = contactData.telegram ? contactData.telegram.replace(/^@/, '') : ''

  const socials = contactData.socials ?? []
  const customLinks = (linksBlock?.type === 'links' ? linksBlock.data?.items : []) ?? []

  const initials = name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'S'

  const isPublished = profile.status === 'published'

  return (
    <div style={{ minHeight: '100vh', background: '#faf7f2', display: 'flex', justifyContent: 'center' }}>
      <main className="nfc-preview-shell" style={{ '--preview-accent': accentColor, margin: '0 auto', width: '100%', maxWidth: 480, minHeight: '100vh', background: '#fff' } as CSSProperties}>
        {/* Top NFC Status Banner */}
        <header className="nfc-banner" style={!isPublished ? { background: 'linear-gradient(135deg, #2b1f13 0%, #191513 100%)' } : undefined}>
          <div className="nfc-status-pill" style={!isPublished ? { color: '#f48935' } : undefined}>
            <span className="nfc-pulse-dot" style={!isPublished ? { background: '#f48935', boxShadow: 'none' } : undefined} />
            <span>
              {isPublished
                ? `LIVE ON SUBDOMAIN · ${subdomain}.localhost:5173`
                : `DRAFT PREVIEW · ${subdomain}.localhost:5173`}
            </span>
          </div>
          <div className="nfc-sewnet-tag">
            <span className="nfc-sewnet-badge">S</span>
            <span>sewnet</span>
          </div>
        </header>

        {/* Profile Hero */}
        <section className="nfc-preview-hero">
          <div className="nfc-avatar-container">
            {heroData.avatarUrl ? (
              <img className="nfc-avatar-img" src={heroData.avatarUrl} alt={name} />
            ) : (
              <div className="nfc-avatar-fallback">{initials}</div>
            )}
            <span className="nfc-verified-badge" title="Sewnet Verified">✓</span>
          </div>

          <h1 className="nfc-profile-name" style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 800 }}>{name}</h1>
          {tagline && <p className="nfc-profile-role" style={{ fontSize: 13, color: '#7a7269', margin: '0 0 12px' }}>{tagline}</p>}

          {(company || location) && (
            <div className="nfc-badges-wrap">
              {company && <span className="nfc-meta-pill">🏢 {company}</span>}
              {location && <span className="nfc-meta-pill">📍 {location}</span>}
            </div>
          )}

          {/* Primary Action: Save to Contacts */}
          <a
            href={`${apiUrl}/sites/${encodeURIComponent(subdomain)}/vcard?preview=true`}
            download={`${subdomain}-contact.vcf`}
            className="nfc-vcard-btn"
            style={{ textDecoration: 'none' }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="8.5" cy="7" r="4"/>
              <line x1="20" y1="8" x2="20" y2="14"/>
              <line x1="23" y1="11" x2="17" y2="11"/>
            </svg>
            <span>Save to Contacts (.vcf)</span>
          </a>

          {/* Quick Actions Row */}
          <div className="nfc-quick-bar">
            {phone && (
              <a href={`tel:${phone}`} className="nfc-quick-item" title="Call">
                <span className="nfc-quick-circle">{renderSocialIcon('phone')}</span>
                <span>Call</span>
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`} className="nfc-quick-item" title="Email">
                <span className="nfc-quick-circle">{renderSocialIcon('email')}</span>
                <span>Email</span>
              </a>
            )}
            {whatsapp && (
              <a href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="nfc-quick-item" title="WhatsApp">
                <span className="nfc-quick-circle">{renderSocialIcon('whatsapp')}</span>
                <span>WhatsApp</span>
              </a>
            )}
            {telegram && (
              <a href={`https://t.me/${telegram}`} target="_blank" rel="noreferrer" className="nfc-quick-item" title="Telegram">
                <span className="nfc-quick-circle">{renderSocialIcon('telegram')}</span>
                <span>Telegram</span>
              </a>
            )}
          </div>
        </section>

        {/* Connect & Socials Section */}
        {socials.length > 0 && (
          <div className="nfc-preview-section">
            <div className="nfc-section-title">Connect &amp; Socials</div>
            <div className="nfc-social-cards">
              {socials.map((soc, idx) => (
                <a
                  key={`soc-${idx}`}
                  href={soc.url || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="nfc-social-row"
                  data-platform={soc.platform.toLowerCase()}
                >
                  <div className="nfc-social-left">
                    <span className="nfc-social-icon">{renderSocialIcon(soc.platform)}</span>
                    <div className="nfc-social-meta">
                      <strong>{soc.label || soc.platform}</strong>
                      <span>{soc.handle || soc.url || 'Connect'}</span>
                    </div>
                  </div>
                  <span className="nfc-social-arrow">↗</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Custom Links Section */}
        {customLinks.length > 0 && (
          <div className="nfc-preview-section">
            <div className="nfc-section-title">{linksBlock?.data?.title || 'Links'}</div>
            <div className="nfc-social-cards">
              {customLinks.map((item, idx) => (
                <a
                  key={`link-${idx}`}
                  href={item.url || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="nfc-social-row"
                >
                  <div className="nfc-social-left">
                    <span className="nfc-social-icon">{renderSocialIcon(item.platform || 'website')}</span>
                    <div className="nfc-social-meta">
                      <strong>{item.title}</strong>
                      <span>{item.subtitle || item.url}</span>
                    </div>
                  </div>
                  <span className="nfc-social-arrow">↗</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* About Section */}
        {about?.type === 'about' && about.data?.body && (
          <div className="nfc-preview-section">
            <div className="nfc-section-title">{about.data.title || 'About'}</div>
            <div className="nfc-preview-about-box">{about.data.body}</div>
          </div>
        )}

        {/* Projects Section */}
        {projects?.type === 'projects' && Array.isArray(projects.data?.items) && projects.data.items.length > 0 && (
          <div className="nfc-preview-section">
            <div className="nfc-section-title">Featured Work</div>
            {projects.data.items.map((proj, pIdx) => (
              <div key={`proj-${pIdx}`} className="nfc-preview-project-card">
                <span className="nfc-project-tag">{String(pIdx + 1).padStart(2, '0')}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="nfc-project-title">{proj.title || 'Project Title'}</div>
                  {proj.description && <div className="nfc-project-desc">{proj.description}</div>}
                  {proj.link && (
                    <a href={proj.link} target="_blank" rel="noreferrer" className="nfc-project-link">
                      View Project ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Exchange Contact Banner */}
        {(phone || email) && (
          <div className="nfc-preview-section">
            <div style={{ background: '#f7f2ea', border: '1px dashed var(--preview-accent)', borderRadius: 8, padding: 18, textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 800, margin: '0 0 6px', color: '#191513' }}>Stay in touch</div>
              <p style={{ fontSize: 12, color: '#7a7269', margin: '0 0 14px' }}>
                Tap below to send your contact information back or schedule an appointment.
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                {email && (
                  <a
                    href={`mailto:${email}?subject=Connecting%20via%20Sewnet%20NFC%20Card`}
                    style={{ padding: '8px 14px', background: 'var(--preview-accent)', color: '#fff', fontSize: 12, fontWeight: 700, borderRadius: 4, textDecoration: 'none' }}
                  >
                    Send Email
                  </a>
                )}
                {phone && (
                  <a
                    href={`tel:${phone}`}
                    style={{ padding: '8px 14px', background: '#fff', color: '#191513', border: '1px solid #e6e0d6', fontSize: 12, fontWeight: 700, borderRadius: 4, textDecoration: 'none' }}
                  >
                    Call Directly
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="nfc-preview-footer">
          <a href="http://localhost:5173" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', color: '#191513', marginBottom: 6 }}>
            <span style={{ background: accentColor, color: '#fff', width: 18, height: 18, borderRadius: 4, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800 }}>S</span>
            <strong style={{ fontSize: 13 }}>sewnet</strong>
          </a>
          <div style={{ margin: '4px 0 10px', color: '#7a7269', fontSize: 11 }}>
            One identity. One tap. Every connection measured.
          </div>
          <a
            href="http://localhost:5173"
            style={{ fontSize: 11, color: accentColor, fontWeight: 700, textDecoration: 'none' }}
          >
            Order your own NFC Smart Business Card →
          </a>
        </footer>
      </main>
    </div>
  )
}
