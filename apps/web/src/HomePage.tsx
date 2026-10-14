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
  const [openFaq, setOpenFaq] = useState<number | null>(null)

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

  const faqs = [
    {
      q: 'How does the Sewnet NFC Smart Card work?',
      a: 'The card contains an embedded contactless NTAG216 microchip. When you tap the card against any modern smartphone (iOS or Android), your custom Sewnet digital profile opens instantly in their browser. For older phones without NFC, a dynamic laser-etched QR code on the back provides an immediate fallback scan.',
    },
    {
      q: 'Does the other person need to install an app?',
      a: 'No app is required! The recipient simply taps or scans your card and your profile launches directly in their default browser (Safari, Chrome, etc.). From there, they can save your contact directly to their phone address book with a single click.',
    },
    {
      q: 'Can I edit my portfolio and contact info after the card is printed?',
      a: 'Yes, absolutely. The card links directly to your cloud-hosted Sewnet identity. You can change your phone number, social links, project portfolio, or theme colors anytime in your Sewnet dashboard, and your card will automatically reflect the newest updates instantly.',
    },
    {
      q: 'How do payment and card delivery work in Ethiopia?',
      a: 'We accept payments via Telebirr and Commercial Bank of Ethiopia (CBE). Orders within Addis Ababa are delivered by courier within 24 to 48 hours. Regional deliveries across Ethiopia are handled via EMS or regional courier hubs.',
    },
  ]

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
          <a href="#faq" className="home-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('faq') }}>
            FAQ
          </a>
        </div>

        <div className="home-nav-actions">
          <div className="nav-status-pill" title={`API is ${apiStatus}`}>
            <span className={`nav-status-dot ${apiStatus}`} />
            <span>{apiStatus === 'online' ? 'Live' : apiStatus === 'checking' ? 'Connecting…' : 'Offline'}</span>
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
      <section id="nfc-cards" className="showcase-section">
        <div className="section-header">
          <span className="section-eyebrow">PREMIUM CRAFTSMANSHIP</span>
          <h2 className="section-title">Built to make lasting impressions</h2>
          <p className="section-desc">
            Engineered with industrial-grade NTAG216 microchips and high-definition matte finishes.
          </p>
        </div>

        <div className="showcase-grid">
          <div className="showcase-card">
            <span className="showcase-icon">💳</span>
            <h4 className="showcase-title">Dual NFC &amp; Dynamic QR</h4>
            <p className="showcase-desc">
              Tap on any NFC-enabled phone or scan the high-contrast laser-etched QR code for older devices.
            </p>
          </div>

          <div className="showcase-card">
            <span className="showcase-icon">🛡️</span>
            <h4 className="showcase-title">Durable &amp; Water Resistant</h4>
            <p className="showcase-desc">
              Precision laminated with scratch-resistant coating, immune to water damage and daily pocket wear.
            </p>
          </div>

          <div className="showcase-card">
            <span className="showcase-icon">🇪🇹</span>
            <h4 className="showcase-title">Localized in Ethiopia</h4>
            <p className="showcase-desc">
              Support in Ethiopian Birr, fast courier delivery in Addis Ababa, and local CBE / Telebirr settlement.
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

      {/* ── FAQ Section ───────────────────────────────────────────── */}
      <section id="faq" className="home-faq">
        <div className="faq-container">
          <div className="section-header">
            <span className="section-eyebrow">COMMON QUESTIONS</span>
            <h2 className="section-title">Everything you need to know</h2>
            <p className="section-desc">
              Have questions about how Sewnet works? Here are answers to the most common inquiries.
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
