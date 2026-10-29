import { useEffect, useState } from 'react'
import type { PortfolioBlock, PortfolioTheme, SocialLink } from '@amalink/types'
import { DigitalCard } from './DigitalCard'
import { getPortfolioDomainLabel, getPortfolioSubdomainUrl } from './url-helpers'
import { BrandLogo } from './BrandLogo'
import { resolveMediaUrl } from './config'
import './PublicProfile.css'

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

export function PublicProfilePage({ subdomain, apiUrl }: PublicProfilePageProps) {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<PublicProfileData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [syncToast, setSyncToast] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  function getRootHomeUrl(): string {
    if (typeof window === 'undefined') return 'https://www.koo-link.com'
    const hostname = window.location.hostname.toLowerCase()
    if (hostname.endsWith('.localhost')) {
      const port = window.location.port ? `:${window.location.port}` : ''
      return `http://localhost${port}`
    }
    const parts = hostname.split('.')
    if (parts.length > 2) {
      const baseDomain = parts.slice(1).join('.')
      return `${window.location.protocol}//${baseDomain.startsWith('www.') ? baseDomain : `www.${baseDomain}`}`
    }
    return `${window.location.protocol}//${window.location.host}`
  }

  const vcardUrl = `${apiUrl}/sites/${encodeURIComponent(subdomain)}/vcard?preview=true`

  useEffect(() => {
    let isCurrent = true
    setLoading(true)
    setError(null)

    // Fetch public portfolio data (with preview=true support)
    fetch(`${apiUrl}/sites/${encodeURIComponent(subdomain)}/data?preview=true`, {
      credentials: 'omit',
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
  }, [subdomain, apiUrl, retryKey])

  // Auto-trigger contact sync when scanned from QR code or NFC tap with ?sync=vcf
  useEffect(() => {
    if (!profile) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('sync') === 'vcf' || params.get('sync') === '1') {
      setSyncToast(true)
      const timer = setTimeout(() => {
        const link = document.createElement('a')
        link.href = vcardUrl
        link.download = `${subdomain}-contact.vcf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [profile, vcardUrl, subdomain])

  if (loading) {
    return (
      <div className="public-profile-viewport" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <img src="/icon.svg" alt="Koolink" style={{ width: 44, height: 44, margin: '0 auto 16px' }} />
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: '#a89f91' }}>LOADING DIGITAL CARD…</div>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    const homeUrl = getRootHomeUrl()
    return (
      <div className="public-profile-viewport" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
        <div style={{ maxWidth: 440, width: '100%', background: '#1c1815', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: 20, padding: 36, textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
          <img src="/icon.svg" alt="Koolink" style={{ width: 44, height: 44, margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 10px', color: '#f6f5f2' }}>Profile Not Found</h2>
          <p style={{ fontSize: 13, color: '#a89f91', lineHeight: 1.55, margin: '0 0 20px' }}>
            The profile <strong>"{subdomain}"</strong> was not found or is currently saved as an unpublished draft.
          </p>

          <button
            type="button"
            onClick={() => setRetryKey((k) => k + 1)}
            style={{
              display: 'inline-block',
              width: '100%',
              padding: '11px 18px',
              background: '#2b2622',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#f6f5f2',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              marginBottom: 12,
            }}
          >
            ↻ Retry Connecting to Server
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <a
              href={`${homeUrl}/`}
              style={{ display: 'inline-block', padding: '12px 18px', background: '#ff3535', color: '#fff', borderRadius: 8, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}
            >
              Go to Workspace / Sign In →
            </a>
            <a
              href={`${homeUrl}/`}
              style={{ fontSize: 12, color: '#7a7269', textDecoration: 'none' }}
            >
              Return to Koolink Home
            </a>
          </div>
        </div>
      </div>
    )
  }

  const blocks = profile.blocks ?? []
  const theme = profile.theme ?? { accentColor: '#ff3535' }
  const accentColor = theme.accentColor || '#ff3535'

  const hero = blocks.find((b) => b.type === 'hero')
  const about = blocks.find((b) => b.type === 'about')
  const contact = blocks.find((b) => b.type === 'contact')

  const heroData = (hero?.type === 'hero' ? hero.data : {}) as {
    name?: string
    tagline?: string
    avatarUrl?: string
    headerImageUrl?: string
    company?: string
    companyLogoUrl?: string
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
  const title = heroData.tagline || ''
  const company = heroData.company || ''
  const bio = (about?.type === 'about' && about.data?.body) ? about.data.body : ''
  const phone = contactData.phone || heroData.phone || ''
  const email = contactData.email || heroData.email || ''
  const socials = contactData.socials ?? []

  const isPublished = profile.status === 'published'
  const profileUrl = getPortfolioSubdomainUrl(subdomain, !isPublished)
  const displayUrl = getPortfolioDomainLabel(subdomain)

  const projects = blocks.find((b) => b.type === 'projects')
  const linksBlock = blocks.find((b) => b.type === 'links')

  const hasProjects = Boolean(projects?.type === 'projects' && Array.isArray(projects.data?.items) && projects.data.items.length > 0)
  const hasLinks = Boolean(linksBlock?.type === 'links' && Array.isArray(linksBlock.data?.items) && linksBlock.data.items.length > 0)
  const hasSidebarContent = hasProjects || hasLinks

  return (
    <div
      className="public-profile-viewport"
      style={{
        '--profile-accent': accentColor,
        ...(heroData.headerImageUrl
          ? {
              backgroundImage: `linear-gradient(to bottom, rgba(18, 16, 14, 0.72) 0%, rgba(18, 16, 14, 0.96) 520px, #12100e 100%))`,
              backgroundSize: '100% auto, cover',
              backgroundPosition: 'top center',
              backgroundRepeat: 'no-repeat',
            }
          : {}),
      } as React.CSSProperties}
    >
      {/* Contact sync feedback toast */}
      {syncToast && (
        <div style={{
          position: 'fixed',
          top: 16,
          zIndex: 999,
          background: accentColor,
          color: '#fff',
          padding: '10px 18px',
          borderRadius: 9999,
          fontSize: 12,
          fontWeight: 700,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span>📇</span>
          <span>Syncing contact to your phonebook…</span>
        </div>
      )}

      <div className="public-profile-shell">
        {/* Top Status & Brand Lockup */}
        <header className="public-profile-header">
          {!isPublished ? (
            <div className="profile-draft-pill">
              <span className="profile-draft-dot" />
              <span>Draft Preview</span>
            </div>
          ) : (
            <div />
          )}

          <a href="/" className="profile-brand-link">
            <BrandLogo variant="profile" />
          </a>
        </header>

        {/* Responsive Showcase Grid (Dual Column on Laptop, Single Column on Mobile) */}
        <main className={`profile-main-grid ${hasSidebarContent ? 'has-sidebar' : 'single-column'}`}>
          {/* Main Digital Card Column */}
          <div className="profile-card-column">
            <DigitalCard
              name={name}
              title={title}
              company={company}
              companyLogoUrl={heroData.companyLogoUrl}
              bio={bio}
              avatarUrl={heroData.avatarUrl}
              headerImageUrl={heroData.headerImageUrl}
              phone={phone}
              email={email}
              socials={socials}
              accentColor={accentColor}
              profileUrl={profileUrl}
              displayUrl={displayUrl}
              vcardDownloadUrl={vcardUrl}
              vcardFilename={`${subdomain}-contact.vcf`}
            />
          </div>

          {/* Right Column: Featured Work & Custom Links on Laptop/Tablet */}
          {hasSidebarContent && (
            <div className="profile-content-column">
              {hasProjects && projects && (
                <section>
                  <div className="profile-section-heading">
                    <h2 className="profile-section-title">Featured Work</h2>
                    <span className="profile-section-count">{projects.data.items.length} PROJECTS</span>
                  </div>
                  <div className="projects-responsive-grid">
                    {projects.data.items.map((proj, pIdx) => (
                      <article key={pIdx} className="project-showcase-card">
                        {proj.imageUrl && (
                          <div className="project-card-image-wrap">
                            <img
                              src={resolveMediaUrl(proj.imageUrl)}
                              alt={proj.title}
                              className="project-card-img"
                            />
                          </div>
                        )}
                        <div className="project-card-body">
                          <h3 className="project-card-title">{proj.title}</h3>
                          {proj.description && (
                            <p className="project-card-desc">{proj.description}</p>
                          )}
                          {proj.link && (
                            <a
                              href={proj.link}
                              target="_blank"
                              rel="noreferrer"
                              className="project-card-link-btn"
                            >
                              <span>View Project</span>
                              <span>↗</span>
                            </a>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {hasLinks && linksBlock && (
                <section>
                  <div className="profile-section-heading">
                    <h2 className="profile-section-title">{linksBlock.data.title || 'Custom Links'}</h2>
                    <span className="profile-section-count">{linksBlock.data.items.length} LINKS</span>
                  </div>
                  <div className="custom-links-container">
                    {linksBlock.data.items.map((item, lIdx) => (
                      <a
                        key={lIdx}
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="custom-link-tile"
                      >
                        <span>{item.title}</span>
                        <span className="custom-link-arrow">↗</span>
                      </a>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </main>

        {/* Subtle Footer */}
        <footer className="public-profile-footer">
          <a
            href="/"
            className="profile-powered-link"
          >
            <span>Powered by</span>
            <strong style={{ color: '#f6f5f2' }}>Koolink</strong>
            <span style={{ color: '#7a7269' }}>·</span>
            <span style={{ color: accentColor }}>Create yours →</span>
          </a>
        </footer>
      </div>
    </div>
  )
}
