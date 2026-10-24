import { useEffect, useState, useRef, useCallback } from 'react'
import { NFC_CARD_TIER_META, TIER_PROFILE_LIMITS } from '@amalink/types'
import type { NfcCardTier, PortfolioBlock, PortfolioTheme, SocialLink, UserProfile } from '@amalink/types'
import { authClient } from './auth-client'
import { HomePage } from './HomePage'
import { SetupWizard, wizardDataToBlocks } from './SetupWizard'
import type { WizardData } from './SetupWizard'
import { NfcStudio } from './NfcStudio'
import { PublicProfilePage } from './PublicProfilePage'
import { API_URL, resolveMediaUrl } from './config'
import './Builder.css'
import './PublicProfile.css'
import { getSubdomain, getPortfolioDomainLabel, getPortfolioSubdomainUrl, isAdminRoute } from './url-helpers'
export { getSubdomain, getPortfolioSubdomainUrl, getPortfolioDomainLabel, isAdminRoute }
import { DigitalCard } from './DigitalCard'
import { BrandLogo } from './BrandLogo'
import { AdminPage } from './AdminPage'

type User = UserProfile

interface Portfolio {
  id: string
  subdomain: string
  status: 'draft' | 'published' | 'unpublished'
  theme: PortfolioTheme
  updatedAt: string
  content: { version: number; blocks: PortfolioBlock[] } | null
}

interface NfcOrderSummary {
  id: string
  status: 'pending' | 'printing' | 'shipped' | 'delivered'
  tier: NfcCardTier
  quantity: number
  unitPrice: number
  totalAmount: number
  currency: string
  shortUrl: string
  portfolio: { id: string; subdomain: string }
  createdAt: string
}

const cardTierStorageKey = 'koolink.selected-card-tier'
const cardTiers: NfcCardTier[] = ['individual', 'business', 'enterprise', 'corporate']

