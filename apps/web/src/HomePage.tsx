import { useEffect, useState } from 'react'
import { NFC_CARD_TIER_PRICES_ETB } from '@amalink/types'
import type { NfcCardTier } from '@amalink/types'
import { AuthPage } from './AuthPage'
import { BrandLogo } from './BrandLogo'
import './HomePage.css'

type CustomerType = 'individual' | 'business' | 'enterprise' | 'corporate'

interface User {
  id: string
  email: string
  customerType?: CustomerType
}

interface HomePageProps {
  onAuthenticated: (user: User) => void
  apiStatus: 'checking' | 'online' | 'offline'
  authProviders: { google: boolean; facebook: boolean }
  user?: User | null
  onOpenApp?: () => void
  onSelectCardTier: (tier: NfcCardTier) => void
}

const sampleProfiles = [
  { name: 'Amara Bekele', role: 'Creative Director', company: 'Studio Nara', bio: 'Building thoughtful brands and digital experiences.', initials: 'AB', color: '#1fb8c7', background: '#f4fbfb' },
  { name: 'Dawit Mamo', role: 'Architect', company: 'Dara Design', bio: 'Designing places for people to connect.', initials: 'DM', color: '#ed8065', background: '#fff8f5' },
  { name: 'Liya Getachew', role: 'Art Director', company: 'Independent', bio: 'Ideas made visible through image and type.', initials: 'LG', color: '#3974d4', background: '#f7f9ff' },
  { name: 'Henok Tadesse', role: 'Product Designer', company: 'Mosaic', bio: 'Making useful things feel effortless.', initials: 'HT', color: '#c6a64d', background: '#fffdf5' },
  { name: 'Selam Tesfaye', role: 'Founder', company: 'Selam Studio', bio: 'Connecting ambitious people to good work.', initials: 'ST', color: '#397a66', background: '#f5fbf7' },
]

