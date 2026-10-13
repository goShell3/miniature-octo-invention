import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import type { PortfolioBlock, PortfolioTheme, SocialLink } from '@amalink/types'
import { authClient } from './auth-client'
import { HomePage } from './HomePage'
import { SetupWizard, wizardDataToBlocks } from './SetupWizard'
import type { WizardData } from './SetupWizard'
import { NfcStudio } from './NfcStudio'
import { PublicProfilePage } from './PublicProfilePage'
import './Builder.css'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export function getSubdomain(): string | null {
  if (typeof window === 'undefined') return null
  const hostname = window.location.hostname.toLowerCase()
  const searchParams = new URLSearchParams(window.location.search)

  // 1. Explicit query param takes priority (e.g. ?subdomain=robben)
  const querySub = searchParams.get('subdomain')
  if (querySub) {
    const clean = querySub.trim().toLowerCase()
    if (clean && clean !== 'www' && clean !== 'app' && clean !== 'api') {
      return clean
    }
  }

  // 2. Localhost subdomains: e.g. "robben.localhost"
  if (hostname.endsWith('.localhost')) {
    const sub = hostname.slice(0, -'.localhost'.length)
    if (sub && sub !== 'www' && sub !== 'app' && sub !== 'api') {
      return sub
    }
  }

  // 3. Plain local hostnames - main app workspace
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
    return null
  }

  // 4. Cloud deployment hostnames (Vercel, Render, Cloudflare, etc.) are the main application
  if (
    hostname.endsWith('.vercel.app') ||
    hostname.endsWith('.onrender.com') ||
    hostname.endsWith('.pages.dev') ||
    hostname.endsWith('.trycloudflare.com')
  ) {
    return null
  }

  // 5. Custom Domain via VITE_ROOT_DOMAIN (e.g. sewnet.et)
  const rootDomain = import.meta.env.VITE_ROOT_DOMAIN?.toLowerCase()
  if (rootDomain && hostname.endsWith(`.${rootDomain}`)) {
    const sub = hostname.slice(0, -(`.${rootDomain}`).length)
    if (sub && sub !== 'www' && sub !== 'app' && sub !== 'api') {
      return sub
    }
  }

  // 6. Generic Multi-level production domain (e.g. robben.sewnet.et)
  const parts = hostname.split('.')
  if (parts.length > 2) {
    const sub = parts[0]
    if (sub && sub !== 'www' && sub !== 'app' && sub !== 'api') {
      return sub
    }
  }

  return null
}

export function getPortfolioSubdomainUrl(subdomain: string, preview = false): string {
  if (typeof window === 'undefined') return `?subdomain=${encodeURIComponent(subdomain)}`
  const hostname = window.location.hostname.toLowerCase()
  const port = window.location.port ? `:${window.location.port}` : ''
  const previewParam = preview ? 'preview=true' : ''

  // 1. Localhost: use native <subdomain>.localhost:<port>
  if (hostname.endsWith('.localhost') || hostname === 'localhost' || hostname === '127.0.0.1') {
    const query = previewParam ? `?${previewParam}` : ''
    return `http://${subdomain}.localhost${port}/${query}`
  }

  // 2. Vercel / Render cloud domains: route via query param since wildcards don't exist on *.vercel.app
  if (hostname.endsWith('.vercel.app') || hostname.endsWith('.onrender.com')) {
    const query = `?subdomain=${encodeURIComponent(subdomain)}${preview ? '&preview=true' : ''}`
    return `${window.location.protocol}//${window.location.host}/${query}`
  }

  // 3. Custom domain via VITE_ROOT_DOMAIN (e.g. sewnet.et)
  const rootDomain = import.meta.env.VITE_ROOT_DOMAIN?.toLowerCase()
  if (rootDomain) {
    const query = previewParam ? `?${previewParam}` : ''
    return `${window.location.protocol}//${subdomain}.${rootDomain}${port}/${query}`
  }

  // 4. Custom multi-level domain (e.g. sewnet.et -> robben.sewnet.et)
  const hostParts = hostname.split('.')
  const rootHost = hostParts.length > 2 ? hostParts.slice(1).join('.') : hostname
  const query = previewParam ? `?${previewParam}` : ''
  return `${window.location.protocol}//${subdomain}.${rootHost}${port}/${query}`
}

