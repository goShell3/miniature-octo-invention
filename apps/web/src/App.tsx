import { useEffect, useState } from 'react'
import type { FormEvent, CSSProperties } from 'react'
import type { PortfolioBlock, PortfolioTheme } from '@amalink/types'
import { authClient } from './auth-client'
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
  const [isSessionPending, setIsSessionPending] = useState(true)
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [selected, setSelected] = useState<Portfolio | null>(null)
  const [showNfcStudio, setShowNfcStudio] = useState(false)
  const [blocks, setBlocks] = useState<PortfolioBlock[]>([])
  const [theme, setTheme] = useState<PortfolioTheme>({ id: 'minimal', accentColor: '#197a68' })
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newSubdomain, setNewSubdomain] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [activeBlock, setActiveBlock] = useState(0)
  const [isCheckingSubdomain, setIsCheckingSubdomain] = useState(false)
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [authProviders, setAuthProviders] = useState({ google: false, facebook: false })

  useEffect(() => {
    let isCurrent = true
    void authClient.getSession().then(({ data, error }) => {
      if (!isCurrent) return
      if (error) setError(error.message ?? 'Unable to restore session')
      setUser(data?.user ? { id: data.user.id, email: data.user.email } : null)
      setIsSessionPending(false)
    }).catch((reason: Error) => {
      if (!isCurrent) return
      setError(reason.message)
      setIsSessionPending(false)
    })
    return () => { isCurrent = false }
  }, [])

  useEffect(() => {
    let isCurrent = true
    fetch(`${API_URL}/auth/providers`)
      .then((response) => response.ok ? response.json() as Promise<typeof authProviders> : null)
      .then((providers) => {
        if (isCurrent && providers) setAuthProviders(providers)
      })
      .catch(() => undefined)
    return () => { isCurrent = false }
  }, [])

  useEffect(() => {
    let isCurrent = true

    fetch(`${API_URL}/health`)
      .then((response) => {
        if (!isCurrent) return
        setApiStatus(response.ok ? 'online' : 'offline')
      })
      .catch(() => {
        if (!isCurrent) return
        setApiStatus('offline')
      })

    return () => { isCurrent = false }
  }, [])

  useEffect(() => {
    if (!user) {
      setPortfolios([])
      return
    }
    let isCurrent = true
    apiRequest<Portfolio[]>('/portfolios/me').then((items) => {
      if (!isCurrent) return
      setPortfolios(items)
    }).catch((reason: Error) => {
      if (!isCurrent) return
      setError(reason.message)
    })
    return () => { isCurrent = false }
  }, [user?.id])

  function selectPortfolio(portfolio: Portfolio) {
    setSelected(portfolio)
    setShowNfcStudio(false)
    setBlocks(portfolio.content?.blocks ?? initialBlocks())
    setTheme(portfolio.theme)
    setActiveBlock(0)
    setMessage('')
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')

    const trimmedEmail = email.trim()
    const normalizedPassword = password

    if (!trimmedEmail || !normalizedPassword) {
      setError('Please enter both email and password.')
      setBusy(false)
      return
    }

    if (normalizedPassword.length < 12) {
      setError('Password must be at least 12 characters long.')
      setBusy(false)
      return
    }

    try {
      const result = authMode === 'signup'
        ? await authClient.signUp.email({
            name: trimmedEmail.split('@')[0],
            email: trimmedEmail,
            password: normalizedPassword,
          })
        : await authClient.signIn.email({
            email: trimmedEmail,
            password: normalizedPassword,
          })
      if (result.error) throw new Error(result.error.message)
      const session = await authClient.getSession()
      setUser(session.data?.user ? { id: session.data.user.id, email: session.data.user.email } : null)
      setError('')
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Unable to sign in'
      setError(message)
    } finally {
      setBusy(false)
    }
  }

  async function signInWithSocial(provider: 'google' | 'facebook') {
    setBusy(true)
    setError('')
    setMessage('')

    try {
      const result = await authClient.signIn.social({
          provider,
          callbackURL: window.location.origin,
      })
      if (result.error) throw new Error(result.error.message)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `Unable to sign in with ${provider}`)
    } finally {
      setBusy(false)
    }
  }

  async function checkSubdomain() {
    if (!user || !newSubdomain.trim()) return
    setIsCheckingSubdomain(true)
    setError('')
    try {
      const result = await apiRequest<{ available: boolean }>(`/portfolios/subdomain-availability?name=${encodeURIComponent(newSubdomain)}`)
      setMessage(result.available ? 'That address is available.' : 'That address is already taken or reserved.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to check address')
    } finally {
      setIsCheckingSubdomain(false)
    }
  }

  async function createPortfolio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const portfolio = await apiRequest<Portfolio>('/portfolios', {
        method: 'POST',
        body: JSON.stringify({ subdomain: newSubdomain, blocks: initialBlocks() }),
      })
      const next = { ...portfolio, content: portfolio.content ?? { version: 1, blocks: initialBlocks() } }
      setPortfolios((current) => [next, ...current])
      setNewSubdomain('')
      selectPortfolio(next)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to create portfolio')
    } finally {
      setBusy(false)
    }
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
  }

  if (isSessionPending) {
    return <main className="auth-page" aria-busy="true" />
  }

  if (!user) {
    return (
      <main className="auth-page">
        <header className="brand-lockup"><span className="brand-mark">A</span><span>amalink</span></header>
        <div style={{ position: 'absolute', right: '6vw', top: '38px', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1px solid #dfe5df', background: '#f5f7f3', color: apiStatus === 'online' ? '#1f7a5c' : apiStatus === 'offline' ? '#9c4b3d' : '#5e6d66', fontSize: 12, fontWeight: 700 }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: apiStatus === 'online' ? '#1f7a5c' : apiStatus === 'offline' ? '#c95b46' : '#8c9a8f', display: 'inline-block' }} />
          {apiStatus === 'online' ? 'API online' : apiStatus === 'offline' ? 'API offline' : 'Checking API...'}
        </div>
        <section className="auth-panel">
          <p className="eyebrow">YOUR WORK, WELL PLACED</p>
          <h1>{authMode === 'signup' ? 'Make room for your work.' : 'Welcome back.'}</h1>
          <p className="auth-copy">A home for the things you make and the people you make them for.</p>
          {authProviders.google && <button type="button" className="secondary-button" onClick={() => signInWithSocial('google')} disabled={busy} style={{ width: '100%', marginBottom: 8 }}>
            Continue with Google
          </button>}
          {authProviders.facebook && <button type="button" className="secondary-button" onClick={() => signInWithSocial('facebook')} disabled={busy} style={{ width: '100%', marginBottom: 16 }}>
            Continue with Facebook
          </button>}
          <form onSubmit={submitAuth} className="auth-form">
            <label>Email address<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label>Password<input type="password" autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} minLength={12} required value={password} onChange={(event) => setPassword(event.target.value)} /><small>Use at least 12 characters.</small></label>
            {error && <p className="notice error-notice" role="alert">{error}</p>}
            <button className="primary-button" disabled={busy}>{busy ? 'Please wait...' : authMode === 'signup' ? 'Create account' : 'Sign in'}</button>
          </form>
          <p className="auth-switch">{authMode === 'signup' ? 'Already have an account?' : 'New to Amalink?'} <button className="text-button" onClick={() => { setAuthMode(authMode === 'signup' ? 'login' : 'signup'); setError(''); setMessage('') }}>{authMode === 'signup' ? 'Sign in' : 'Create an account'}</button></p>
        </section>
        <div className="auth-art" aria-hidden="true"><div className="art-paper"><span>SELECTED WORK</span><strong>Make<br />something<br /><i>matter.</i></strong><div className="art-line" /><small>PORTFOLIO / 2026</small></div><div className="art-stamp">A / 01</div></div>
      </main>
    )
  }

  return (
    <main className="workspace">
      <header className="topbar">
        <button className="brand-lockup" onClick={() => { setSelected(null); setMessage('') }}><span className="brand-mark">A</span><span>amalink</span></button>
        <div className="topbar-right">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, color: apiStatus === 'online' ? '#1f7a5c' : '#9c4b3d', fontWeight: 700 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: apiStatus === 'online' ? '#1f7a5c' : '#c95b46', display: 'inline-block' }} />
            {apiStatus === 'online' ? 'Connected' : 'Offline'}
          </span>
          <span className="user-email">{user.email}</span>
          <button className="text-button" onClick={signOut}>Sign out</button>
        </div>
      </header>
      {!selected ? (
        <section className="dashboard">
          <div className="dashboard-heading"><div><p className="eyebrow">WORKSPACE</p><h1>Your portfolios</h1><p className="muted">Build a clear home for your work.</p></div><span className="portfolio-count">{portfolios.length.toString().padStart(2, '0')} <small>PORTFOLIOS</small></span></div>
          <div className="portfolio-layout">
            <div className="portfolio-list">
              {portfolios.length === 0 && <div className="empty-state"><span className="empty-index">01</span><h2>A page for your next chapter.</h2><p>Create your first portfolio and start shaping it.</p></div>}
              {portfolios.map((portfolio, index) => <button key={portfolio.id} className="portfolio-row" onClick={() => selectPortfolio(portfolio)}><span className="row-number">{String(index + 1).padStart(2, '0')}</span><span className="row-main"><strong>{portfolio.subdomain}</strong><small>{portfolio.subdomain}.yoursite.com</small></span><span className={`status status-${portfolio.status}`}>{portfolio.status}</span><span className="row-arrow" aria-hidden="true">↗</span></button>)}
            </div>
            <form className="create-form" onSubmit={createPortfolio}><p className="eyebrow">START SOMETHING NEW</p><h2>Claim your address</h2><label>Portfolio subdomain<div className="domain-input"><input required value={newSubdomain} onChange={(event) => { setNewSubdomain(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); setMessage('') }} maxLength={30} pattern="[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])?" /><span>.yoursite.com</span></div></label><div className="inline-actions"><button type="button" className="secondary-button" disabled={isCheckingSubdomain || !newSubdomain} onClick={checkSubdomain}>{isCheckingSubdomain ? 'Checking...' : 'Check address'}</button><button className="primary-button" disabled={busy || !newSubdomain}>{busy ? 'Creating...' : 'Create portfolio'}</button></div>{message && <p className="notice" role="status">{message}</p>}{error && <p className="notice error-notice" role="alert">{error}</p>}</form>
          </div>
        </section>
      ) : showNfcStudio ? (
        <div className="editor">
          <NfcStudio portfolio={selected} onBack={() => setShowNfcStudio(false)} />
        </div>
      ) : (
        <section className="editor">
          <div className="editor-heading"><div><button className="back-button" onClick={() => { setSelected(null); setShowNfcStudio(false); setMessage(''); setError('') }}>← All portfolios</button><h1>{selected.subdomain}<span>.yoursite.com</span></h1></div><div className="save-controls">{message && <span className="save-message" role="status">{message}</span>}{error && <span className="save-message error-text" role="alert">{error}</span>}<button className="secondary-button" onClick={() => setShowNfcStudio(true)}>Design NFC card</button>{selected.status === 'published' ? <button className="secondary-button" onClick={unpublishPortfolio} disabled={busy}>Unpublish</button> : null}<button className="secondary-button" onClick={saveDraft} disabled={busy}>{busy ? 'Saving...' : 'Save draft'}</button>{selected.status !== 'published' && <button className="primary-button" onClick={publishPortfolio} disabled={busy}>{busy ? 'Working...' : 'Publish'}</button>}</div></div>
          <div className="editor-grid">
            <aside className="editor-sidebar"><div className="panel-label">PAGE CONTENT</div><div className="block-list">{blocks.map((block, index) => <button key={`${block.type}-${index}`} className={`block-tab ${activeBlock === index ? 'active' : ''}`} onClick={() => setActiveBlock(index)}><span>{String(index + 1).padStart(2, '0')}</span>{block.type}<b>›</b></button>)}</div><label className="add-section-label" htmlFor="add-section">Add section</label><select id="add-section" value="" onChange={(event) => { if (event.target.value) addBlock(event.target.value as PortfolioBlock['type']) }}><option value="" disabled>Choose a section</option><option value="hero">Hero</option><option value="about">About</option><option value="projects">Projects</option><option value="contact">Contact</option></select><div className="theme-control"><div className="panel-label">APPEARANCE</div><label>Accent color<div className="color-control"><input type="color" value={theme.accentColor} onChange={(event) => setTheme((current) => ({ ...current, accentColor: event.target.value as `#${string}` }))} /><code>{theme.accentColor}</code></div></label></div></aside>
            <div className="settings-panel"><div className="panel-label">SECTION SETTINGS</div>{blocks[activeBlock] ? <BlockForm block={blocks[activeBlock]} onChange={(next) => updateBlock(activeBlock, () => next)} /> : <p className="muted">Choose or add a page section.</p>}</div>
            <div className="preview-stage"><div className="preview-toolbar"><span><i /> LIVE PREVIEW</span><span>{selected.status.toUpperCase()}</span></div><PortfolioPreview blocks={blocks} theme={theme} /></div>
          </div>
        </section>
      )}
    </main>
  )
}

