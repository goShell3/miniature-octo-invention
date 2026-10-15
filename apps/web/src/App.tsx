import { useEffect, useState } from 'react'
import type { PortfolioBlock, PortfolioTheme, SocialLink } from '@amalink/types'
import { authClient } from './auth-client'
import { HomePage } from './HomePage'
import { SetupWizard, wizardDataToBlocks } from './SetupWizard'
import type { WizardData } from './SetupWizard'
import { NfcStudio } from './NfcStudio'
import { PublicProfilePage } from './PublicProfilePage'
import { API_URL } from './config'
import './Builder.css'
import { getSubdomain, getPortfolioDomainLabel, getPortfolioSubdomainUrl } from './url-helpers'
export { getSubdomain, getPortfolioSubdomainUrl, getPortfolioDomainLabel }
import { DigitalCard } from './DigitalCard'

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

  // Domain editing modal state
  const [showDomainModal, setShowDomainModal] = useState(false)
  const [newSubdomain, setNewSubdomain] = useState('')
  const [subdomainStatus, setSubdomainStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [subdomainError, setSubdomainError] = useState('')
  const [subdomainSaving, setSubdomainSaving] = useState(false)

  // Restore session on mount
  useEffect(() => {
    let isCurrent = true
    authClient.getSession({}).then(({ data, error: sessionError }) => {
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

  // Poll API health with auto-recovery for cold starts (Render free tier)
  useEffect(() => {
    let isCurrent = true
    let timer: ReturnType<typeof setTimeout> | null = null

    function check() {
      fetch(`${API_URL}/health`, { cache: 'no-store' })
        .then((r) => {
          if (isCurrent) {
            setApiStatus(r.ok ? 'online' : 'offline')
            // If online, check every 25s; if offline/cold start, retry in 4s to catch wake-up
            timer = setTimeout(check, r.ok ? 25000 : 4000)
          }
        })
        .catch(() => {
          if (isCurrent) {
            setApiStatus('offline')
            timer = setTimeout(check, 4000)
          }
        })
    }
    check()
    return () => {
      isCurrent = false
      if (timer) clearTimeout(timer)
    }
  }, [])

  // Fetch available OAuth providers
  useEffect(() => {
    let isCurrent = true
    function loadProviders() {
      fetch(`${API_URL}/auth/providers`, { cache: 'no-store' })
        .then((r) => (r.ok ? (r.json() as Promise<typeof authProviders>) : null))
        .then((providers) => {
          if (isCurrent && providers) setAuthProviders(providers)
        })
        .catch(() => undefined)
    }
    loadProviders()
    if (apiStatus === 'online') {
      loadProviders()
    }
    return () => {
      isCurrent = false
    }
  }, [apiStatus])

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
      let livePortfolio = portfolio
      if (portfolio.status !== 'published') {
        try {
          livePortfolio = await apiRequest<Portfolio>(`/portfolios/${portfolio.id}/publish`, { method: 'POST' })
        } catch {
          // Ignore if already published
        }
      }
      const next: Portfolio = {
        ...livePortfolio,
        content: livePortfolio.content ?? { version: 1, blocks: wizardDataToBlocks(data) },
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

  // ── Domain editing modal handlers ──────────────────────────────────────────

  function openDomainModal() {
    if (!selected) return
    setNewSubdomain(selected.subdomain)
    setSubdomainStatus('idle')
    setSubdomainError('')
    setShowDomainModal(true)
  }

  useEffect(() => {
    if (!showDomainModal || !selected) return
    const sub = newSubdomain.trim().toLowerCase()
    if (!sub || sub === selected.subdomain) {
      setSubdomainStatus('idle')
      setSubdomainError('')
      return
    }

    if (sub.length < 3 || sub.length > 30 || !/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(sub)) {
      setSubdomainStatus('invalid')
      setSubdomainError('3–30 lowercase letters, numbers, hyphens. Cannot start or end with a hyphen.')
      return
    }

    setSubdomainStatus('checking')
    setSubdomainError('')

    const timer = setTimeout(async () => {
      try {
        const available = await checkSubdomainForWizard(sub)
        setSubdomainStatus(available ? 'available' : 'taken')
        if (!available) {
          setSubdomainError('This address is already taken. Try another.')
        }
      } catch {
        setSubdomainStatus('idle')
      }
    }, 350)

    return () => clearTimeout(timer)
  }, [newSubdomain, showDomainModal, selected?.subdomain])

  async function handleSaveDomain() {
    if (!selected || subdomainSaving) return
    const sub = newSubdomain.trim().toLowerCase()
    if (sub === selected.subdomain) {
      setShowDomainModal(false)
      return
    }
    if (subdomainStatus !== 'available') return

    setSubdomainSaving(true)
    setSubdomainError('')
    try {
      const updated = await apiRequest<Portfolio>(`/portfolios/${selected.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ subdomain: sub }),
      })
      setSelected(updated)
      setPortfolios((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      setMessage(`Address updated to ${updated.subdomain}!`)
      setShowDomainModal(false)
    } catch (reason) {
      setSubdomainError(reason instanceof Error ? reason.message : 'Failed to update address')
    } finally {
      setSubdomainSaving(false)
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
    await authClient.signOut({})
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
          <div className="nav-status-pill" title={`API is ${apiStatus}`}>
            <span className={`nav-status-dot ${apiStatus}`} />
            <span>{apiStatus === 'online' ? 'Connected' : apiStatus === 'checking' ? 'Connecting…' : 'Offline'}</span>
          </div>
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
              <h1 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
                <button
                  type="button"
                  className="edit-domain-pill"
                  onClick={openDomainModal}
                  title="Change profile address"
                >
                  ✎ Edit address
                </button>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                type="button"
                className="text-button"
                style={{ fontSize: 12, padding: 0, fontWeight: 600, color: 'var(--accent)' }}
                onClick={openDomainModal}
              >
                Change address
              </button>
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
              <PortfolioPreview blocks={blocks} theme={theme} subdomain={selected.subdomain} />
            </div>
          </div>
        </section>
      )}

      {showDomainModal && selected && (
        <div className="domain-modal-overlay" onClick={() => !subdomainSaving && setShowDomainModal(false)}>
          <div className="domain-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="domain-modal-header">
              <div>
                <h3>Change Profile Address</h3>
                <p>Choose a unique subdomain for your digital business card &amp; portfolio.</p>
              </div>
              <button
                type="button"
                className="domain-modal-close"
                onClick={() => !subdomainSaving && setShowDomainModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="domain-modal-body">
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>
                New Subdomain
              </label>
              <div className="wizard-domain-bar">
                <span className="domain-protocol">https://</span>
                <input
                  type="text"
                  className="wizard-domain-input"
                  value={newSubdomain}
                  onChange={(e) => setNewSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="your-name"
                  autoFocus
                />
                <span className="domain-suffix">.sewnet.et</span>
                <div className="domain-status-badge">
                  {subdomainStatus === 'checking' && <span className="domain-badge checking">Checking…</span>}
                  {subdomainStatus === 'available' && <span className="domain-badge available">✓ Available</span>}
                  {subdomainStatus === 'taken' && <span className="domain-badge taken">✕ Taken</span>}
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, marginBottom: 0 }}>
                Allowed: 3–30 lowercase letters, numbers, and hyphens. Cannot start or end with a hyphen.
              </p>
              {subdomainError && (
                <p style={{ color: '#dc2626', fontSize: 12, marginTop: 8, marginBottom: 0 }}>
                  {subdomainError}
                </p>
              )}

              <div className="domain-modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowDomainModal(false)}
                  disabled={subdomainSaving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={handleSaveDomain}
                  disabled={
                    subdomainSaving ||
                    subdomainStatus === 'checking' ||
                    subdomainStatus === 'taken' ||
                    subdomainStatus === 'invalid' ||
                    newSubdomain === selected.subdomain
                  }
                >
                  {subdomainSaving ? 'Saving…' : 'Update Address'}
                </button>
              </div>
            </div>
          </div>
        </div>
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

function PortfolioPreview({ blocks, theme, subdomain }: { blocks: PortfolioBlock[]; theme: PortfolioTheme; subdomain?: string }) {
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
  const title = heroData.tagline || ''
  const company = heroData.company || ''
  const bio = (about?.type === 'about' && about.data?.body) ? about.data.body : ''
  const phone = contactData.phone || heroData.phone || ''
  const email = contactData.email || heroData.email || ''
  const socials = contactData.socials ?? []

  const currentSubdomain = subdomain || 'yourname'
  const profileUrl = getPortfolioSubdomainUrl(currentSubdomain, true)
  const displayUrl = getPortfolioDomainLabel(currentSubdomain)

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
    if (title) lines.push(`TITLE:${title}`)
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
    <div style={{
      background: 'radial-gradient(circle at 50% 20%, #1f1a17 0%, #12100e 100%)',
      padding: '24px 16px',
      borderRadius: '24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 380,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
      }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          borderRadius: 9999,
          background: 'rgba(255, 255, 255, 0.08)',
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: 0.8,
          color: '#a89f91',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: theme.accentColor || '#eb6307' }} />
          <span>NFC PREVIEW</span>
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#f6f5f2' }}>
          {displayUrl}
        </span>
      </div>

      <div style={{ width: '100%', maxWidth: 380 }}>
        <DigitalCard
          name={name}
          title={title}
          company={company}
          bio={bio}
          avatarUrl={heroData.avatarUrl}
          phone={phone}
          email={email}
          socials={socials}
          accentColor={theme.accentColor || '#eb6307'}
          profileUrl={profileUrl}
          displayUrl={displayUrl}
          onSaveVcard={handleTestVcardDownload}
        />
        {downloadNote && (
          <div style={{ marginTop: 10, textAlign: 'center', fontSize: 11, color: '#f48935', fontWeight: 700 }}>
            {downloadNote}
          </div>
        )}
      </div>

      {/* If any projects exist, display them neatly below */}
      {projects?.type === 'projects' && Array.isArray(projects.data?.items) && projects.data.items.length > 0 && (
        <div style={{ width: '100%', maxWidth: 380, marginTop: 24, borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#a89f91', letterSpacing: 1, marginBottom: 12 }}>
            FEATURED PROJECTS
          </div>
          {projects.data.items.map((proj, pIdx) => (
            <div key={pIdx} style={{ background: '#1c1815', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 10, padding: 12, marginBottom: 8, color: '#f6f5f2' }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{proj.title}</div>
              {proj.description && <div style={{ fontSize: 12, color: '#a89f91', marginTop: 4 }}>{proj.description}</div>}
              {proj.link && <a href={proj.link} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#eb6307', textDecoration: 'none', display: 'inline-block', marginTop: 6, fontWeight: 700 }}>View Project ↗</a>}
            </div>
          ))}
        </div>
      )}
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