export function getPortfolioDomainLabel(subdomain: string): string {
  if (typeof window === 'undefined') return subdomain
  const hostname = window.location.hostname.toLowerCase()
  if (hostname.endsWith('.localhost') || hostname === 'localhost' || hostname === '127.0.0.1') {
    const port = window.location.port ? `:${window.location.port}` : ''
    return `${subdomain}.localhost${port}`
  }
  if (hostname.endsWith('.vercel.app') || hostname.endsWith('.onrender.com')) {
    return `${window.location.host}/?subdomain=${subdomain}`
  }
  const rootDomain = import.meta.env.VITE_ROOT_DOMAIN?.toLowerCase()
  if (rootDomain) {
    return `${subdomain}.${rootDomain}`
  }
  const hostParts = hostname.split('.')
  const rootHost = hostParts.length > 2 ? hostParts.slice(1).join('.') : hostname
  return `${subdomain}.${rootHost}`
}

interface User {
  id: string
  email: string
}

interface Portfolio {
  id: string
  subdomain: string
  status: 'draft' | 'published' | 'unpublished'
  theme: PortfolioTheme
  updatedAt: string
  content: { version: number; blocks: PortfolioBlock[] } | null
}

async function apiRequest<T>(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers)
  if (options.body) headers.set('Content-Type', 'application/json')

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string | string[] } | null
    const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message
    throw new Error(message ?? `Request failed (${response.status})`)
  }
  return response.json() as Promise<T>
}

function initialBlocks(): PortfolioBlock[] {
  return [
    {
      type: 'hero',
      data: {
        name: 'Roben Bayisa',
        tagline: 'Technology Strategist & Founder',
        company: 'Sewnet Digital',
        location: 'Addis Ababa, Ethiopia',
        avatarUrl: '',
        phone: '+251 91 123 4567',
        email: 'roben@sewnet.et',
      },
    },
    {
      type: 'contact',
      data: {
        email: 'roben@sewnet.et',
        phone: '+251 91 123 4567',
        whatsapp: '+251 91 123 4567',
        telegram: '@roben_b',
        socials: [
          { platform: 'instagram', url: 'https://instagram.com/roben_b', label: 'Instagram', handle: '@roben_b' },
          { platform: 'linkedin', url: 'https://linkedin.com/in/roben-bayisa', label: 'LinkedIn', handle: 'in/roben-bayisa' },
          { platform: 'telegram', url: 'https://t.me/roben_b', label: 'Telegram', handle: '@roben_b' },
          { platform: 'whatsapp', url: 'https://wa.me/251911234567', label: 'WhatsApp', handle: '+251 91 123 4567' },
        ],
      },
    },
    {
      type: 'about',
      data: {
        body: 'Building next-generation contactless digital identity platforms and connecting ambitious professionals across Ethiopia and beyond.',
      },
    },
    {
      type: 'projects',
      data: {
        items: [
          {
            title: 'Sewnet NFC Smart Cards',
            description: 'Intelligent physical NFC cards paired with real-time portfolio analytics and instant contact exchange.',
            link: 'https://sewnet.et',
          },
        ],
      },
    },
  ]
}

