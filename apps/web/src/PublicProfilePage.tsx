import { useEffect, useState } from 'react'
import type { PortfolioBlock, PortfolioTheme, SocialLink } from '@amalink/types'
import { DigitalCard } from './DigitalCard'
import { getPortfolioDomainLabel, getPortfolioSubdomainUrl } from './url-helpers'
import { BrandLogo } from './BrandLogo'

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
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#131110', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <img src="/icon.svg" alt="Koolink" style={{ width: 44, height: 44, margin: '0 auto 16px' }} />
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: '#a89f91' }}>LOADING DIGITAL CARD…</div>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#131110', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 420, width: '100%', background: '#1c1815', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 20, padding: 36, textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
          <img src="/icon.svg" alt="Koolink" style={{ width: 44, height: 44, margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 10px', color: '#f6f5f2' }}>Profile Not Found</h2>
          <p style={{ fontSize: 13, color: '#a89f91', lineHeight: 1.55, margin: '0 0 24px' }}>
            The profile <strong>"{subdomain}"</strong> was not found or is currently saved as an unpublished draft.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <a
              href="/"
              style={{ display: 'inline-block', padding: '12px 18px', background: '#ff3535', color: '#fff', borderRadius: 8, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}
            >
              Go to Workspace / Sign In →
            </a>
            <a
              href="/"
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
  const vcardUrl = `${apiUrl}/sites/${encodeURIComponent(subdomain)}/vcard?preview=true`

  const [syncToast, setSyncToast] = useState(false)

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

  const projects = blocks.find((b) => b.type === 'projects')
  const linksBlock = blocks.find((b) => b.type === 'links')

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at 50% 20%, #1f1a17 0%, #12100e 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '36px 16px 48px',
      boxSizing: 'border-box',
    }}>
      {/* Contact sync feedback toast */}
      {syncToast && (
        <div style={{
          position: 'fixed',
          top: 16,
          zIndex: 999,
          background: '#ff3535',
          color: '#fff',
          padding: '10px 18px',
          borderRadius: 9999,
          fontSize: 12,
          fontWeight: 700,
          boxShadow: '0 8px 24px rgba(255, 53, 53, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span>📇</span>
          <span>Syncing contact to your phonebook…</span>
        </div>
      )}
      {/* Top Status & Brand Lockup */}
      <header style={{
        width: '100%',
        maxWidth: 380,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 12px',
          borderRadius: 9999,
          background: isPublished ? 'rgba(255, 53, 53, 0.15)' : 'rgba(255, 255, 255, 0.08)',
          border: isPublished ? '1px solid rgba(255, 53, 53, 0.3)' : '1px solid rgba(255, 255, 255, 0.12)',
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: 0.8,
          color: isPublished ? '#f48935' : '#a89f91',
        }}>
          <span style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: isPublished ? '#ff3535' : '#a89f91',
            boxShadow: isPublished ? '0 0 8px #ff3535' : 'none',
          }} />
          <span>{isPublished ? `LIVE · ${subdomain}` : `DRAFT PREVIEW · ${subdomain}`}</span>
        </div>

        <a href="/" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          textDecoration: 'none',
          color: '#f6f5f2',
          fontSize: 12,
          fontWeight: 800,
        }}>
          <BrandLogo variant="profile" />
        </a>
      </header>

      {/* Centerpiece Digital Card matching the attached mockup */}
      <main style={{ width: '100%', maxWidth: 380 }}>
        <DigitalCard
          name={name}
          title={title}
          company={company}
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
      </main>

      {/* Featured Projects if any exist in the portfolio */}
      {projects?.type === 'projects' && Array.isArray(projects.data?.items) && projects.data.items.length > 0 && (
        <section style={{ width: '100%', maxWidth: 380, marginTop: 20 }}>
          <h2 style={{ fontSize: 11, fontWeight: 800, color: '#a89f91', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 10px 4px' }}>
            Featured Work
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {projects.data.items.map((proj, pIdx) => (
              <div key={pIdx} style={{ background: '#1c1815', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 12, padding: 14, color: '#f6f5f2' }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>{proj.title}</div>
                {proj.description && <div style={{ fontSize: 12, color: '#a89f91', marginTop: 4, lineHeight: 1.45 }}>{proj.description}</div>}
                {proj.link && (
                  <a href={proj.link} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: accentColor, textDecoration: 'none', display: 'inline-block', marginTop: 8, fontWeight: 700 }}>
                    View Project ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Custom Links if any exist */}
      {linksBlock?.type === 'links' && Array.isArray(linksBlock.data?.items) && linksBlock.data.items.length > 0 && (
        <section style={{ width: '100%', maxWidth: 380, marginTop: 20 }}>
          <h2 style={{ fontSize: 11, fontWeight: 800, color: '#a89f91', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 10px 4px' }}>
            {linksBlock.data.title || 'Links'}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {linksBlock.data.items.map((item, lIdx) => (
              <a
                key={lIdx}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#1c1815',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 12,
                  padding: '12px 16px',
                  color: '#fff',
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <span>{item.title}</span>
                <span style={{ color: accentColor }}>↗</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Subtle Footer */}
      <footer style={{ marginTop: 28, textAlign: 'center', maxWidth: 360 }}>
        <div style={{ color: '#7a7269', fontSize: 11, lineHeight: 1.5 }}>
          One identity. One tap. Every connection measured.
        </div>
        <a
          href="/"
          style={{ display: 'inline-block', marginTop: 6, fontSize: 11, color: '#f48935', fontWeight: 700, textDecoration: 'none' }}
        >
          Create your own Tap-to-Share NFC Card →
        </a>
      </footer>
    </div>
  )
}
