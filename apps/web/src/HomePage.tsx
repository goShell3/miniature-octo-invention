import { useState } from 'react'
import { AuthPage } from './AuthPage'
import './HomePage.css'

interface User {
  id: string
  email: string
}

interface HomePageProps {
  onAuthenticated: (user: User) => void
  apiStatus: 'checking' | 'online' | 'offline'
  authProviders: { google: boolean; facebook: boolean }
  user?: User | null
  onOpenApp?: () => void
}

export function HomePage({
  onAuthenticated,
  apiStatus,
  authProviders,
  user,
  onOpenApp,
}: HomePageProps) {
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup')
  const [tapCount, setTapCount] = useState(148)
  const [simFeedback, setSimFeedback] = useState<string | null>(null)

  function openAuth(mode: 'login' | 'signup') {
    if (user && onOpenApp) {
      onOpenApp()
      return
    }
    setAuthMode(mode)
    setAuthModalOpen(true)
  }

  function handleSimulateTap() {
    setTapCount((prev) => prev + 1)
    setSimFeedback('Card tapped! Profile loaded.')
    setTimeout(() => {
      setSimFeedback(null)
    }, 2200)
  }

  function scrollToSection(id: string) {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="home-shell">
      {/* ── Navigation Bar ────────────────────────────────────────── */}
      <nav className="home-nav" aria-label="Main Navigation">
        <a href="#" className="home-nav-brand">
          <span className="brand-badge">S</span>
          <span>sewnet</span>
        </a>

        <div className="home-nav-links">
          <a href="#features" className="home-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('features') }}>
            Features
          </a>
          <a href="#nfc-cards" className="home-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('nfc-cards') }}>
            NFC Cards
          </a>
          <a href="#pricing" className="home-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('pricing') }}>
            Pricing
          </a>
          <a href="#about" className="home-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('about') }}>
            About
          </a>
        </div>

        <div className="home-nav-actions">
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 700,
              color: apiStatus === 'online' ? '#e06b24' : '#9c4b3d',
              marginRight: 10,
            }}
            title={`API is ${apiStatus}`}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: apiStatus === 'online' ? '#e06b24' : '#c95b46',
                display: 'inline-block',
              }}
            />
            {apiStatus === 'online' ? 'Live' : 'Offline'}
          </span>

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
            <span className="hero-eyebrow">DIGITAL IDENTITY &amp; NETWORKING PLATFORM</span>
            <h1 className="hero-headline">
              <span>One identity.</span>
              <span>One tap.</span>
              <span>Every connection measured.</span>
            </h1>
            <p className="hero-subtitle">
              Step into the future of professional networking. Contactless smart NFC business
              cards integrated with dynamic digital portfolios and real-time interaction metrics.
            </p>



            <div className="hero-ctas">
              <button
                className="btn-hero-order"
                onClick={() => scrollToSection('pricing')}
              >
                Order NFC Card — From 1,999 ETB
              </button>
              <button
                className="btn-hero-secondary"
                onClick={() => openAuth('signup')}
              >
                {user ? 'Open Workspace' : 'Create Free Portfolio'}
              </button>
            </div>
          </div>

          <div className="hero-visual">
            <div className="mockup-card-wrapper" role="img" aria-label="Sewnet NFC Smart Card mockup">
              <div className="mockup-card-sheen" />
              <div className="mockup-card-top">
                <div className="mockup-brand">
                  <span className="mockup-brand-mark">S</span>
                  <span>sewnet</span>
                </div>
                <div className="mockup-nfc-icon">
                  <span className="mockup-wave" />
                  <span>CONTACTLESS</span>
                </div>
              </div>

              <div className="mockup-card-body">
                <div className="mockup-kicker">DIGITAL IDENTITY</div>
                <div className="mockup-name">Roben Bayisa</div>
                <div className="mockup-title">Founder &amp; Technology Strategist</div>
              </div>

              <div className="mockup-card-bottom">
                <span className="mockup-domain">sewnet.et/roben</span>
                <span className="mockup-tap-tag">NFC // 2.4GHz</span>
              </div>
            </div>

            <div className="hero-tap-simulator">
              <button className="btn-tap-sim" onClick={handleSimulateTap}>
                Simulate Tap
              </button>
              <span className="sim-counter">
                {simFeedback ? simFeedback : `${tapCount} card interactions recorded`}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Features Section ─────────────────────────────────────── */}
      <section id="features" className="home-features">
        <div className="section-header">
          <span className="section-eyebrow">WHY SEWNET</span>
          <h2 className="section-title">One card. Endless possibilities.</h2>
          <p className="section-desc">
            No more outdated paper business cards. Keep your personal brand, projects,
            and contact details constantly synchronized with the people you meet.
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-box">
            <div className="feature-icon-wrap">⚡</div>
            <h3>Instant Contactless Sharing</h3>
            <p>
              Hold your card near any modern iPhone or Android device. Your complete profile
              opens instantly in their browser with no app installation required.
            </p>
          </div>

          <div className="feature-box">
            <div className="feature-icon-wrap">🌐</div>
            <h3>Dynamic Digital Portfolio</h3>
            <p>
              Changed your phone number or updated your work? Edit your profile anytime from
              your Sewnet dashboard—your card always links to the freshest content.
            </p>
          </div>

          <div className="feature-box">
            <div className="feature-icon-wrap">📊</div>
            <h3>Every Connection Measured</h3>
            <p>
              Quantify your networking impact. Monitor card tap counts, portfolio visits,
              and vCard downloads in real time with built-in analytics.
            </p>
          </div>
        </div>
      </section>

      {/* ── NFC Card Showcase Section ────────────────────────────── */}
      <section id="nfc-cards" style={{ padding: '40px 5vw 80px', maxWidth: 1240, margin: '0 auto' }}>
        <div className="section-header">
          <span className="section-eyebrow">PREMIUM CRAFTSMANSHIP</span>
          <h2 className="section-title">Built to make lasting impressions</h2>
          <p className="section-desc">
            Engineered with industrial-grade NTAG216 microchips and high-definition matte finishes.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          <div style={{ background: '#fff', border: '1px solid var(--sewnet-line)', borderRadius: 8, padding: 28 }}>
            <div style={{ fontSize: 24, marginBottom: 12 }}>💳</div>
            <h4 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>Dual NFC &amp; Dynamic QR</h4>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--sewnet-muted)', lineHeight: 1.55 }}>
              Tap on any NFC-enabled phone or scan the high-contrast laser-etched QR code for older devices.
            </p>
          </div>

          <div style={{ background: '#fff', border: '1px solid var(--sewnet-line)', borderRadius: 8, padding: 28 }}>
            <div style={{ fontSize: 24, marginBottom: 12 }}>🛡️</div>
            <h4 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>Durable &amp; Water Resistant</h4>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--sewnet-muted)', lineHeight: 1.55 }}>
              Precision laminated with scratch-resistant coating, immune to water damage and daily pocket wear.
            </p>
          </div>

          <div style={{ background: '#fff', border: '1px solid var(--sewnet-line)', borderRadius: 8, padding: 28 }}>
            <div style={{ fontSize: 24, marginBottom: 12 }}>🇪🇹</div>
            <h4 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>Localized in Ethiopia</h4>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--sewnet-muted)', lineHeight: 1.55 }}>
              Support in Ethiopian Birr, fast delivery across Addis Ababa, and local customer assistance.
            </p>
          </div>
        </div>
      </section>

      {/* ── Pricing Section (Card Order Purchase: 1,999 - 2,999 ETB) ── */}
      <section id="pricing" className="home-pricing">
        <div className="pricing-container">
          <div className="section-header">
            <span className="section-eyebrow">CARD ORDER PURCHASE</span>
            <h2 className="section-title">Transparent pricing for every professional</h2>
            <p className="section-desc">
              Get your custom physical Sewnet NFC card delivered to you. One-time hardware purchase,
              unlimited networking, and lifelong profile hosting.
            </p>
          </div>

          <div className="pricing-grid">
            {/* Tier 1: Individual */}
            <div className="pricing-card">
              <div>
                <h3 className="card-tier-name">Individual</h3>
                <p className="card-tier-target">For one person</p>

                <div className="card-price-wrap">
                  <span className="card-price-amount">2,999</span>
                  <span className="card-price-currency">ETB</span>
                </div>
                <span className="card-price-period">per card</span>

                <div className="pricing-divider" />

                <ul className="pricing-features-list">
                  <li>
                    <span className="check-icon">✓</span>
                    <span>Tap-to-share card</span>
                  </li>
                  <li>
                    <span className="check-icon">✓</span>
                    <span>QR code profile</span>
                  </li>
                  <li>
                    <span className="check-icon">✓</span>
                    <span>Edit any time</span>
                  </li>
                </ul>
              </div>

              <button
                className="btn-pricing-action secondary"
                onClick={() => openAuth('signup')}
              >
                Choose Individual
              </button>
            </div>

            {/* Tier 2: S&M Business */}
            <div className="pricing-card">
              <div>
                <h3 className="card-tier-name">S&amp;M Business</h3>
                <p className="card-tier-target">For small and medium teams</p>

                <div className="card-price-wrap">
                  <span className="card-price-amount">2,800</span>
                  <span className="card-price-currency">ETB</span>
                </div>
                <span className="card-price-period">per card</span>

                <div className="pricing-divider" />

                <ul className="pricing-features-list">
                  <li>
                    <span className="check-icon">✓</span>
                    <span>Tap-to-share card</span>
                  </li>
                  <li>
                    <span className="check-icon">✓</span>
                    <span>QR code profile</span>
                  </li>
                  <li>
                    <span className="check-icon">✓</span>
                    <span>Edit any time</span>
                  </li>
                </ul>
              </div>

              <button
                className="btn-pricing-action secondary"
                onClick={() => openAuth('signup')}
              >
                Choose S&amp;M
              </button>
            </div>

            {/* Tier 3: Enterprise */}
            <div className="pricing-card">
              <div>
                <h3 className="card-tier-name">Enterprise</h3>
                <p className="card-tier-target">For large teams and events</p>

                <div className="card-price-wrap">
                  <span className="card-price-amount">2,500</span>
                  <span className="card-price-currency">ETB</span>
                </div>
                <span className="card-price-period">per card</span>

                <div className="pricing-divider" />

                <ul className="pricing-features-list">
                  <li>
                    <span className="check-icon">✓</span>
                    <span>Tap-to-share card</span>
                  </li>
                  <li>
                    <span className="check-icon">✓</span>
                    <span>QR code profile</span>
                  </li>
                  <li>
                    <span className="check-icon">✓</span>
                    <span>Edit any time</span>
                  </li>
                </ul>
              </div>

              <button
                className="btn-pricing-action secondary"
                onClick={() => openAuth('signup')}
              >
                Choose Enterprise
              </button>
            </div>

            {/* Tier 4: Corporate (Lowest per card) */}
            <div className="pricing-card featured">
              <span className="pricing-badge">Lowest per card</span>
              <div>
                <h3 className="card-tier-name">Corporate</h3>
                <p className="card-tier-target">For company-wide rollout</p>

                <div className="card-price-wrap">
                  <span className="card-price-amount">1,999</span>
                  <span className="card-price-currency">ETB</span>
                </div>
                <span className="card-price-period">per card</span>

                <div className="pricing-divider" />

                <ul className="pricing-features-list">
                  <li>
                    <span className="check-icon">✓</span>
                    <span>Tap-to-share card</span>
                  </li>
                  <li>
                    <span className="check-icon">✓</span>
                    <span>QR code profile</span>
                  </li>
                  <li>
                    <span className="check-icon">✓</span>
                    <span>Edit any time</span>
                  </li>
                </ul>
              </div>

              <button
                className="btn-pricing-action primary"
                onClick={() => openAuth('signup')}
              >
                Choose Corporate
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Assurance / Guarantees Strip ─────────────────────────── */}
      <section id="about" className="home-assurance">
        <div className="assurance-grid">
          <div className="assurance-item">
            <h4>No App Needed</h4>
            <p>Compatible out of the box with over 95% of modern iOS and Android smartphones.</p>
          </div>
          <div className="assurance-item">
            <h4>Zero Recurring Fees</h4>
            <p>No monthly subscription fees to keep your standard card and portfolio working.</p>
          </div>
          <div className="assurance-item">
            <h4>Delivered Locally</h4>
            <p>Prompt delivery across Addis Ababa and major regions in Ethiopia.</p>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="home-footer">
        <div className="footer-container">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="brand-badge" style={{ width: 28, height: 28, fontSize: 15 }}>S</span>
            <span style={{ fontWeight: 800, fontSize: 16 }}>sewnet</span>
          </div>

          <div className="footer-copy">
            Presented by <strong>Roben Bayisa</strong> · Digital Identity &amp; Networking Platform
          </div>

          <div style={{ fontSize: 12, color: 'var(--sewnet-muted)' }}>
            © {new Date().getFullYear()} Sewnet. All rights reserved.
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