function WorkspaceApp() {
  const [user, setUser] = useState<User | null>(null)
  const [viewLanding, setViewLanding] = useState(false)
  const [isSessionPending, setIsSessionPending] = useState(true)
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [selected, setSelected] = useState<Portfolio | null>(null)
  const [showNfcStudio, setShowNfcStudio] = useState(false)
  const [blocks, setBlocks] = useState<PortfolioBlock[]>([])
  const [theme, setTheme] = useState<PortfolioTheme>({ id: 'minimal', accentColor: '#e06b24' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [activeBlock, setActiveBlock] = useState(0)
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [authProviders, setAuthProviders] = useState({ google: false, facebook: false })
  // Wizard: shown when user has no portfolios yet, or when creating a new one via dashboard
  const [showWizard, setShowWizard] = useState(false)
  const [wizardBusy, setWizardBusy] = useState(false)
  const [wizardError, setWizardError] = useState('')

  // Restore session on mount
  useEffect(() => {
    let isCurrent = true
    authClient.getSession().then(({ data, error: sessionError }) => {
      if (!isCurrent) return
      if (sessionError) console.warn('Session restore error:', sessionError.message)
      setUser(data?.user ? { id: data.user.id, email: data.user.email } : null)
      setIsSessionPending(false)
    }).catch((reason: unknown) => {
      if (!isCurrent) return
      console.warn('Session restore failed:', reason)
      setIsSessionPending(false)
    })
    return () => { isCurrent = false }
  }, [])

  // Poll API health
  useEffect(() => {
    let isCurrent = true
    function check() {
      fetch(`${API_URL}/health`)
        .then((r) => { if (isCurrent) setApiStatus(r.ok ? 'online' : 'offline') })
        .catch(() => { if (isCurrent) setApiStatus('offline') })
    }
    check()
    return () => { isCurrent = false }
  }, [])

  // Fetch available OAuth providers
  useEffect(() => {
    let isCurrent = true
    fetch(`${API_URL}/auth/providers`)
      .then((r) => r.ok ? r.json() as Promise<typeof authProviders> : null)
      .then((providers) => { if (isCurrent && providers) setAuthProviders(providers) })
      .catch(() => undefined)
    return () => { isCurrent = false }
  }, [])

  // Load portfolios when user is known
  useEffect(() => {
    if (!user) {
      setPortfolios([])
      return
    }
    let isCurrent = true
    apiRequest<Portfolio[]>('/portfolios/me').then((items) => {
      if (!isCurrent) return
      setPortfolios(items)
      // First-time user: launch the guided wizard immediately
      if (items.length === 0) setShowWizard(true)
    }).catch((reason: Error) => {
      if (!isCurrent) return
      setError(reason.message)
    })
    return () => { isCurrent = false }
  }, [user?.id])

  // ── Wizard handlers ─────────────────────────────────────────────────────────

  async function checkSubdomainForWizard(subdomain: string): Promise<boolean> {
    const result = await apiRequest<{ available: boolean }>(
      `/portfolios/subdomain-availability?name=${encodeURIComponent(subdomain)}`
    )
    return result.available
  }

  async function finishWizard(data: WizardData) {
    setWizardBusy(true)
    setWizardError('')
    try {
      const portfolio = await apiRequest<Portfolio>('/portfolios', {
        method: 'POST',
        body: JSON.stringify({
          subdomain: data.subdomain,
          blocks: wizardDataToBlocks(data),
          theme: { id: 'minimal', accentColor: data.accentColor },
        }),
      })
      const next: Portfolio = {
        ...portfolio,
        content: portfolio.content ?? { version: 1, blocks: wizardDataToBlocks(data) },
      }
      setPortfolios((current) => [next, ...current])
      setShowWizard(false)
      selectPortfolio(next)
    } catch (reason) {
      setWizardError(reason instanceof Error ? reason.message : 'Unable to create portfolio')
    } finally {
      setWizardBusy(false)
    }
  }

  // ── Portfolio selection ──────────────────────────────────────────────────────

  function selectPortfolio(portfolio: Portfolio) {
    setSelected(portfolio)
    setShowNfcStudio(false)
    setBlocks(portfolio.content?.blocks ?? initialBlocks())
    setTheme(portfolio.theme)
    setActiveBlock(0)
    setMessage('')
    setError('')
  }

  async function saveDraft() {
    if (!selected) return
    setBusy(true)
    setError('')
    try {
      const updated = await apiRequest<Portfolio>(`/portfolios/${selected.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ theme, blocks }),
      })
      setSelected(updated)
      setPortfolios((current) => current.map((item) => item.id === updated.id ? updated : item))
      setMessage(`Draft saved! Preview at ${getPortfolioSubdomainUrl(updated.subdomain, true)}`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save draft')
    } finally {
      setBusy(false)
    }
  }

  async function publishPortfolio() {
    if (!selected) return
    setBusy(true)
    setError('')
    try {
      const updated = await apiRequest<Portfolio>(`/portfolios/${selected.id}/publish`, { method: 'POST' })
      setSelected(updated)
      setPortfolios((current) => current.map((item) => item.id === updated.id ? updated : item))
      setMessage(`Published! Live at ${getPortfolioSubdomainUrl(updated.subdomain, false)}`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to publish portfolio')
    } finally {
      setBusy(false)
    }
  }

  async function unpublishPortfolio() {
    if (!selected) return
    setBusy(true)
    setError('')
    try {
      const updated = await apiRequest<Portfolio>(`/portfolios/${selected.id}/unpublish`, { method: 'POST' })
      setSelected(updated)
      setPortfolios((current) => current.map((item) => item.id === updated.id ? updated : item))
      setMessage('Portfolio unpublished (reverted to draft)')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to unpublish portfolio')
    } finally {
      setBusy(false)
    }
  }

  function updateBlock(index: number, update: (block: PortfolioBlock) => PortfolioBlock) {
    setBlocks((current) => current.map((block, blockIndex) => blockIndex === index ? update(block) : block))
  }

  function addBlock(type: PortfolioBlock['type']) {
    const additions: Record<PortfolioBlock['type'], PortfolioBlock> = {
      hero: {
        type: 'hero',
        data: {
          name: 'Your name',
          tagline: 'What you do',
          company: '',
          location: 'Addis Ababa, Ethiopia',
          phone: '',
          email: '',
        },
      },
      about: { type: 'about', data: { body: '' } },
      projects: { type: 'projects', data: { items: [{ title: 'New project', description: '', link: '' }] } },
      contact: {
        type: 'contact',
        data: {
          email: '',
          phone: '',
          whatsapp: '',
          telegram: '',
          socials: [
            { platform: 'instagram', url: '', label: 'Instagram', handle: '' },
            { platform: 'linkedin', url: '', label: 'LinkedIn', handle: '' },
          ],
        },
      },
      links: {
        type: 'links',
        data: {
          title: 'Custom Links',
          items: [{ title: 'My Portfolio', url: 'https://' }],
        },
      },
    }
    setBlocks((current) => [...current, additions[type]])
    setActiveBlock(blocks.length)
  }

  async function signOut() {
    await authClient.signOut()
    setUser(null)
    setPortfolios([])
    setSelected(null)
    setError('')
    setMessage('')
  }

  // Loading: session is being resolved
  if (isSessionPending) {
    return (
      <main className="auth-page" aria-busy="true" aria-label="Loading…">
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
          <span style={{ font: '700 11px var(--sans)', letterSpacing: '1.5px', color: 'var(--muted)' }}>LOADING…</span>
        </div>
      </main>
    )
  }

  // Not authenticated or explicitly viewing landing/pricing page
  if (!user || viewLanding) {
    return (
      <HomePage
        onAuthenticated={(authenticatedUser) => {
          setUser(authenticatedUser)
          setViewLanding(false)
        }}
        apiStatus={apiStatus}
        authProviders={authProviders}
        user={user}
        onOpenApp={() => setViewLanding(false)}
      />
    )
  }

  // Guided setup wizard — shown for first-time users or when creating a new portfolio
  if (showWizard) {
    return (
      <SetupWizard
        onFinish={finishWizard}
        checkSubdomain={checkSubdomainForWizard}
        busy={wizardBusy}
        error={wizardError}
      />
    )
  }

  // Authenticated: show the main workspace
  return (
    <main className="workspace">
      <header className="topbar">
        <button className="brand-lockup" onClick={() => { setSelected(null); setMessage(''); setError('') }}>
          <span className="brand-mark">S</span>
          <span>sewnet</span>
        </button>
        <div className="topbar-right">
          <button className="text-button" onClick={() => setViewLanding(true)}>NFC Cards &amp; Pricing</button>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, color: apiStatus === 'online' ? '#e06b24' : '#9c4b3d', fontWeight: 700 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: apiStatus === 'online' ? '#e06b24' : '#c95b46', display: 'inline-block' }} />
            {apiStatus === 'online' ? 'Connected' : 'Offline'}
          </span>
          <span className="user-email">{user.email}</span>
          <button className="text-button" onClick={signOut}>Sign out</button>
        </div>
      </header>

      {!selected ? (
        <section className="dashboard">
          <div className="dashboard-heading">
            <div>
              <p className="eyebrow">WORKSPACE</p>
              <h1>Your portfolios</h1>
              <p className="muted">Build a clear home for your work.</p>
            </div>
            <span className="portfolio-count">{portfolios.length.toString().padStart(2, '0')} <small>PORTFOLIOS</small></span>
          </div>
          <div className="portfolio-layout">
            <div className="portfolio-list">
              {portfolios.length === 0 && (
                <div className="empty-state">
                  <span className="empty-index">01</span>
                  <h2>A page for your next chapter.</h2>
                  <p>Create your first portfolio and start shaping it.</p>
                </div>
              )}
              {portfolios.map((portfolio, index) => {
                const subUrl = getPortfolioSubdomainUrl(portfolio.subdomain, portfolio.status === 'draft')
                return (
                  <div key={portfolio.id} className="portfolio-row-container" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button className="portfolio-row" onClick={() => selectPortfolio(portfolio)} style={{ flex: 1 }}>
                      <span className="row-number">{String(index + 1).padStart(2, '0')}</span>
                      <span className="row-main">
                        <strong>{portfolio.subdomain}</strong>
                        <small>{getPortfolioDomainLabel(portfolio.subdomain)}</small>
                      </span>
                      <span className={`status status-${portfolio.status}`}>{portfolio.status}</span>
                      <span className="row-arrow" aria-hidden="true">✎</span>
                    </button>
                    <a
                      href={subUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="secondary-button"
                      title={`Open ${getPortfolioDomainLabel(portfolio.subdomain)} in new tab`}
                      style={{
                        height: 48,
                        padding: '0 16px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span>{portfolio.status === 'published' ? 'Live' : 'Preview'}</span>
                      <span>↗</span>
                    </a>
                  </div>
                )
              })}
            </div>
            <div className="create-form">
              <p className="eyebrow">START SOMETHING NEW</p>
              <h2>Ready to build another?</h2>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 24px', lineHeight: 1.55 }}>
                The guided setup will walk you through choosing an address, adding your details, and picking a look — all in a few steps.
              </p>
              <button
                type="button"
                className="primary-button"
                style={{ width: '100%' }}
                onClick={() => { setWizardError(''); setShowWizard(true) }}
              >
                Set up a new portfolio →
              </button>
              {error && <p className="notice error-notice" role="alert">{error}</p>}
            </div>
          </div>
        </section>
      ) : showNfcStudio ? (
        <div className="editor">
          <NfcStudio portfolio={selected} onBack={() => setShowNfcStudio(false)} />
        </div>
      ) : (
        <section className="editor">
          <div className="editor-heading">
            <div>
              <button className="back-button" onClick={() => { setSelected(null); setShowNfcStudio(false); setMessage(''); setError('') }}>← All portfolios</button>
              <h1>
                <a
                  href={getPortfolioSubdomainUrl(selected.subdomain, selected.status === 'draft')}
                  target="_blank"
                  rel="noreferrer"
                  title={`Open ${getPortfolioDomainLabel(selected.subdomain)}`}
                  style={{ color: 'inherit', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <span>{selected.subdomain}</span>
                  <span style={{ fontSize: 13, color: 'var(--accent)' }}>↗</span>
                </a>
              </h1>
            </div>
            <div className="save-controls">
              {message && <span className="save-message" role="status">{message}</span>}
              {error && <span className="save-message error-text" role="alert">{error}</span>}
              <a
                href={getPortfolioSubdomainUrl(selected.subdomain, selected.status === 'draft')}
                target="_blank"
                rel="noreferrer"
                className="secondary-button"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                title="Open on subdomain"
              >
                <span>{selected.status === 'published' ? 'View Live Subdomain' : 'Preview Subdomain'}</span>
                <span>↗</span>
              </a>
              <button className="secondary-button" onClick={() => setShowNfcStudio(true)}>Design NFC card</button>
              {selected.status === 'published' && (
                <button className="secondary-button" onClick={unpublishPortfolio} disabled={busy}>Unpublish</button>
              )}
              <button className="secondary-button" onClick={saveDraft} disabled={busy}>{busy ? 'Saving...' : 'Save draft'}</button>
              {selected.status !== 'published' && (
                <button className="primary-button" onClick={publishPortfolio} disabled={busy}>{busy ? 'Working...' : 'Publish'}</button>
              )}
            </div>
          </div>

          {/* Subdomain status banner */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 24px',
            background: selected.status === 'published' ? '#f0fdf4' : '#faf7f2',
            borderBottom: '1px solid var(--line)',
            fontSize: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: selected.status === 'published' ? '#16a34a' : '#e06b24',
                display: 'inline-block',
              }} />
              <span style={{ color: 'var(--ink)' }}>
                <strong>{selected.status === 'published' ? 'Live on Subdomain:' : 'Draft Preview:'}</strong>{' '}
                <a
                  href={getPortfolioSubdomainUrl(selected.subdomain, selected.status === 'draft')}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'underline' }}
                >
                  {getPortfolioSubdomainUrl(selected.subdomain, selected.status === 'draft')}
                </a>
              </span>
            </div>
            <button
              type="button"
              className="text-button"
              style={{ fontSize: 12, padding: 0 }}
              onClick={() => {
                navigator.clipboard.writeText(getPortfolioSubdomainUrl(selected.subdomain, selected.status === 'draft'))
                setMessage('Copied subdomain link to clipboard!')
              }}
            >
              Copy link
            </button>
          </div>
          <div className="editor-grid">
            <aside className="editor-sidebar">
              <div className="panel-label">PAGE CONTENT</div>
              <div className="block-list">
                {blocks.map((block, index) => (
                  <button key={`${block.type}-${index}`} className={`block-tab ${activeBlock === index ? 'active' : ''}`} onClick={() => setActiveBlock(index)}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    {block.type}
                    <b>›</b>
                  </button>
                ))}
              </div>
              <label className="add-section-label" htmlFor="add-section">Add section</label>
              <select id="add-section" value="" onChange={(e) => { if (e.target.value) addBlock(e.target.value as PortfolioBlock['type']) }}>
                <option value="" disabled>Choose a section</option>
                <option value="hero">Hero</option>
                <option value="about">About</option>
                <option value="projects">Projects</option>
                <option value="contact">Contact</option>
              </select>
              <div className="theme-control">
                <div className="panel-label">APPEARANCE</div>
                <label>
                  Accent color
                  <div className="color-control">
                    <input type="color" value={theme.accentColor} onChange={(e) => setTheme((t) => ({ ...t, accentColor: e.target.value as `#${string}` }))} />
                    <code>{theme.accentColor}</code>
                  </div>
                </label>
              </div>
            </aside>
            <div className="settings-panel">
              <div className="panel-label">SECTION SETTINGS</div>
              {blocks[activeBlock]
                ? <BlockForm block={blocks[activeBlock]} onChange={(next) => updateBlock(activeBlock, () => next)} />
                : <p className="muted">Choose or add a page section.</p>}
            </div>
            <div className="preview-stage">
              <div className="preview-toolbar">
                <span><i /> LIVE PREVIEW</span>
                <span>{selected.status.toUpperCase()}</span>
              </div>
              <PortfolioPreview blocks={blocks} theme={theme} />
            </div>
          </div>
        </section>
      )}
    </main>
  )
}

function BlockForm({ block, onChange }: { block: PortfolioBlock; onChange: (block: PortfolioBlock) => void }) {
  if (block.type === 'hero') {
    const heroData = block.data
    return (
      <div className="field-stack">
        <label>
          Full Name
          <input
            value={heroData.name}
            onChange={(e) => onChange({ type: 'hero', data: { ...heroData, name: e.target.value } })}
            placeholder="e.g. Roben Bayisa"
          />
        </label>
        <label>
          Tagline / Role
          <input
            value={heroData.tagline}
            onChange={(e) => onChange({ type: 'hero', data: { ...heroData, tagline: e.target.value } })}
            placeholder="e.g. Technology Strategist & Founder"
          />
        </label>
        <div className="form-row">
          <label>
            Company / Org <span className="optional">OPTIONAL</span>
            <input
              value={heroData.company ?? ''}
              onChange={(e) => onChange({ type: 'hero', data: { ...heroData, company: e.target.value } })}
              placeholder="e.g. Sewnet Digital"
            />
          </label>
          <label>
            Location <span className="optional">OPTIONAL</span>
            <input
              value={heroData.location ?? ''}
              onChange={(e) => onChange({ type: 'hero', data: { ...heroData, location: e.target.value } })}
              placeholder="e.g. Addis Ababa, Ethiopia"
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            Phone Number <span className="optional">OPTIONAL</span>
            <input
              type="tel"
              value={heroData.phone ?? ''}
              onChange={(e) => onChange({ type: 'hero', data: { ...heroData, phone: e.target.value } })}
              placeholder="+251 91 123 4567"
            />
          </label>
          <label>
            Email Address <span className="optional">OPTIONAL</span>
            <input
              type="email"
              value={heroData.email ?? ''}
              onChange={(e) => onChange({ type: 'hero', data: { ...heroData, email: e.target.value } })}
              placeholder="you@domain.com"
            />
          </label>
        </div>
        <label>
          Portrait / Avatar URL <span className="optional">OPTIONAL</span>
          <input
            type="url"
            value={heroData.avatarUrl ?? ''}
            onChange={(e) => onChange({ type: 'hero', data: { ...heroData, avatarUrl: e.target.value || undefined } })}
            placeholder="https://..."
          />
        </label>
      </div>
    )
  }

  if (block.type === 'contact') {
    const contactData = block.data
    const socials = contactData.socials ?? []

    function updateSocial(index: number, patch: Partial<SocialLink>) {
      const next = [...socials]
      next[index] = { ...next[index], ...patch }
      onChange({ type: 'contact', data: { ...contactData, socials: next } })
    }

    function addSocial(platform: string = 'instagram') {
      const next = [...socials, { platform, url: '', label: platform.charAt(0).toUpperCase() + platform.slice(1), handle: '' }]
      onChange({ type: 'contact', data: { ...contactData, socials: next } })
    }

    function removeSocial(index: number) {
      const next = socials.filter((_, i) => i !== index)
      onChange({ type: 'contact', data: { ...contactData, socials: next } })
    }

    return (
      <div className="field-stack">
        <div className="form-group-title">Primary Contact (vCard / NFC)</div>
        <div className="form-row">
          <label>
            Contact Email
            <input
              type="email"
              value={contactData.email ?? ''}
              onChange={(e) => onChange({ type: 'contact', data: { ...contactData, email: e.target.value } })}
              placeholder="hello@example.com"
            />
          </label>
          <label>
            Direct Phone
            <input
              type="tel"
              value={contactData.phone ?? ''}
              onChange={(e) => onChange({ type: 'contact', data: { ...contactData, phone: e.target.value } })}
              placeholder="+251 91 123 4567"
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            WhatsApp (Number or link)
            <input
              type="text"
              value={contactData.whatsapp ?? ''}
              onChange={(e) => onChange({ type: 'contact', data: { ...contactData, whatsapp: e.target.value } })}
              placeholder="+251 91 123 4567"
            />
          </label>
          <label>
            Telegram (@username or link)
            <input
              type="text"
              value={contactData.telegram ?? ''}
              onChange={(e) => onChange({ type: 'contact', data: { ...contactData, telegram: e.target.value } })}
              placeholder="@username"
            />
          </label>
        </div>

        <div className="form-group-title">Social &amp; Professional Links</div>
        <p style={{ fontSize: 11, color: 'var(--muted)', margin: '0 0 6px' }}>
          Add your Instagram, LinkedIn, Telegram, WhatsApp, and other platforms below.
        </p>

        {socials.map((soc, idx) => (
          <div key={`social-${idx}`} className="social-input-card">
            <div className="social-input-header">
              <select
                value={soc.platform}
                onChange={(e) => updateSocial(idx, { platform: e.target.value, label: e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1) })}
                style={{ padding: '4px 8px', fontSize: 12, width: 'auto' }}
              >
                <option value="instagram">Instagram</option>
                <option value="linkedin">LinkedIn</option>
                <option value="telegram">Telegram</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="twitter">X (Twitter)</option>
                <option value="tiktok">TikTok</option>
                <option value="youtube">YouTube</option>
                <option value="github">GitHub</option>
                <option value="website">Website</option>
              </select>
              <button type="button" className="btn-remove-social" onClick={() => removeSocial(idx)}>
                Remove
              </button>
            </div>
            <div className="form-row">
              <input
                type="text"
                placeholder="Handle (e.g. @username)"
                value={soc.handle ?? ''}
                onChange={(e) => {
                  const val = e.target.value
                  const url = soc.url || (val.startsWith('http') ? val : '')
                  updateSocial(idx, { handle: val, url })
                }}
              />
              <input
                type="text"
                placeholder="Profile URL or Link"
                value={soc.url ?? ''}
                onChange={(e) => updateSocial(idx, { url: e.target.value })}
              />
            </div>
          </div>
        ))}

        <button type="button" className="btn-add-social" onClick={() => addSocial('instagram')}>
          + Add Social / Professional Link
        </button>
      </div>
    )
  }

  if (block.type === 'about') {
    return (
      <div className="field-stack">
        <label>
          About Title <span className="optional">OPTIONAL</span>
          <input
            value={block.data.title ?? ''}
            onChange={(e) => onChange({ ...block, data: { ...block.data, title: e.target.value } })}
            placeholder="About"
          />
        </label>
        <label>
          Introduction / Bio
          <textarea
            rows={7}
            value={block.data.body}
            onChange={(e) => onChange({ ...block, data: { ...block.data, body: e.target.value } })}
            placeholder="A few words about your practice, experience, and services..."
          />
        </label>
      </div>
    )
  }

  if (block.type === 'projects') {
    const items = block.data.items ?? []
    return (
      <div className="field-stack">
        <label>
          Project Title
          <input
            value={items[0]?.title ?? ''}
            onChange={(e) => onChange({ ...block, data: { items: [{ ...items[0], title: e.target.value }] } })}
            placeholder="e.g. Sewnet NFC Platform"
          />
        </label>
        <label>
          Description
          <textarea
            rows={4}
            value={items[0]?.description ?? ''}
            onChange={(e) => onChange({ ...block, data: { items: [{ ...items[0], description: e.target.value }] } })}
            placeholder="Short overview of your work..."
          />
        </label>
        <label>
          Project Link
          <input
            type="url"
            value={items[0]?.link ?? ''}
            onChange={(e) => onChange({ ...block, data: { items: [{ ...items[0], link: e.target.value }] } })}
            placeholder="https://..."
          />
        </label>
      </div>
    )
  }

  return (
    <div className="field-stack">
      <label>
        Section Title
        <input
          value={block.data.title ?? ''}
          onChange={(e) => onChange({ ...block, data: { ...block.data, title: e.target.value } })}
          placeholder="Custom Links"
        />
      </label>
    </div>
  )
}

function renderSocialIcon(platform: string) {
  switch (platform.toLowerCase()) {
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
        </svg>
      )
    case 'linkedin':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
        </svg>
      )
    case 'telegram':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.942z"/>
        </svg>
      )
    case 'whatsapp':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
        </svg>
      )
    case 'phone':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
      )
    case 'email':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
      )
  }
}