function BlockForm({ block, onChange }: { block: PortfolioBlock; onChange: (block: PortfolioBlock) => void }) {
  if (block.type === 'hero') return <div className="field-stack"><label>Name<input value={block.data.name} onChange={(event) => onChange({ ...block, data: { ...block.data, name: event.target.value } })} /></label><label>Tagline<input value={block.data.tagline} onChange={(event) => onChange({ ...block, data: { ...block.data, tagline: event.target.value } })} /></label><label>Portrait URL <span className="optional">OPTIONAL</span><input type="url" value={block.data.avatarUrl ?? ''} onChange={(event) => onChange({ ...block, data: { ...block.data, avatarUrl: event.target.value || undefined } })} placeholder="https://..." /></label></div>
  if (block.type === 'about') return <div className="field-stack"><label>Introduction<textarea rows={8} value={block.data.body} onChange={(event) => onChange({ ...block, data: { body: event.target.value } })} placeholder="A few words about your practice..." /></label></div>
  if (block.type === 'projects') return <div className="field-stack"><label>Project title<input value={block.data.items[0]?.title ?? ''} onChange={(event) => onChange({ ...block, data: { items: [{ ...block.data.items[0], title: event.target.value }] } })} /></label><label>Description<textarea rows={5} value={block.data.items[0]?.description ?? ''} onChange={(event) => onChange({ ...block, data: { items: [{ ...block.data.items[0], description: event.target.value }] } })} /></label><label>Project link<input type="url" value={block.data.items[0]?.link ?? ''} onChange={(event) => onChange({ ...block, data: { items: [{ ...block.data.items[0], link: event.target.value }] } })} placeholder="https://..." /></label></div>
  return <div className="field-stack"><label>Contact email<input type="email" value={block.data.email ?? ''} onChange={(event) => onChange({ ...block, data: { ...block.data, email: event.target.value } })} placeholder="hello@example.com" /></label></div>
}

