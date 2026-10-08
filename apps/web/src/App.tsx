import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import type { PortfolioBlock, PortfolioTheme } from '@amalink/types'
import { authClient } from './auth-client'
import { HomePage } from './HomePage'
import { SetupWizard, wizardDataToBlocks } from './SetupWizard'
import type { WizardData } from './SetupWizard'
import { NfcStudio } from './NfcStudio'
import './Builder.css'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

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
    { type: 'hero', data: { name: 'Your name', tagline: 'What you do' } },
    { type: 'about', data: { body: 'A short introduction about your work and what you care about.' } },
    { type: 'projects', data: { items: [{ title: 'Selected work', description: 'Add a short project description.' }] } },
    { type: 'contact', data: { email: '' } },
  ]
}

function App() {
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
      setMessage('Draft saved')
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
      setMessage('Portfolio published')
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
      setMessage('Portfolio unpublished')
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
      hero: { type: 'hero', data: { name: 'Your name', tagline: 'What you do' } },
      about: { type: 'about', data: { body: '' } },
      projects: { type: 'projects', data: { items: [{ title: 'New project', description: '' }] } },
      contact: { type: 'contact', data: { email: '' } },
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
              {portfolios.map((portfolio, index) => (
                <button key={portfolio.id} className="portfolio-row" onClick={() => selectPortfolio(portfolio)}>
                  <span className="row-number">{String(index + 1).padStart(2, '0')}</span>
                  <span className="row-main">
                    <strong>{portfolio.subdomain}</strong>
                    <small>{portfolio.subdomain}.yoursite.com</small>
                  </span>
                  <span className={`status status-${portfolio.status}`}>{portfolio.status}</span>
                  <span className="row-arrow" aria-hidden="true">↗</span>
                </button>
              ))}
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
              <h1>{selected.subdomain}<span>.yoursite.com</span></h1>
            </div>
            <div className="save-controls">
              {message && <span className="save-message" role="status">{message}</span>}
              {error && <span className="save-message error-text" role="alert">{error}</span>}
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
    return (
      <div className="field-stack">
        <label>Name<input value={block.data.name} onChange={(e) => onChange({ ...block, data: { ...block.data, name: e.target.value } })} /></label>
        <label>Tagline<input value={block.data.tagline} onChange={(e) => onChange({ ...block, data: { ...block.data, tagline: e.target.value } })} /></label>
        <label>Portrait URL <span className="optional">OPTIONAL</span><input type="url" value={block.data.avatarUrl ?? ''} onChange={(e) => onChange({ ...block, data: { ...block.data, avatarUrl: e.target.value || undefined } })} placeholder="https://..." /></label>
      </div>
    )
  }
  if (block.type === 'about') {
    return (
      <div className="field-stack">
        <label>Introduction<textarea rows={8} value={block.data.body} onChange={(e) => onChange({ ...block, data: { body: e.target.value } })} placeholder="A few words about your practice..." /></label>
      </div>
    )
  }
  if (block.type === 'projects') {
    return (
      <div className="field-stack">
        <label>Project title<input value={block.data.items[0]?.title ?? ''} onChange={(e) => onChange({ ...block, data: { items: [{ ...block.data.items[0], title: e.target.value }] } })} /></label>
        <label>Description<textarea rows={5} value={block.data.items[0]?.description ?? ''} onChange={(e) => onChange({ ...block, data: { items: [{ ...block.data.items[0], description: e.target.value }] } })} /></label>
        <label>Project link<input type="url" value={block.data.items[0]?.link ?? ''} onChange={(e) => onChange({ ...block, data: { items: [{ ...block.data.items[0], link: e.target.value }] } })} placeholder="https://..." /></label>
      </div>
    )
  }
  return (
    <div className="field-stack">
      <label>Contact email<input type="email" value={block.data.email ?? ''} onChange={(e) => onChange({ ...block, data: { ...block.data, email: e.target.value } })} placeholder="hello@example.com" /></label>
    </div>
  )
}

function PortfolioPreview({ blocks, theme }: { blocks: PortfolioBlock[]; theme: PortfolioTheme }) {
  const hero = blocks.find((b) => b.type === 'hero')
  const about = blocks.find((b) => b.type === 'about')
  const projects = blocks.find((b) => b.type === 'projects')
  const contact = blocks.find((b) => b.type === 'contact')
  return (
    <article className="portfolio-preview" style={{ '--preview-accent': theme.accentColor } as CSSProperties}>
      <div className="preview-nav">
        <span>{hero?.type === 'hero' ? hero.data.name || 'PORTFOLIO' : 'PORTFOLIO'}</span>
        <span>INDEX&nbsp;&nbsp; 01—04</span>
      </div>
      {hero?.type === 'hero' && (
        <section className="preview-hero">
          <p className="preview-kicker">INDEPENDENT CREATIVE</p>
          <h2>{hero.data.name || 'Your name'}<br /><em>{hero.data.tagline || 'What you do'}</em></h2>
          <span className="preview-scroll">SCROLL TO EXPLORE ↓</span>
          {hero.data.avatarUrl && <img src={hero.data.avatarUrl} alt="" />}
        </section>
      )}
      {about?.type === 'about' && (
        <section className="preview-about">
          <span>01 / ABOUT</span>
          <p>{about.data.body || 'Your introduction will appear here.'}</p>
        </section>
      )}
      {projects?.type === 'projects' && (
        <section className="preview-projects">
          <span>02 / SELECTED WORK</span>
          {projects.data.items.map((item, index) => (
            <div className="preview-project" key={`${item.title}-${index}`}>
              <b>{String(index + 1).padStart(2, '0')}</b>
              <div>
                <strong>{item.title || 'Project title'}</strong>
                <small>{item.description || 'Project description'}</small>
              </div>
              <span>↗</span>
            </div>
          ))}
        </section>
      )}
      {contact?.type === 'contact' && (
        <section className="preview-contact">
          <span>03 / CONTACT</span>
          <a href={contact.data.email ? `mailto:${contact.data.email}` : undefined}>
            {contact.data.email || 'Start a conversation'} ↗
          </a>
        </section>
      )}
      <footer className="preview-footer">
        <span>© {new Date().getFullYear()}</span>
        <span>MADE WITH SEWNET</span>
      </footer>
    </article>
  )
}

export default App