function PortfolioPreview({ blocks, theme }: { blocks: PortfolioBlock[]; theme: PortfolioTheme }) {
  const [downloadNote, setDownloadNote] = useState<string | null>(null)

  const hero = blocks.find((b) => b.type === 'hero')
  const about = blocks.find((b) => b.type === 'about')
  const projects = blocks.find((b) => b.type === 'projects')
  const contact = blocks.find((b) => b.type === 'contact')

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

  const name = heroData.name || 'Your Name'
  const tagline = heroData.tagline || 'Your Role & Expertise'
  const company = heroData.company || ''
  const location = heroData.location || ''
  const phone = contactData.phone || heroData.phone || ''
  const email = contactData.email || heroData.email || ''
  const whatsapp = contactData.whatsapp || (phone ? phone.replace(/[^0-9]/g, '') : '')
  const telegram = contactData.telegram ? contactData.telegram.replace(/^@/, '') : ''

  const socials = contactData.socials ?? []

  const initials = name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'S'

  function handleTestVcardDownload() {
    const parts = name.trim().split(' ')
    const firstName = parts[0] || ''
    const lastName = parts.slice(1).join(' ') || ''
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `N:${lastName};${firstName};;;`,
      `FN:${name}`,
    ]
    if (company) lines.push(`ORG:${company}`)
    if (tagline) lines.push(`TITLE:${tagline}`)
    if (phone) lines.push(`TEL;TYPE=CELL,VOICE:${phone}`)
    if (email) lines.push(`EMAIL;TYPE=INTERNET,PREF:${email}`)
    if (socials) {
      for (const soc of socials) {
        if (soc.url) lines.push(`X-SOCIALPROFILE;type=${soc.platform}:${soc.url}`)
      }
    }
    lines.push('NOTE:Sewnet NFC Digital Identity Card')
    lines.push('END:VCARD')

    const blob = new Blob([lines.join('\r\n')], { type: 'text/vcard;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${name.toLowerCase().replace(/\s+/g, '-')}-contact.vcf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    setDownloadNote('Downloaded contact .vcf! Ready for NFC sharing.')
    setTimeout(() => setDownloadNote(null), 3000)
  }

  return (
    <div className="nfc-preview-shell" style={{ '--preview-accent': theme.accentColor } as CSSProperties}>
      {/* Top NFC Status Bar */}
      <div className="nfc-top-status">
        <span className="nfc-live-pill">
          <span className="nfc-dot" />
          <span>NFC PREVIEW CONNECTED</span>
        </span>
        <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ background: theme.accentColor, color: '#fff', width: 16, height: 16, borderRadius: 3, display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 900 }}>S</span>
          sewnet
        </span>
      </div>

      {/* Profile Hero */}
      <div className="nfc-preview-hero">
        <div className="nfc-avatar-container">
          {heroData.avatarUrl ? (
            <img className="nfc-avatar-img" src={heroData.avatarUrl} alt={name} />
          ) : (
            <div className="nfc-avatar-fallback">{initials}</div>
          )}
          <span className="nfc-verified-badge" title="Sewnet Verified">✓</span>
        </div>

        <h3 className="nfc-profile-name">{name}</h3>
        <p className="nfc-profile-role">{tagline}</p>

        {(company || location) && (
          <div className="nfc-badges-wrap">
            {company && <span className="nfc-meta-pill">🏢 {company}</span>}
            {location && <span className="nfc-meta-pill">📍 {location}</span>}
          </div>
        )}

        {/* Primary NFC Action: Save to Contacts */}
        <button
          type="button"
          className="nfc-vcard-btn"
          onClick={handleTestVcardDownload}
          title="Download and test saving contact card"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="8.5" cy="7" r="4"/>
            <line x1="20" y1="8" x2="20" y2="14"/>
            <line x1="23" y1="11" x2="17" y2="11"/>
          </svg>
          <span>Save to Contacts (.vcf)</span>
        </button>
        {downloadNote && (
          <span style={{ fontSize: 10, color: theme.accentColor, fontWeight: 700, marginBottom: 10 }}>
            {downloadNote}
          </span>
        )}

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
      </div>

      {/* Social & Digital Networks Section */}
      {socials.length > 0 && (
        <div className="nfc-preview-section">
          <div className="nfc-section-title">Connect &amp; Socials</div>
          <div className="nfc-social-cards">
            {socials.map((soc, idx) => (
              <a
                key={`prev-soc-${idx}`}
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
            <div key={`prev-proj-${pIdx}`} className="nfc-preview-project-card">
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

      {/* Preview Footer */}
      <div className="nfc-preview-footer">
        <div><strong>SEWNET NFC SMART CARD</strong></div>
        <div style={{ marginTop: 4 }}>One identity. One tap. Every connection measured.</div>
      </div>
    </div>
  )
}

export function App() {
  const activeSubdomain = getSubdomain()

  if (activeSubdomain) {
    return <PublicProfilePage subdomain={activeSubdomain} apiUrl={API_URL} />
  }

  return <WorkspaceApp />
}

export default App