function PortfolioPreview({ blocks, theme }: { blocks: PortfolioBlock[]; theme: PortfolioTheme }) {
  const hero = blocks.find((block) => block.type === 'hero')
  const about = blocks.find((block) => block.type === 'about')
  const projects = blocks.find((block) => block.type === 'projects')
  const contact = blocks.find((block) => block.type === 'contact')
  return <article className="portfolio-preview" style={{ '--preview-accent': theme.accentColor } as CSSProperties}>
    <div className="preview-nav"><span>{hero?.type === 'hero' ? hero.data.name || 'PORTFOLIO' : 'PORTFOLIO'}</span><span>INDEX&nbsp;&nbsp; 01—04</span></div>
    {hero?.type === 'hero' && <section className="preview-hero"><p className="preview-kicker">INDEPENDENT CREATIVE</p><h2>{hero.data.name || 'Your name'}<br /><em>{hero.data.tagline || 'What you do'}</em></h2><span className="preview-scroll">SCROLL TO EXPLORE ↓</span>{hero.data.avatarUrl && <img src={hero.data.avatarUrl} alt="" />}</section>}
    {about?.type === 'about' && <section className="preview-about"><span>01 / ABOUT</span><p>{about.data.body || 'Your introduction will appear here.'}</p></section>}
    {projects?.type === 'projects' && <section className="preview-projects"><span>02 / SELECTED WORK</span>{projects.data.items.map((item, index) => <div className="preview-project" key={`${item.title}-${index}`}><b>{String(index + 1).padStart(2, '0')}</b><div><strong>{item.title || 'Project title'}</strong><small>{item.description || 'Project description'}</small></div><span>↗</span></div>)}</section>}
    {contact?.type === 'contact' && <section className="preview-contact"><span>03 / CONTACT</span><a href={contact.data.email ? `mailto:${contact.data.email}` : undefined}>{contact.data.email || 'Start a conversation'} ↗</a></section>}
    <footer className="preview-footer"><span>© {new Date().getFullYear()}</span><span>MADE WITH AMALINK</span></footer>
  </article>
}

export default App