export function HomePage({
  onAuthenticated,
  apiStatus,
  authProviders,
  user,
  onOpenApp,
  onSelectCardTier,
}: HomePageProps) {
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [activeProfile, setActiveProfile] = useState(0)
  const [isShowcasePaused, setIsShowcasePaused] = useState(false)
  const [isShowcaseHovered, setIsShowcaseHovered] = useState(false)
  const [isShowcaseFocused, setIsShowcaseFocused] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => setPrefersReducedMotion(preference.matches)
    preference.addEventListener('change', updatePreference)
    return () => preference.removeEventListener('change', updatePreference)
  }, [])

  useEffect(() => {
    if (isShowcasePaused || isShowcaseHovered || isShowcaseFocused || prefersReducedMotion) return
    const timer = window.setInterval(() => {
      setActiveProfile((current) => (current + 1) % sampleProfiles.length)
    }, 4500)
    return () => window.clearInterval(timer)
  }, [isShowcasePaused, isShowcaseHovered, isShowcaseFocused, prefersReducedMotion])

  function openAuth(mode: 'login' | 'signup') {
    if (user && onOpenApp) {
      onOpenApp()
      return
    }
    setAuthMode(mode)
    setAuthModalOpen(true)
  }

  function chooseCardTier(tier: NfcCardTier) {
    onSelectCardTier(tier)
    openAuth('signup')
  }

  function moveShowcase(step: number) {
    setActiveProfile((current) => (current + step + sampleProfiles.length) % sampleProfiles.length)
  }

  function scrollToSection(id: string) {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const faqs = [
    {
      q: 'How does the Koolink NFC Smart Card work?',
      a: 'The card contains an embedded contactless NTAG216 microchip. When tapped against any modern iPhone or Android smartphone, your custom Koolink digital profile opens instantly in their browser. For older devices, a dynamic QR code on the back provides an immediate fallback scan.',
    },
    {
      q: 'Does the other person need to install an app?',
      a: 'No app is required! The recipient simply taps or scans your card and your profile launches directly in their native browser (Safari, Chrome, etc.). From there, they can save your contact directly to their phonebook with a single tap.',
    },
    {
      q: 'Can I edit my contact info and portfolio after receiving the card?',
      a: 'Yes, anytime. The card links directly to your digital Koolink identity. You can update your phone number, social links, short bio, or appearance whenever you want from your dashboard, and your card will automatically reflect the latest information instantly.',
    },
    {
      q: 'How do payment and delivery work in Ethiopia?',
      a: 'Submitting a card request does not collect payment. Koolink will confirm availability, payment options, and delivery details with you before fulfillment.',
    },
  ]

  return (
    <div className="home-shell">
      {/* ── Navigation Bar ────────────────────────────────────────── */}
      <nav className="home-nav" aria-label="Main Navigation">
        <a href="#" className="home-nav-brand">
          <BrandLogo variant="nav" />
        </a>

        <div className="home-nav-links">
          <a href="#features" className="home-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('features') }}>
            Features
          </a>
          <a href="#cards" className="home-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('cards') }}>
            Smart Cards
          </a>
          <a href="#pricing" className="home-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('pricing') }}>
            Pricing
          </a>
          <a href="#faq" className="home-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('faq') }}>
            FAQ
          </a>
        </div>

        <div className="home-nav-actions">
          <div className="nav-status-pill" title={`API is ${apiStatus}`}>
            <span className={`nav-status-dot ${apiStatus}`} />
            <span>{apiStatus === 'online' ? 'Connected' : apiStatus === 'checking' ? 'Connecting…' : 'Offline'}</span>
          </div>

          {user ? (
            <button className="btn-nav-primary" onClick={onOpenApp}>
              Go to Workspace →
            </button>
          ) : (
            <>
              <button className="btn-nav-ghost" onClick={() => openAuth('login')}>
                Sign in
              </button>
              <button className="btn-nav-primary" onClick={() => openAuth('signup')}>
                Get Started
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero Section ─────────────────────────────────────────── */}
      <header className="home-hero">
        <div className="home-hero-container">
          <div className="hero-copy">
            <span className="hero-eyebrow">SMART NFC DIGITAL IDENTITY</span>
            <h1 className="hero-headline">
              <span>One identity.</span>
              <span>One tap.</span>
              <span>Every connection measured.</span>
            </h1>
            <p className="hero-subtitle">
              The contactless smart business card for modern professionals. Tap on any smartphone
              to share your live profile, contact details, and social links with zero friction.
            </p>

            <div className="hero-ctas">
              <button
                className="btn-hero-primary"
                onClick={() => scrollToSection('pricing')}
              >
                Order Smart Card — From 1,999 ETB
              </button>
              <button
                className="btn-hero-secondary"
                onClick={() => openAuth('signup')}
              >
                {user ? 'Open Workspace' : 'Create Free Portfolio →'}
              </button>
            </div>
          </div>

          <div
            className="hero-visual"
            id="cards"
            onMouseEnter={() => setIsShowcaseHovered(true)}
            onMouseLeave={() => setIsShowcaseHovered(false)}
            onFocusCapture={() => setIsShowcaseFocused(true)}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setIsShowcaseFocused(false)
              }
            }}
          >
            <div className="profile-showcase-heading">
              <span>MADE TO BE YOURS</span>
              <span>LIVE PROFILE PREVIEW</span>
            </div>
            <div className="profile-carousel" role="region" aria-roledescription="carousel" aria-label="Koolink digital profile examples">
              <div className="profile-carousel-track">
                {[-2, -1, 0, 1, 2].map((offset) => {
                  const profileIndex = (activeProfile + offset + sampleProfiles.length) % sampleProfiles.length
                  const profile = sampleProfiles[profileIndex]
                  const isActive = offset === 0
                  return (
                    <article
                      key={profile.name}
                      className={`profile-phone profile-phone--${['far-left', 'left', 'center', 'right', 'far-right'][offset + 2]}${isActive ? ' is-active' : ''}`}
                      style={{ '--profile-accent': profile.color, '--profile-screen': profile.background } as React.CSSProperties}
                      aria-label={`${profile.name}, ${profile.role}`}
                      aria-hidden={!isActive}
                    >
                      <div className="profile-phone-screen">
                        <div className="profile-phone-notch"><span /><i /></div>
                        <div className="profile-screen-cover">
                          <span className="profile-cover-orbit" />
                          <span className="profile-cover-brand">koolink</span>
                        </div>
                        <div className="profile-phone-content">
                          <div className="profile-avatar">{profile.initials}</div>
                          <h2>{profile.name}</h2>
                          <p className="profile-role">{profile.role}</p>
                          <p className="profile-company">{profile.company}</p>
                          <p className="profile-bio">{profile.bio}</p>
                          <div className="profile-actions" aria-hidden="true">
                            <span>Email</span><span>Phone</span><span>Website</span>
                          </div>
                        </div>
                        <div className="profile-phone-home" />
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
            <div className="profile-carousel-controls">
              <button type="button" className="profile-carousel-arrow" onClick={() => moveShowcase(-1)} aria-label="Previous profile">←</button>
              <div className="profile-carousel-dots" role="group" aria-label="Choose a profile preview">
                {sampleProfiles.map((profile, index) => (
                  <button
                    key={profile.name}
                    type="button"
                    className={`profile-carousel-dot${index === activeProfile ? ' is-active' : ''}`}
                    onClick={() => setActiveProfile(index)}
                    aria-label={`Show ${profile.name}`}
                    aria-pressed={index === activeProfile}
                  />
                ))}
              </div>
              <button type="button" className="profile-carousel-arrow" onClick={() => moveShowcase(1)} aria-label="Next profile">→</button>
              {!prefersReducedMotion && (
                <button
                  type="button"
                  className="profile-carousel-pause"
                  onClick={() => setIsShowcasePaused((paused) => !paused)}
                  aria-label={isShowcasePaused ? 'Resume profile previews' : 'Pause profile previews'}
                >
                  {isShowcasePaused ? 'Play' : 'Pause'}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Features Section ─────────────────────────────────────── */}
      <section id="features" className="home-features">
        <div className="section-header">
          <span className="section-eyebrow">WHY KOOLINK</span>
          <h2 className="section-title">One card. Endless possibilities.</h2>
          <p className="section-desc">
            Replace outdated paper cards with an intelligent, reusable digital identity that keeps
            your contact information, work, and links continuously updated.
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Instant Contactless Sharing</h3>
            <p>
              Hold your card near any modern iPhone or Android device. Your full profile and contact
              details open instantly in their browser with no app required.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🌐</div>
            <h3>Dynamic Digital Profile</h3>
            <p>
              Changed your phone number or bio? Update your profile anytime from your Koolink
              dashboard—your physical card always links to your latest information.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📇</div>
            <h3>Direct Phonebook Sync</h3>
            <p>
              Recipients can add your complete contact card directly into their smartphone address
              book with a single tap, eliminating typing errors and lost connections.
            </p>
          </div>
        </div>
      </section>

      {/* ── Pricing Section (4 Exact Tiers) ──────────────────────── */}
      <section id="pricing" className="home-pricing">
        <div className="pricing-container">
          <div className="section-header">
            <span className="section-eyebrow">TRANSPARENT PRICING</span>
            <h2 className="section-title">Choose the right card for your team</h2>
            <p className="section-desc">
              High-durability contactless NFC smart business cards delivered directly to you in Ethiopia.
            </p>
          </div>

          <div className="pricing-grid">
            {/* Tier 1: Individual */}
            <div className="pricing-card">
              <div className="pricing-content">
                <h3 className="pricing-tier-name">Individual</h3>
                <p className="pricing-tier-target">For one person</p>

                <div className="pricing-figure">
                  <span className="pricing-val">{NFC_CARD_TIER_PRICES_ETB.individual.toLocaleString()}</span>
                  <span className="pricing-curr">ETB</span>
                </div>
                <span className="pricing-unit">per card</span>

                <div className="pricing-sep" />

                <ul className="pricing-list">
                  <li>
                    <span className="check">✓</span>
                    <span>Tap-to-share card</span>
                  </li>
                  <li>
                    <span className="check">✓</span>
                    <span>QR code profile</span>
                  </li>
                  <li>
                    <span className="check">✓</span>
                    <span>Edit any time</span>
                  </li>
                </ul>
              </div>

              <button
                className="pricing-btn secondary"
                onClick={() => chooseCardTier('individual')}
              >
                Choose Individual
              </button>
            </div>

            {/* Tier 2: S&M Business */}
            <div className="pricing-card">
              <div className="pricing-content">
                <h3 className="pricing-tier-name">S&amp;M Business</h3>
                <p className="pricing-tier-target">For small and medium teams</p>

                <div className="pricing-figure">
                  <span className="pricing-val">{NFC_CARD_TIER_PRICES_ETB.business.toLocaleString()}</span>
                  <span className="pricing-curr">ETB</span>
                </div>
                <span className="pricing-unit">per card</span>

                <div className="pricing-sep" />

                <ul className="pricing-list">
                  <li>
                    <span className="check">✓</span>
                    <span>Tap-to-share card</span>
                  </li>
                  <li>
                    <span className="check">✓</span>
                    <span>QR code profile</span>
                  </li>
                  <li>
                    <span className="check">✓</span>
                    <span>Edit any time</span>
                  </li>
                </ul>
              </div>

              <button
                className="pricing-btn secondary"
                onClick={() => chooseCardTier('business')}
              >
                Choose S&amp;M
              </button>
            </div>

            {/* Tier 3: Enterprise */}
            <div className="pricing-card">
              <div className="pricing-content">
                <h3 className="pricing-tier-name">Enterprise</h3>
                <p className="pricing-tier-target">For large teams and events</p>

                <div className="pricing-figure">
                  <span className="pricing-val">{NFC_CARD_TIER_PRICES_ETB.enterprise.toLocaleString()}</span>
                  <span className="pricing-curr">ETB</span>
                </div>
                <span className="pricing-unit">per card</span>

                <div className="pricing-sep" />

                <ul className="pricing-list">
                  <li>
                    <span className="check">✓</span>
                    <span>Tap-to-share card</span>
                  </li>
                  <li>
                    <span className="check">✓</span>
                    <span>QR code profile</span>
                  </li>
                  <li>
                    <span className="check">✓</span>
                    <span>Edit any time</span>
                  </li>
                </ul>
              </div>

              <button
                className="pricing-btn secondary"
                onClick={() => chooseCardTier('enterprise')}
              >
                Choose Enterprise
              </button>
            </div>

            {/* Tier 4: Corporate */}
            <div className="pricing-card featured">
              <span className="pricing-badge">Lowest per card</span>
              <div className="pricing-content">
                <h3 className="pricing-tier-name">Corporate</h3>
                <p className="pricing-tier-target">For company-wide rollout</p>

                <div className="pricing-figure">
                  <span className="pricing-val">{NFC_CARD_TIER_PRICES_ETB.corporate.toLocaleString()}</span>
                  <span className="pricing-curr">ETB</span>
                </div>
                <span className="pricing-unit">per card</span>

                <div className="pricing-sep" />

                <ul className="pricing-list">
                  <li>
                    <span className="check">✓</span>
                    <span>Tap-to-share card</span>
                  </li>
                  <li>
                    <span className="check">✓</span>
                    <span>QR code profile</span>
                  </li>
                  <li>
                    <span className="check">✓</span>
                    <span>Edit any time</span>
                  </li>
                </ul>
              </div>

              <button
                className="pricing-btn primary"
                onClick={() => chooseCardTier('corporate')}
              >
                Choose Corporate
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ Section ───────────────────────────────────────────── */}
      <section id="faq" className="home-faq">
        <div className="faq-container">
          <div className="section-header">
            <span className="section-eyebrow">COMMON QUESTIONS</span>
            <h2 className="section-title">Frequently asked questions</h2>
            <p className="section-desc">
              Everything you need to know about getting started with Koolink smart cards.
            </p>
          </div>

          <div className="faq-list">
            {faqs.map((faq, idx) => (
              <div key={idx} className="faq-item">
                <button
                  type="button"
                  className="faq-question"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  aria-expanded={openFaq === idx}
                >
                  <span>{faq.q}</span>
                  <span className="faq-icon" aria-hidden="true">
                    {openFaq === idx ? '−' : '+'}
                  </span>
                </button>
                {openFaq === idx && (
                  <div className="faq-answer">
                    <p style={{ margin: 0 }}>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="home-footer">
        <div className="footer-container">
          <div className="footer-brand">
            <BrandLogo variant="footer" />
          </div>

          <div className="footer-note">
            Contactless Digital Identity &amp; Smart Networking · Addis Ababa, Ethiopia
          </div>

          <div className="footer-copy">
            © {new Date().getFullYear()} Koolink. All rights reserved.
          </div>
        </div>
      </footer>

      {/* ── Auth Modal Overlay ────────────────────────────────────── */}
      {authModalOpen && (
        <div
          className="auth-modal-backdrop"
          onClick={() => setAuthModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="auth-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <AuthPage
              onAuthenticated={(authenticatedUser) => {
                setAuthModalOpen(false)
                onAuthenticated(authenticatedUser)
              }}
              apiStatus={apiStatus}
              authProviders={authProviders}
              initialMode={authMode}
              onClose={() => setAuthModalOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