function getStoredCardTier(): NfcCardTier | null {
  const stored = window.sessionStorage.getItem(cardTierStorageKey)
  return cardTiers.includes(stored as NfcCardTier) ? stored as NfcCardTier : null
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

const sectionLabels: Record<PortfolioBlock['type'], string> = {
  hero: 'Identity & Hero',
  about: 'About & Bio',
  projects: 'Featured Work',
  contact: 'Contact & Socials',
  links: 'Custom Links',
}

function WorkspaceApp({ onNavigateToAdmin }: { onNavigateToAdmin?: () => void }) {
  const [user, setUser] = useState<User | null>(null)
  const [viewLanding, setViewLanding] = useState(false)
  const [isSessionPending, setIsSessionPending] = useState(true)
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [orders, setOrders] = useState<NfcOrderSummary[]>([])
  const [dashboardView, setDashboardView] = useState<'profiles' | 'orders'>('profiles')
  const [selected, setSelected] = useState<Portfolio | null>(null)
  const [showNfcStudio, setShowNfcStudio] = useState(false)
  const [selectedCardTier, setSelectedCardTier] = useState<NfcCardTier | null>(getStoredCardTier)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [blocks, setBlocks] = useState<PortfolioBlock[]>([])
  const [theme, setTheme] = useState<PortfolioTheme>({ id: 'minimal', accentColor: '#ff3535' })
  const [toast, setToast] = useState<{ id: number; message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [copiedSubdomain, setCopiedSubdomain] = useState(false)
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null)

  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'success', duration = 3500) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    const id = Date.now()
    setToast({ id, message: msg, type })
    toastTimeoutRef.current = setTimeout(() => {
      setToast((cur) => (cur?.id === id ? null : cur))
    }, duration)
  }, [])

  const setMessage = useCallback((msg: string) => {
    if (msg) showToast(msg, 'success')
  }, [showToast])

  const setError = useCallback((err: string) => {
    if (err) showToast(err, 'error')
  }, [showToast])
  const [busy, setBusy] = useState(false)
  const [activeBlock, setActiveBlock] = useState(0)
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [authProviders, setAuthProviders] = useState({ google: false, facebook: false })
  // Wizard: shown when user has no portfolios yet, or when creating a new one via dashboard
  const [showWizard, setShowWizard] = useState(false)
  const [wizardBusy, setWizardBusy] = useState(false)
  const [wizardError, setWizardError] = useState('')

  // Unsaved changes tracking
  const [savedSnapshot, setSavedSnapshot] = useState<string>('')
  const hasUnsavedChanges = Boolean(selected && savedSnapshot && JSON.stringify({ theme, blocks }) !== savedSnapshot)

  // Safeguard against accidental tab closing with unsaved edits
  useEffect(() => {
    if (!hasUnsavedChanges) return
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

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
      const sessionUser = data?.user as (Record<string, unknown> & { id: string; email: string }) | undefined
      if (sessionUser) {
        const storedTier = getStoredCardTier()
        const customerType = (cardTiers.includes(sessionUser.customerType as NfcCardTier)
          ? sessionUser.customerType
          : storedTier) as NfcCardTier | undefined
        setUser({
          id: sessionUser.id,
          email: sessionUser.email,
          name: sessionUser.name as string | undefined,
          customerType,
          companyName: sessionUser.companyName as string | undefined,
          phoneNumber: sessionUser.phoneNumber as string | undefined,
          tinNumber: sessionUser.tinNumber as string | undefined,
          teamSize: sessionUser.teamSize as string | undefined,
        })
      } else {
        setUser(null)
      }
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

  const orderOwnerId = user?.id
  useEffect(() => {
    if (!orderOwnerId) return
    let isCurrent = true
    apiRequest<NfcOrderSummary[]>('/nfc-orders/me').then((items) => {
      if (isCurrent) setOrders(items)
    }).catch((reason: Error) => {
      if (isCurrent) setError(reason.message)
    })
    return () => { isCurrent = false }
  }, [orderOwnerId])

  async function refreshOrders() {
    const items = await apiRequest<NfcOrderSummary[]>('/nfc-orders/me')
    setOrders(items)
  }

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
    const initialB = portfolio.content?.blocks ?? initialBlocks()
    const initialT = portfolio.theme ?? { id: 'minimal', accentColor: '#ff3535' }
    setSelected(portfolio)
    setShowNfcStudio(false)
    setBlocks(initialB)
    setTheme(initialT)
    setSavedSnapshot(JSON.stringify({ theme: initialT, blocks: initialB }))
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
      setSavedSnapshot(JSON.stringify({ theme, blocks }))
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
      setSavedSnapshot(JSON.stringify({ theme, blocks }))
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
      setSavedSnapshot(JSON.stringify({ theme, blocks }))
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

  async function handleAutoSaveBlock(updatedBlock: PortfolioBlock) {
    if (!selected) return
    const nextBlocks = blocks.map((b, i) => (i === activeBlock ? updatedBlock : b))
    setBlocks(nextBlocks)
    try {
      const updated = await apiRequest<Portfolio>(`/portfolios/${selected.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ theme, blocks: nextBlocks }),
      })
      setSelected(updated)
      setPortfolios((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      setSavedSnapshot(JSON.stringify({ theme, blocks: nextBlocks }))
      setMessage('Image saved to profile!')
    } catch (err) {
      console.warn('Auto-save error:', err)
    }
  }

  function moveBlock(index: number, direction: 'up' | 'down') {
    if (direction === 'up' && index > 0) {
      const next = [...blocks]
      const temp = next[index - 1]
      next[index - 1] = next[index]
      next[index] = temp
      setBlocks(next)
      setActiveBlock(index - 1)
    } else if (direction === 'down' && index < blocks.length - 1) {
      const next = [...blocks]
      const temp = next[index + 1]
      next[index + 1] = next[index]
      next[index] = temp
      setBlocks(next)
      setActiveBlock(index + 1)
    }
  }

  function removeBlock(index: number) {
    if (blocks.length <= 1) {
      alert('Your portfolio must keep at least one section.')
      return
    }
    const blockToRemove = blocks[index]
    const label = blockToRemove?.type ? blockToRemove.type.toUpperCase() : 'this'
    if (!window.confirm(`Are you sure you want to remove the ${label} section from your portfolio?`)) {
      return
    }
    const next = blocks.filter((_, idx) => idx !== index)
    setBlocks(next)
    setActiveBlock((prev) => Math.min(prev, Math.max(0, next.length - 1)))
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
    setOrders([])
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
          if (authenticatedUser.customerType) {
            window.sessionStorage.setItem(cardTierStorageKey, authenticatedUser.customerType)
            setSelectedCardTier(authenticatedUser.customerType)
          }
          setUser(authenticatedUser)
          setViewLanding(false)
        }}
        apiStatus={apiStatus}
        authProviders={authProviders}
        user={user}
        onOpenApp={() => setViewLanding(false)}
        onSelectCardTier={(tier) => {
          window.sessionStorage.setItem(cardTierStorageKey, tier)
          setSelectedCardTier(tier)
        }}
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

  function handleBackToDashboard() {
    if (hasUnsavedChanges) {
      if (!window.confirm('You have unsaved changes. Discard changes and return to portfolios?')) return
    }
    setSelected(null)
    setShowNfcStudio(false)
    setMessage('')
    setError('')
  }

  // Authenticated: show the main workspace
  return (
    <main className="workspace">
      <header className="topbar">
        <button
          className="brand-lockup"
          onClick={() => {
            if (selected && hasUnsavedChanges) {
              if (!window.confirm('You have unsaved changes. Discard changes and return to dashboard?')) return
            }
            setSelected(null)
            setMessage('')
            setError('')
          }}
        >
          <BrandLogo variant="workspace" />
        </button>
        <div className="topbar-right">
          <button
            className="text-button"
            onClick={() => {
              if (selected && hasUnsavedChanges) {
                if (!window.confirm('You have unsaved changes. Discard changes and leave?')) return
              }
              setViewLanding(true)
            }}
          >
            NFC Cards &amp; Pricing
          </button>
          <div className="user-account-badge" title={user.customerType ? `${user.customerType.toUpperCase()} Account` : 'Individual Account'}>
            <span className="user-tier-pill">
              {user.customerType ? (user.customerType === 'business' ? 'S&M Business' : user.customerType.charAt(0).toUpperCase() + user.customerType.slice(1)) : 'Individual'}
            </span>
            {user.companyName && (
              <span className="user-company-pill">{user.companyName}</span>
            )}
          </div>
          {(user.role === 'admin' || user.email === 'roben@sewnet.et' || user.email?.includes('admin')) && (
            <button
              type="button"
              style={{
                height: 30,
                padding: '0 10px',
                fontSize: 11,
                fontWeight: 700,
                background: '#0f172a',
                color: '#38bdf8',
                border: '1px solid #334155',
                borderRadius: 6,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
              onClick={onNavigateToAdmin}
              title="Go to Dedicated Admin Fulfillment Portal (/admin)"
            >
              <span>🛡️ Admin Portal</span>
              <span>↗</span>
            </button>
          )}
          <span className="user-email">{user.email}</span>
          <button
            className="text-button"
            onClick={() => {
              if (selected && hasUnsavedChanges) {
                if (!window.confirm('You have unsaved changes. Discard changes and sign out?')) return
              }
              void signOut()
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      {!selected ? (
        <section className="dashboard">
          <div className="dashboard-clean-header">
            <div>
              <p className="eyebrow">KOOLINK WORKSPACE</p>
              <h1 style={{ fontSize: 32, margin: 0, fontWeight: 700, color: 'var(--ink)' }}>
                {dashboardView === 'profiles' ? 'Your Profiles' : 'Card Orders'}
              </h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div className="dashboard-nav-tabs">
                <button
                  type="button"
                  className={`dashboard-nav-tab ${dashboardView === 'profiles' ? 'active' : ''}`}
                  onClick={() => setDashboardView('profiles')}
                >
                  Profiles ({portfolios.length})
                </button>
                <button
                  type="button"
                  className={`dashboard-nav-tab ${dashboardView === 'orders' ? 'active' : ''}`}
                  onClick={() => setDashboardView('orders')}
                >
                  Card Orders ({orders.length})
                </button>
              </div>
              {dashboardView === 'profiles' && (() => {
                const userTier: NfcCardTier = user.customerType ?? 'individual'
                const tierMeta = NFC_CARD_TIER_META[userTier]
                const profileLimit = TIER_PROFILE_LIMITS[userTier]
                const isLimitReached = profileLimit !== null && portfolios.length >= profileLimit
                return (
                  <div className="dashboard-header-right-actions">
                    <div
                      className={`profile-limit-pill ${isLimitReached ? 'limit-reached' : ''}`}
                      title={isLimitReached ? `${tierMeta.name} limit of ${profileLimit} profiles reached` : `${portfolios.length} of ${profileLimit ?? '∞'} ${tierMeta.name} profiles used`}
                      onClick={() => { if (isLimitReached) setShowUpgradeModal(true) }}
                    >
                      <span className="profile-limit-dot" />
                      <span>
                        {portfolios.length} / {profileLimit !== null ? profileLimit : '∞'} Profiles
                      </span>
                      {isLimitReached && <span className="profile-upgrade-hint">Upgrade</span>}
                    </div>

                    <button
                      type="button"
                      className="primary-button"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38 }}
                      onClick={() => {
                        if (isLimitReached) {
                          setShowUpgradeModal(true)
                          return
                        }
                        setWizardError('')
                        setShowWizard(true)
                      }}
                    >
                      <span>+</span> New Profile
                    </button>
                  </div>
                )
              })()}
            </div>
          </div>

          {dashboardView === 'profiles' && (() => {
            const userTier: NfcCardTier = user.customerType ?? 'individual'
            const tierMeta = NFC_CARD_TIER_META[userTier]
            const profileLimit = TIER_PROFILE_LIMITS[userTier]
            return (
              <div className="dashboard-announcement-banner">
                <div className="announcement-content">
                  <span className="coming-soon-badge">Coming Soon</span>
                  {userTier === 'individual' ? (
                    <div className="announcement-text">
                      <strong>Custom Domain Linking (.et) &amp; Offline vCard QR</strong>
                      <p>Link your personal domain directly to your digital card with automated verification.</p>
                    </div>
                  ) : (
                    <div className="announcement-text">
                      <strong>Bulk Employee CSV Import &amp; Brand Palette Lock</strong>
                      <p>Upload a team spreadsheet to auto-generate up to {profileLimit ?? 100} branded cards for {user.companyName || 'your organization'}.</p>
                    </div>
                  )}
                </div>
                <span className="announcement-tag">{tierMeta.name} Feature</span>
              </div>
            )
          })()}

          {dashboardView === 'orders' ? (
            <div className="portfolio-list">
              {orders.length === 0 ? (
                <div className="empty-state">
                  <h2>No card requests yet.</h2>
                  <p>Order a physical contactless NFC card from the Card Studio for any published profile.</p>
                </div>
              ) : orders.map((order, index) => (
                <article key={order.id} className="portfolio-row" style={{ cursor: 'default' }}>
                  <span className="row-number">{String(index + 1).padStart(2, '0')}</span>
                  <span className="row-main">
                    <strong>{order.tier} · {order.quantity} {order.quantity === 1 ? 'card' : 'cards'}</strong>
                    <small>{getPortfolioDomainLabel(order.portfolio.subdomain)} · {new Date(order.createdAt).toLocaleDateString()}</small>
                  </span>
                  <span className={`status status-${order.status}`}>{order.status}</span>
                  <span className="portfolio-count" style={{ fontSize: 18 }}>{order.totalAmount.toLocaleString()} <small>{order.currency}</small></span>
                  <button
                    type="button"
                    className="secondary-button"
                    style={{ height: 38, padding: '0 12px', fontSize: 11, cursor: 'pointer' }}
                    onClick={() => {
                      navigator.clipboard.writeText(order.shortUrl)
                      setCopiedOrderId(order.id)
                      setTimeout(() => setCopiedOrderId(null), 2000)
                      showToast(`Shortlink copied for ${order.portfolio.subdomain}!`, 'success')
                    }}
                    title="Copy card shortlink"
                  >
                    {copiedOrderId === order.id ? <span className="copy-badge-pill">✓ Copied!</span> : 'Copy shortlink'}
                  </button>
                  <a href={order.shortUrl} target="_blank" rel="noreferrer" className="row-arrow" aria-label={`Open tap link for ${order.portfolio.subdomain}`}>↗</a>
                </article>
              ))}
            </div>
          ) : (
            <div className="profiles-clean-list">
              {portfolios.length === 0 ? (
                <div className="empty-state" style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <h2 style={{ fontSize: 24, margin: '0 0 10px' }}>No profiles yet.</h2>
                  <p style={{ color: 'var(--muted)', margin: '0 0 20px' }}>Create your first contactless digital business card in seconds.</p>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => {
                      const userTier: NfcCardTier = user.customerType ?? 'individual'
                      const profileLimit = TIER_PROFILE_LIMITS[userTier]
                      if (profileLimit !== null && portfolios.length >= profileLimit) {
                        setShowUpgradeModal(true)
                        return
                      }
                      setWizardError('')
                      setShowWizard(true)
                    }}
                  >
                    + Create Your First Profile
                  </button>
                </div>
              ) : (
                portfolios.map((portfolio) => {
                  const subUrl = getPortfolioSubdomainUrl(portfolio.subdomain, portfolio.status === 'draft')
                  return (
                    <div
                      key={portfolio.id}
                      className="profile-clean-card"
                      onClick={() => selectPortfolio(portfolio)}
                    >
                      <div className="profile-card-left">
                        <span className={`status-badge status-${portfolio.status}`}>
                          <span className="status-dot" />
                          {portfolio.status === 'published' ? 'Live' : 'Draft'}
                        </span>
                        <div>
                          <div className="profile-card-name">
                            {portfolio.subdomain}
                            <span style={{ color: 'var(--muted)', fontWeight: 400 }}>.sewnet.et</span>
                          </div>
                          <div className="profile-card-domain">
                            Updated {new Date(portfolio.updatedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="profile-card-actions" onClick={(e) => e.stopPropagation()}>
                        <a
                          href={subUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="secondary-button"
                          style={{ height: 36, padding: '0 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                          title={`Open ${getPortfolioDomainLabel(portfolio.subdomain)}`}
                        >
                          <span>{portfolio.status === 'published' ? 'View Live' : 'Preview'}</span>
                          <span>↗</span>
                        </a>
                        <button
                          type="button"
                          className="primary-button"
                          style={{ height: 36, padding: '0 14px', fontSize: 12 }}
                          onClick={() => selectPortfolio(portfolio)}
                        >
                          Edit Profile →
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {showUpgradeModal && (() => {
            const userTier: NfcCardTier = user.customerType ?? 'individual'
            const tierMeta = NFC_CARD_TIER_META[userTier]
            const profileLimit = TIER_PROFILE_LIMITS[userTier]
            return (
              <div className="upgrade-modal-backdrop" onClick={() => setShowUpgradeModal(false)}>
                <div className="upgrade-modal-card" onClick={(e) => e.stopPropagation()}>
                  <div className="upgrade-modal-header">
                    <div>
                      <span className="upgrade-modal-eyebrow">PROFILE LIMIT REACHED</span>
                      <h2>Upgrade Account Capacity</h2>
                    </div>
                    <button
                      type="button"
                      className="auth-close-btn"
                      onClick={() => setShowUpgradeModal(false)}
                    >
                      ✕
                    </button>
                  </div>

                  <p className="upgrade-modal-desc">
                    Your <strong>{tierMeta.name}</strong> account allows a maximum of{' '}
                    <strong>{profileLimit} {profileLimit === 1 ? 'profile' : 'profiles'}</strong> ({portfolios.length} used).
                    Upgrade to an organization tier to create multiple team profiles and unlock volume card discounts.
                  </p>

                  <div className="upgrade-tier-grid">
                    {(['individual', 'business', 'enterprise', 'corporate'] as NfcCardTier[]).map((tierKey) => {
                      const meta = NFC_CARD_TIER_META[tierKey]
                      const isCurrent = userTier === tierKey
                      return (
                        <div key={tierKey} className={`upgrade-tier-card ${isCurrent ? 'current' : ''}`}>
                          <div className="upgrade-tier-card-header">
                            <strong>{meta.name}</strong>
                            {isCurrent && <span className="current-badge">Current</span>}
                          </div>
                          <div className="upgrade-tier-limit-badge">
                            {meta.profileLimit !== null ? `Up to ${meta.profileLimit} Profiles` : 'Unlimited Profiles'}
                          </div>
                          <div className="upgrade-tier-price">
                            <span>{meta.priceETB.toLocaleString()} ETB</span>
                            <small>/ card ({meta.rangeLabel})</small>
                          </div>
                          <p className="upgrade-tier-desc">{meta.description}</p>
                          {!isCurrent && (
                            <button
                              type="button"
                              className="primary-button upgrade-action-btn"
                              onClick={() => {
                                setShowUpgradeModal(false)
                                setSelectedCardTier(tierKey)
                                setShowNfcStudio(true)
                              }}
                            >
                              Select {meta.name} →
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <div className="upgrade-modal-footer">
                    <button type="button" className="text-button" onClick={() => setShowUpgradeModal(false)}>
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )
          })()}
        </section>
      ) : showNfcStudio ? (
        <div className="editor">
          <NfcStudio
            portfolio={selected}
            user={user}
            initialTier={user.customerType ?? selectedCardTier ?? undefined}
            onOrderCreated={() => { void refreshOrders().catch((reason: Error) => setError(reason.message)) }}
            onBack={() => setShowNfcStudio(false)}
          />
        </div>
      ) : (
        <section className="editor">
          <div className="editor-toolbar">
            <div className="editor-toolbar-left">
              <button
                type="button"
                className="back-button"
                onClick={handleBackToDashboard}
                title="Return to profiles dashboard"
              >
                ← Profiles
              </button>
              <div className="editor-profile-identity">
                <span className="editor-profile-name">
                  <strong>{selected.subdomain}</strong>
                  <small>.sewnet.et</small>
                </span>
                <span className={`status-badge status-${selected.status}`}>
                  <span className="status-dot" />
                  {selected.status === 'published' ? 'Live' : 'Draft'}
                </span>
                <button
                  type="button"
                  className="toolbar-text-btn"
                  onClick={openDomainModal}
                  title="Change profile address"
                >
                  ✎ Edit
                </button>
                <button
                  type="button"
                  className="toolbar-text-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(getPortfolioSubdomainUrl(selected.subdomain, selected.status === 'draft'))
                    setCopiedSubdomain(true)
                    setTimeout(() => setCopiedSubdomain(false), 2000)
                    showToast('Address copied to clipboard!', 'success')
                  }}
                  title="Copy link to clipboard"
                >
                  {copiedSubdomain ? <span className="copy-badge-pill">✓ Copied</span> : 'Copy link'}
                </button>
              </div>
            </div>

            <div className="editor-toolbar-right">
              <div className="save-status-group">
                {hasUnsavedChanges ? (
                  <span className="unsaved-badge" title="You have unsaved changes">
                    <span className="unsaved-dot" />
                    Unsaved
                  </span>
                ) : (
                  <span className="all-saved-badge" title="All edits are saved">
                    <span className="saved-check">✓</span>
                    Saved
                  </span>
                )}
              </div>
              <a
                href={getPortfolioSubdomainUrl(selected.subdomain, selected.status === 'draft')}
                target="_blank"
                rel="noreferrer"
                className="secondary-button toolbar-action-btn"
                title="Open in new tab"
              >
                Preview ↗
              </a>
              <button
                type="button"
                className="secondary-button toolbar-action-btn"
                onClick={() => setShowNfcStudio(true)}
              >
                Order NFC Card
              </button>
              {selected.status === 'published' ? (
                <>
                  <button
                    type="button"
                    className="text-button"
                    style={{ fontSize: 11, color: 'var(--muted)' }}
                    onClick={unpublishPortfolio}
                    disabled={busy}
                    title="Revert profile to draft"
                  >
                    Unpublish
                  </button>
                  <button
                    type="button"
                    className={`primary-button ${hasUnsavedChanges ? 'save-btn-highlight' : ''}`}
                    onClick={saveDraft}
                    disabled={busy || !hasUnsavedChanges}
                  >
                    {busy ? 'Saving…' : 'Save'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="secondary-button toolbar-action-btn"
                    onClick={saveDraft}
                    disabled={busy}
                  >
                    {busy ? 'Saving…' : 'Save draft'}
                  </button>
                  <button
                    type="button"
                    className="primary-button toolbar-action-btn"
                    onClick={publishPortfolio}
                    disabled={busy}
                  >
                    {busy ? 'Publishing…' : 'Publish'}
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="editor-grid">
            <aside className="editor-sidebar">
              <div className="panel-label">PAGE CONTENT</div>
              <div className="block-list">
                {blocks.map((block, index) => (
                  <div
                    key={`${block.type}-${index}`}
                    className={`block-row-container ${activeBlock === index ? 'active' : ''}`}
                  >
                    <button
                      type="button"
                      className={`block-tab-main ${activeBlock === index ? 'active' : ''}`}
                      onClick={() => setActiveBlock(index)}
                    >
                      <span className="block-tab-num">{String(index + 1).padStart(2, '0')}</span>
                      <span className="block-tab-label">{sectionLabels[block.type] || block.type}</span>
                    </button>
                    <div className="block-tab-tools">
                      <button
                        type="button"
                        className="btn-tab-tool"
                        onClick={(e) => {
                          e.stopPropagation()
                          moveBlock(index, 'up')
                        }}
                        disabled={index === 0}
                        title="Move section up"
                        aria-label="Move section up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="btn-tab-tool"
                        onClick={(e) => {
                          e.stopPropagation()
                          moveBlock(index, 'down')
                        }}
                        disabled={index === blocks.length - 1}
                        title="Move section down"
                        aria-label="Move section down"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="btn-tab-tool btn-tab-delete"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeBlock(index)
                        }}
                        title="Remove section"
                        aria-label="Remove section"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <label className="add-section-label" htmlFor="add-section">+ Add section</label>
              <select
                id="add-section"
                value=""
                onChange={(e) => {
                  if (e.target.value) addBlock(e.target.value as PortfolioBlock['type'])
                }}
              >
                <option value="" disabled>Choose a section to add</option>
                <option value="hero">Hero / Header</option>
                <option value="about">About / Bio</option>
                <option value="projects">Projects &amp; Work</option>
                <option value="contact">Contact &amp; Socials</option>
                <option value="links">Custom Links</option>
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
                ? <BlockForm
                    block={blocks[activeBlock]}
                    portfolioId={selected.id}
                    onChange={(next) => updateBlock(activeBlock, () => next)}
                    onAutoSave={handleAutoSaveBlock}
                    onRemove={() => removeBlock(activeBlock)}
                    onMoveUp={() => moveBlock(activeBlock, 'up')}
                    onMoveDown={() => moveBlock(activeBlock, 'down')}
                    canMoveUp={activeBlock > 0}
                    canMoveDown={activeBlock < blocks.length - 1}
                    index={activeBlock}
                    total={blocks.length}
                  />
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
      {/* Floating Workspace Toast Notification */}
      {toast && (
        <div className={`workspace-toast ${toast.type}`} role="status">
          <span className="toast-icon">
            {toast.type === 'success' ? '✓' : toast.type === 'error' ? '!' : 'ℹ'}
          </span>
          <span className="toast-text">{toast.message}</span>
          <button
            type="button"
            className="toast-close"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}
    </main>
  )
}

interface BlockFormProps {
  block: PortfolioBlock
  portfolioId: string
  onChange: (block: PortfolioBlock) => void
  onAutoSave?: (block: PortfolioBlock) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp: boolean
  canMoveDown: boolean
  index: number
  total: number
}

function BlockForm({
  block,
  portfolioId,
  onChange,
  onAutoSave,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  index,
  total,
}: BlockFormProps) {
  const [uploadingImage, setUploadingImage] = useState<string | null>(null)
  const [imageError, setImageError] = useState('')

  const sectionHeader = (
    <div className="section-header-bar">
      <div className="section-header-info">
        <span className="section-header-tag">Section {index + 1} of {total}</span>
        <span className="section-header-name">{block.type.toUpperCase()}</span>
      </div>
      <div className="section-header-actions">
        <button
          type="button"
          className="btn-section-action"
          onClick={onMoveUp}
          disabled={!canMoveUp}
          title="Move section up"
          aria-label="Move section up"
        >
          ↑ Up
        </button>
        <button
          type="button"
          className="btn-section-action"
          onClick={onMoveDown}
          disabled={!canMoveDown}
          title="Move section down"
          aria-label="Move section down"
        >
          ↓ Down
        </button>
        <button
          type="button"
          className="btn-section-action btn-section-delete"
          onClick={onRemove}
          title="Delete this section"
          aria-label="Delete this section"
        >
          ✕ Remove
        </button>
      </div>
    </div>
  )

  if (block.type === 'hero') {
    const heroData = block.data

    async function uploadImage(field: 'avatarUrl' | 'headerImageUrl', file: File) {
      setImageError('')
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) {
        setImageError('Choose a JPG, PNG, WebP, or AVIF image.')
        return
      }
      if (file.size > 8 * 1024 * 1024) {
        setImageError('Image must be 8 MB or smaller.')
        return
      }

      setUploadingImage(field)
      try {
        const uploadResponse = await fetch(`${API_URL}/media/upload-url`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            portfolioId,
            contentType: file.type,
            imageType: field === 'headerImageUrl' ? 'header' : 'portfolio',
          }),
        })
        const upload = await uploadResponse.json() as {
          assetId?: string
          uploadUrl?: string
          publicUrl?: string
          headers?: Record<string, string>
          message?: string | string[]
        }
        if (!uploadResponse.ok || !upload.assetId || !upload.uploadUrl || !upload.publicUrl) {
          throw new Error(Array.isArray(upload.message) ? upload.message.join(', ') : upload.message ?? 'Unable to prepare image upload.')
        }

        const putResponse = await fetch(upload.uploadUrl, {
          method: 'PUT',
          headers: upload.headers,
          body: file,
        })
        if (!putResponse.ok) throw new Error('Image upload failed. Please try again.')

        const confirmResponse = await fetch(
          `${API_URL}/media/assets/${upload.assetId}/confirm`,
          {
            method: 'POST',
            credentials: 'include',
          },
        )
        const confirmation = await confirmResponse.json() as {
          publicUrl?: string
          message?: string | string[]
        }
        if (!confirmResponse.ok || !confirmation.publicUrl) {
          throw new Error(
            Array.isArray(confirmation.message)
              ? confirmation.message.join(', ')
              : confirmation.message ?? 'Uploaded file could not be verified.',
          )
        }

        const nextHero: PortfolioBlock = { type: 'hero', data: { ...heroData, [field]: upload.publicUrl } }
        onChange(nextHero)
        if (onAutoSave) void onAutoSave(nextHero)
      } catch (reason) {
        setImageError(reason instanceof Error ? reason.message : 'Image upload failed.')
      } finally {
        setUploadingImage(null)
      }
    }

    function imageField(field: 'avatarUrl' | 'headerImageUrl', label: string) {
      const value = heroData[field]
      const isUploading = uploadingImage === field
      return (
        <div className="portfolio-image-field">
          <span className="portfolio-image-label">{label} <span className="optional">OPTIONAL</span></span>
          {value && <img className={`portfolio-image-preview ${field === 'headerImageUrl' ? 'header' : ''}`} src={resolveMediaUrl(value)} alt={`${label} preview`} />}
          <div className="portfolio-image-actions">
            <label className="secondary-button portfolio-image-upload">
              {isUploading ? 'Uploading…' : value ? 'Replace image' : 'Upload image'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                disabled={uploadingImage !== null}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void uploadImage(field, file)
                  event.target.value = ''
                }}
              />
            </label>
            {value && (
              <button
                type="button"
                className="text-button"
                disabled={uploadingImage !== null}
                onClick={() => {
                  const nextHero: PortfolioBlock = { type: 'hero', data: { ...heroData, [field]: undefined } }
                  onChange(nextHero)
                  if (onAutoSave) void onAutoSave(nextHero)
                }}
              >
                Remove
              </button>
            )}
          </div>
        </div>
      )
    }

    return (
      <div className="field-stack">
        {sectionHeader}
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
              placeholder="e.g. Your Company"
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
        {imageField('avatarUrl', 'Profile image')}
        {imageField('headerImageUrl', 'Header / background image')}
        {imageError && <p className="notice error-notice" role="alert">{imageError}</p>}
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
        {sectionHeader}
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
        {sectionHeader}
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

    function updateItem(itemIndex: number, patch: Partial<(typeof items)[0]>) {
      const next = items.map((it, idx) => (idx === itemIndex ? { ...it, ...patch } : it))
      onChange({ type: 'projects', data: { items: next } })
    }

    function addItem() {
      const next = [
        ...items,
        {
          title: `Project ${items.length + 1}`,
          description: '',
          link: '',
          imageUrl: '',
        },
      ]
      onChange({ type: 'projects', data: { items: next } })
    }

    function removeItem(itemIndex: number) {
      if (items.length <= 1) {
        if (!window.confirm('Delete this project?')) return
      }
      const next = items.filter((_, idx) => idx !== itemIndex)
      onChange({ type: 'projects', data: { items: next } })
    }

    function moveItem(itemIndex: number, direction: 'up' | 'down') {
      if (direction === 'up' && itemIndex > 0) {
        const next = [...items]
        const temp = next[itemIndex - 1]
        next[itemIndex - 1] = next[itemIndex]
        next[itemIndex] = temp
        onChange({ type: 'projects', data: { items: next } })
      } else if (direction === 'down' && itemIndex < items.length - 1) {
        const next = [...items]
        const temp = next[itemIndex + 1]
        next[itemIndex + 1] = next[itemIndex]
        next[itemIndex] = temp
        onChange({ type: 'projects', data: { items: next } })
      }
    }

    async function handleProjectImage(itemIndex: number, file: File) {
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) {
        setImageError('Choose a JPG, PNG, WebP, or AVIF image.')
        return
      }
      if (file.size > 8 * 1024 * 1024) {
        setImageError('Image must be 8 MB or smaller.')
        return
      }
      setImageError('')
      const uploadKey = `project-${itemIndex}`
      setUploadingImage(uploadKey)
      try {
        const uploadResponse = await fetch(`${API_URL}/media/upload-url`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            portfolioId,
            contentType: file.type,
            imageType: 'portfolio',
          }),
        })
        const upload = (await uploadResponse.json()) as {
          assetId?: string
          uploadUrl?: string
          publicUrl?: string
          headers?: Record<string, string>
          message?: string | string[]
        }
        if (!uploadResponse.ok || !upload.assetId || !upload.uploadUrl || !upload.publicUrl) {
          throw new Error('Failed to prepare project image upload.')
        }
        const putResponse = await fetch(upload.uploadUrl, {
          method: 'PUT',
          headers: upload.headers,
          body: file,
        })
        if (!putResponse.ok) throw new Error('Image upload failed.')
        const confirmResponse = await fetch(
          `${API_URL}/media/assets/${upload.assetId}/confirm`,
          {
            method: 'POST',
            credentials: 'include',
          },
        )
        const confirmation = (await confirmResponse.json()) as {
          publicUrl?: string
          message?: string | string[]
        }
        if (!confirmResponse.ok || !confirmation.publicUrl) {
          throw new Error(
            Array.isArray(confirmation.message)
              ? confirmation.message.join(', ')
              : confirmation.message ?? 'Uploaded project thumbnail could not be verified.',
          )
        }
        const next = items.map((it, idx) => (idx === itemIndex ? { ...it, imageUrl: confirmation.publicUrl } : it))
        const nextProjects: PortfolioBlock = { type: 'projects', data: { items: next } }
        onChange(nextProjects)
        if (onAutoSave) void onAutoSave(nextProjects)
      } catch (err) {
        setImageError(err instanceof Error ? err.message : 'Image upload failed.')
      } finally {
        setUploadingImage(null)
      }
    }

    return (
      <div className="field-stack">
        {sectionHeader}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>
            PROJECTS ({items.length})
          </span>
          <button
            type="button"
            className="text-button"
            style={{ fontSize: 11 }}
            onClick={addItem}
          >
            + Add project
          </button>
        </div>

        {items.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', background: '#faf8f5', border: '1px dashed var(--line)', borderRadius: 8 }}>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 10px' }}>No projects added yet.</p>
            <button type="button" className="btn-add-item" onClick={addItem}>
              + Add your first project
            </button>
          </div>
        )}

        {items.map((item, idx) => (
          <div key={`proj-${idx}`} className="item-card">
            <div className="item-card-header">
              <span className="item-card-title">
                <span className="item-card-index">#{idx + 1}</span>
                <span>{item.title || 'Untitled Project'}</span>
              </span>
              <div className="item-card-actions">
                <button
                  type="button"
                  className="btn-item-action"
                  onClick={() => moveItem(idx, 'up')}
                  disabled={idx === 0}
                  title="Move project up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn-item-action"
                  onClick={() => moveItem(idx, 'down')}
                  disabled={idx === items.length - 1}
                  title="Move project down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="btn-item-delete"
                  onClick={() => removeItem(idx)}
                  title="Remove this project"
                >
                  Remove
                </button>
              </div>
            </div>

            <label>
              Project Title
              <input
                value={item.title}
                onChange={(e) => updateItem(idx, { title: e.target.value })}
                placeholder="e.g. Mobile E-Commerce Redesign"
              />
            </label>

            <label>
              Link / URL <span className="optional">OPTIONAL</span>
              <input
                type="url"
                value={item.link ?? ''}
                onChange={(e) => updateItem(idx, { link: e.target.value })}
                placeholder="https://example.com/project"
              />
            </label>

            <label>
              Description <span className="optional">OPTIONAL</span>
              <textarea
                rows={3}
                value={item.description ?? ''}
                onChange={(e) => updateItem(idx, { description: e.target.value })}
                placeholder="Brief summary of your role, stack, or outcome..."
              />
            </label>

            <div className="portfolio-image-field" style={{ margin: 0 }}>
              <span className="portfolio-image-label">Thumbnail / Preview Image <span className="optional">OPTIONAL</span></span>
              {item.imageUrl && (
                <img
                  className="project-thumb-preview"
                  src={resolveMediaUrl(item.imageUrl)}
                  alt={`${item.title} thumbnail`}
                />
              )}
              <div className="portfolio-image-actions">
                <label className="secondary-button portfolio-image-upload" style={{ minHeight: 32, fontSize: 11 }}>
                  {uploadingImage === `project-${idx}` ? 'Uploading…' : item.imageUrl ? 'Replace thumbnail' : 'Upload thumbnail'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    disabled={uploadingImage !== null}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void handleProjectImage(idx, file)
                      e.target.value = ''
                    }}
                  />
                </label>
                {item.imageUrl && (
                  <button
                    type="button"
                    className="text-button"
                    style={{ fontSize: 11 }}
                    onClick={() => {
                      const next = items.map((it, i) => (i === idx ? { ...it, imageUrl: '' } : it))
                      const nextProjects: PortfolioBlock = { type: 'projects', data: { items: next } }
                      onChange(nextProjects)
                      if (onAutoSave) void onAutoSave(nextProjects)
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {items.length > 0 && (
          <button type="button" className="btn-add-item" onClick={addItem}>
            + Add another project
          </button>
        )}

        {imageError && <p className="notice error-notice" role="alert">{imageError}</p>}
      </div>
    )
  }

  if (block.type === 'links') {
    const items = block.data.items ?? []
    const title = block.data.title ?? 'Custom Links'

    function updateItem(itemIndex: number, patch: Partial<(typeof items)[0]>) {
      const next = items.map((it, idx) => (idx === itemIndex ? { ...it, ...patch } : it))
      onChange({ type: 'links', data: { title, items: next } })
    }

    function addItem() {
      const next = [...items, { title: 'New Link', url: 'https://' }]
      onChange({ type: 'links', data: { title, items: next } })
    }

    function removeItem(itemIndex: number) {
      const next = items.filter((_, idx) => idx !== itemIndex)
      onChange({ type: 'links', data: { title, items: next } })
    }

    function moveItem(itemIndex: number, direction: 'up' | 'down') {
      if (direction === 'up' && itemIndex > 0) {
        const next = [...items]
        const temp = next[itemIndex - 1]
        next[itemIndex - 1] = next[itemIndex]
        next[itemIndex] = temp
        onChange({ type: 'links', data: { title, items: next } })
      } else if (direction === 'down' && itemIndex < items.length - 1) {
        const next = [...items]
        const temp = next[itemIndex + 1]
        next[itemIndex + 1] = next[itemIndex]
        next[itemIndex] = temp
        onChange({ type: 'links', data: { title, items: next } })
      }
    }

    return (
      <div className="field-stack">
        {sectionHeader}
        <label>
          Section Title
          <input
            value={title}
            onChange={(e) => onChange({ type: 'links', data: { title: e.target.value, items } })}
            placeholder="Custom Links"
          />
        </label>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>
            LINKS LIST ({items.length})
          </span>
          <button
            type="button"
            className="text-button"
            style={{ fontSize: 11 }}
            onClick={addItem}
          >
            + Add link
          </button>
        </div>

        {items.map((item, idx) => (
          <div key={`link-${idx}`} className="item-card">
            <div className="item-card-header">
              <span className="item-card-title">
                <span className="item-card-index">#{idx + 1}</span>
                <span>{item.title || 'Untitled Link'}</span>
              </span>
              <div className="item-card-actions">
                <button
                  type="button"
                  className="btn-item-action"
                  onClick={() => moveItem(idx, 'up')}
                  disabled={idx === 0}
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn-item-action"
                  onClick={() => moveItem(idx, 'down')}
                  disabled={idx === items.length - 1}
                  title="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="btn-item-delete"
                  onClick={() => removeItem(idx)}
                  title="Remove link"
                >
                  Remove
                </button>
              </div>
            </div>

            <label>
              Link Title
              <input
                value={item.title}
                onChange={(e) => updateItem(idx, { title: e.target.value })}
                placeholder="e.g. Schedule a 1:1 Call"
              />
            </label>

            <label>
              URL
              <input
                type="url"
                value={item.url}
                onChange={(e) => updateItem(idx, { url: e.target.value })}
                placeholder="https://..."
              />
            </label>
          </div>
        ))}

        <button type="button" className="btn-add-item" onClick={addItem}>
          + Add another link
        </button>
      </div>
    )
  }

  return (
    <div className="field-stack">
      {sectionHeader}
      <p className="muted">Select a section above to customize.</p>
    </div>
  )
}

function PortfolioPreview({ blocks, theme, subdomain }: { blocks: PortfolioBlock[]; theme: PortfolioTheme; subdomain?: string }) {
  const [downloadNote, setDownloadNote] = useState<string | null>(null)
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'laptop'>('laptop')

  const hero = blocks.find((b) => b.type === 'hero')
  const about = blocks.find((b) => b.type === 'about')
  const projects = blocks.find((b) => b.type === 'projects')
  const contact = blocks.find((b) => b.type === 'contact')
  const linksBlock = blocks.find((b) => b.type === 'links')

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
  const accent = theme.accentColor || '#ff3535'

  const hasProjects = Boolean(projects?.type === 'projects' && Array.isArray(projects.data?.items) && projects.data.items.length > 0)
  const hasLinks = Boolean(linksBlock?.type === 'links' && Array.isArray(linksBlock.data?.items) && linksBlock.data.items.length > 0)
  const hasSidebarContent = hasProjects || hasLinks

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
    lines.push('NOTE:Koolink NFC Digital Identity Card')
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
    <div
      className="public-profile-viewport"
      style={{
        '--profile-accent': accent,
        borderRadius: '16px',
        minHeight: 680,
        padding: previewDevice === 'mobile' ? '20px 12px 32px' : '24px 24px 44px',
        transition: 'all 0.25s ease',
        ...(heroData.headerImageUrl
          ? {
              backgroundImage: `linear-gradient(to bottom, rgba(18, 16, 14, 0.72) 0%, rgba(18, 16, 14, 0.96) 520px, #12100e 100%)`,
              backgroundSize: '100% auto, cover',
              backgroundPosition: 'top center',
              backgroundRepeat: 'no-repeat',
            }
          : {}),
      } as React.CSSProperties}
    >
      {/* Device Viewport Selector */}
      <div style={{
        width: '100%',
        maxWidth: previewDevice === 'mobile' ? 420 : 1040,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 18,
        transition: 'max-width 0.25s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            className="secondary-button"
            style={{
              height: 28,
              padding: '0 10px',
              fontSize: 11,
              borderRadius: 20,
              background: previewDevice === 'laptop' ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.05)',
              color: '#fff',
              borderColor: previewDevice === 'laptop' ? 'rgba(255,255,255,0.3)' : 'transparent',
              cursor: 'pointer',
            }}
            onClick={() => setPreviewDevice('laptop')}
          >
            💻 Laptop View
          </button>
          <button
            type="button"
            className="secondary-button"
            style={{
              height: 28,
              padding: '0 10px',
              fontSize: 11,
              borderRadius: 20,
              background: previewDevice === 'mobile' ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.05)',
              color: '#fff',
              borderColor: previewDevice === 'mobile' ? 'rgba(255,255,255,0.3)' : 'transparent',
              cursor: 'pointer',
            }}
            onClick={() => setPreviewDevice('mobile')}
          >
            Mobile View
          </button>
        </div>

        <span style={{ fontSize: 11, fontWeight: 700, color: '#a89f91' }}>
          {displayUrl}
        </span>
      </div>

      <div style={{
        width: '100%',
        maxWidth: previewDevice === 'mobile' ? 420 : 1040,
        transition: 'max-width 0.25s ease',
      }}>
        <div className={`profile-main-grid ${previewDevice === 'laptop' && hasSidebarContent ? 'has-sidebar' : 'single-column'}`}>
          {/* Main Digital Card Column */}
          <div className="profile-card-column">
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
              accentColor={accent}
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

          {/* Right Column (Projects & Links) */}
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
        </div>
      </div>
    </div>
  )
}

export function App() {
  const [routePath, setRoutePath] = useState(() =>
    typeof window !== 'undefined' ? window.location.pathname.toLowerCase() : '/'
  )

  useEffect(() => {
    const handlePopState = () => {
      setRoutePath(window.location.pathname.toLowerCase())
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  function navigateTo(targetPath: string) {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', targetPath)
      setRoutePath(targetPath.toLowerCase())
    }
  }

  const activeSubdomain = getSubdomain()

  if (activeSubdomain) {
    return <PublicProfilePage subdomain={activeSubdomain} apiUrl={API_URL} />
  }

  const isAdmin = isAdminRoute() || routePath === '/admin' || routePath.startsWith('/admin/')

  if (isAdmin) {
    return (
      <AdminPage
        onNavigateToUserWorkspace={() => navigateTo('/')}
      />
    )
  }

  return (
    <WorkspaceApp
      onNavigateToAdmin={() => navigateTo('/admin')}
    />
  )
}

export default App
