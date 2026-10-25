import { useEffect, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import QRCode from 'qrcode'
import {
  NFC_CARD_TIER_PRICES_ETB,
  NFC_CARD_TIER_META,
  getTierFromQuantity,
  calculateTierPrice,
  MANUAL_PAYMENT_ACCOUNTS,
} from '@amalink/types'
import type {
  NfcCardTier,
  PortfolioBlock,
  PortfolioTheme,
  UserProfile,
  PaymentMethod,
  PaymentStatus,
} from '@amalink/types'
import { API_URL } from './config'
import { getAuthToken } from './auth-client'
import { getPortfolioSubdomainUrl, getPortfolioDomainLabel } from './url-helpers'
import './NfcStudio.css'
import { BrandLogo } from './BrandLogo'

interface Portfolio {
  id: string
  subdomain: string
  status: 'draft' | 'published' | 'unpublished'
  theme: PortfolioTheme
  content: { version: number; blocks: PortfolioBlock[] } | null
}

interface Address {
  name: string
  phone: string
  addressLine1: string
  addressLine2: string
  city: string
  region: string
  postalCode: string
  countryCode: string
}

interface OrderResult {
  id: string
  status: string
  paymentStatus?: PaymentStatus
  paymentMethod?: PaymentMethod | null
  paymentReference?: string | null
  chekiUrl?: string | null
  paymentVerifiedAt?: string | null
  tier: NfcCardTier
  quantity: number
  unitPrice: number
  totalAmount: number
  currency: string
  shortUrl: string
  createdAt: string
}

const cardTiers: Array<{ id: NfcCardTier; name: string; range: string }> = [
  { id: 'individual', name: 'Individual', range: '1–4 cards' },
  { id: 'business', name: 'S&M Business', range: '5–19 cards' },
  { id: 'enterprise', name: 'Enterprise', range: '20–49 cards' },
  { id: 'corporate', name: 'Corporate', range: '50+ cards' },
]

export const CARD_PRESETS = [
  { id: 'obsidian', name: 'Matte Obsidian', bg: '#0e0e11', text: '#ffffff' },
  { id: 'slate', name: 'Titanium Slate', bg: '#1c1e22', text: '#f3f4f6' },
  { id: 'navy', name: 'Midnight Navy', bg: '#0a101d', text: '#ffffff' },
  { id: 'pearl', name: 'Pearl Minimal', bg: '#fbfaf7', text: '#141416' },
]

function getIdentity(portfolio: Portfolio) {
  const hero = portfolio.content?.blocks.find((block) => block.type === 'hero')
  const contact = portfolio.content?.blocks.find((block) => block.type === 'contact')
  return {
    name: hero?.type === 'hero' && hero.data.name.trim() ? hero.data.name.trim() : portfolio.subdomain,
    tagline: hero?.type === 'hero' && hero.data.tagline.trim() ? hero.data.tagline.trim() : 'Designation',
    email: contact?.type === 'contact' ? contact.data.email ?? '' : '',
  }
}

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (character) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;',
  })[character]!)
}

export async function createCardSvg(
  backgroundColor: string,
  textColor: string,
  _portfolioUrl: string,
  placeholders: {
    frontLogoText: string
    cardName: string
    cardDesignation: string
    qrDataUrl?: string
  }
) {
  const safeLogo = escapeXml(placeholders.frontLogoText || 'Your Logo')
  const safeName = escapeXml(placeholders.cardName || 'Your name')
  const safeDesig = escapeXml(placeholders.cardDesignation || 'Designation')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="600" viewBox="0 0 1800 600" role="img" aria-label="Koolink Luxury NFC Card Layout">
    <style>
      text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; fill: ${textColor}; }
      .side-label { font-size: 14px; font-weight: 700; letter-spacing: 2px; fill: #888; }
      .logo-text { font-size: 44px; font-weight: 500; letter-spacing: 0.5px; }
      .name-text { font-size: 34px; font-weight: 600; letter-spacing: -0.3px; }
      .desig-text { font-size: 19px; font-weight: 400; opacity: 0.78; }
    </style>

    <!-- FRONT CARD (856x540 at x=40, y=30) -->
    <g transform="translate(40, 30)">
      <rect width="856" height="540" rx="28" fill="${backgroundColor}" />
      <rect width="856" height="540" rx="28" fill="none" stroke="${textColor}" stroke-opacity="0.08" stroke-width="2" />
      <text x="428" y="285" text-anchor="middle" class="logo-text">${safeLogo}</text>
    </g>

    <!-- BACK CARD (856x540 at x=904, y=30) -->
    <g transform="translate(904, 30)">
      <rect width="856" height="540" rx="28" fill="${backgroundColor}" />
      <rect width="856" height="540" rx="28" fill="none" stroke="${textColor}" stroke-opacity="0.08" stroke-width="2" />
      
      <!-- Top-Left Contactless Wave Icon -->
      <g transform="translate(68, 64) scale(1.6)" stroke="${textColor}" stroke-width="2.2" stroke-linecap="round" fill="none">
        <path d="M4 14.5a8 8 0 0 1 12 0" />
        <path d="M6.5 17.5a4.5 4.5 0 0 1 7 0" />
        <path d="M9 20a1.5 1.5 0 0 1 2 0" />
      </g>

      <!-- Top-Right QR Code Placeholder / Image -->
      ${placeholders.qrDataUrl ? `
      <image href="${placeholders.qrDataUrl}" x="664" y="60" width="124" height="124" />
      ` : `
      <rect x="664" y="60" width="124" height="124" rx="12" fill="#fff" />
      `}

      <!-- Bottom-Left Name & Designation -->
      <text x="68" y="445" class="name-text">${safeName}</text>
      <text x="68" y="482" class="desig-text">${safeDesig}</text>
    </g>
  </svg>`
}

export function NfcStudio({
  portfolio,
  onBack,
  initialTier,
  onOrderCreated,
  user,
}: {
  portfolio: Portfolio
  onBack: () => void
  initialTier?: NfcCardTier
  onOrderCreated: () => void
  user?: UserProfile
}) {
  const identity = getIdentity(portfolio)
  const portfolioUrl = getPortfolioSubdomainUrl(portfolio.subdomain, portfolio.status !== 'published')

  // Customizable Card Placeholders
  const [frontLogoText, setFrontLogoText] = useState(user?.companyName || 'Your Logo')
  const [cardName, setCardName] = useState(user?.name || identity.name || 'Your name')
  const [cardDesignation, setCardDesignation] = useState(identity.tagline || 'Designation')

  // Card appearance
  const [backgroundColor, setBackgroundColor] = useState('#0e0e11') // Matte Obsidian from photo
  const [textColor, setTextColor] = useState('#ffffff')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [previewMode, setPreviewMode] = useState<'duo' | 'single'>('duo')
  const [cardSide, setCardSide] = useState<'front' | 'back'>('front')
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  const cardStyle = {
    '--card-background': backgroundColor,
    '--card-text': textColor,
  } as CSSProperties

  const defaultTier: NfcCardTier = user?.customerType ?? initialTier ?? 'individual'
  const defaultMin = NFC_CARD_TIER_META[defaultTier]?.min ?? 1
  const [address, setAddress] = useState<Address>({
    name: user?.name || identity.name || '',
    phone: user?.phoneNumber || '',
    addressLine1: user?.companyName ? String(user.companyName) : '',
    addressLine2: '',
    city: 'Addis Ababa',
    region: 'Addis Ababa',
    postalCode: '',
    countryCode: 'ET',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [order, setOrder] = useState<OrderResult | null>(null)
  const [copied, setCopied] = useState(false)
  const [selectedTier, setSelectedTier] = useState<NfcCardTier>(defaultTier)
  const [quantity, setQuantity] = useState(defaultMin)
  const [payMethod, setPayMethod] = useState<PaymentMethod>(
    defaultTier === 'enterprise' || defaultTier === 'corporate' ? 'cbe' : 'telebirr'
  )
  const [chekiRef, setChekiRef] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState('')
  const [verifySuccess, setVerifySuccess] = useState('')
  const [mobileStudioTab, setMobileStudioTab] = useState<'style' | 'preview' | 'checkout'>('style')

  async function handleVerifyPayment() {
    if (!order) return
    if (!chekiRef.trim()) {
      setVerifyError('Please enter your transaction reference (FT... or Telebirr TXN) or receipt URL.')
      return
    }
    setVerifying(true)
    setVerifyError('')
    setVerifySuccess('')
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_URL}/nfc-orders/${order.id}/verify-payment`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
        },
        body: JSON.stringify({
          reference: chekiRef.trim(),
          method: payMethod,
        }),
      })
      const result = await response.json()
      if (!response.ok || !result.verified) {
        throw new Error(result.message || 'Payment verification failed. Please check your reference or receipt URL.')
      }
      setOrder(result.order)
      setVerifySuccess(result.message || '✓ Payment verified via Cheki! Order moved to printing queue.')
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : 'Unable to verify payment with Cheki')
    } finally {
      setVerifying(false)
    }
  }

  function handleQuantityChange(val: number) {
    const q = Math.max(1, Math.floor(val || 1))
    setQuantity(q)
    const autoTier = getTierFromQuantity(q)
    setSelectedTier(autoTier)
  }

  function handleSelectTier(tierId: NfcCardTier) {
    setSelectedTier(tierId)
    const meta = NFC_CARD_TIER_META[tierId]
    if (quantity < meta.min || (meta.max !== null && quantity > meta.max)) {
      setQuantity(meta.min)
    }
  }

  function applyPreset(preset: typeof CARD_PRESETS[0]) {
    setBackgroundColor(preset.bg)
    setTextColor(preset.text)
  }

  const currentCalc = calculateTierPrice(quantity)

  function handleCardMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 16
    const y = -((e.clientY - rect.top) / rect.height - 0.5) * 16
    setTilt({ x, y })
  }

  function handleCardMouseLeave() {
    setTilt({ x: 0, y: 0 })
  }

  useEffect(() => {
    let isCurrent = true
    QRCode.toDataURL(portfolioUrl, {
      width: 256,
      errorCorrectionLevel: 'H',
      margin: 2,
      color: { dark: '#0e0e11', light: '#ffffff' },
    }).then((dataUrl) => {
      if (isCurrent) setQrDataUrl(dataUrl)
    }).catch((reason: unknown) => {
      console.error('Unable to generate portfolio QR code:', reason)
    })
    return () => { isCurrent = false }
  }, [portfolioUrl])

  async function downloadTemplate() {
    const svg = await createCardSvg(backgroundColor, textColor, portfolioUrl, {
      frontLogoText,
      cardName,
      cardDesignation,
      qrDataUrl,
    })
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${portfolio.subdomain}-luxury-nfc-card.svg`
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setOrder(null)
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_URL}/nfc-orders`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
        },
        body: JSON.stringify({
          portfolioId: portfolio.id,
          tier: selectedTier,
          quantity,
          ...address,
          addressLine2: address.addressLine2 || undefined,
        }),
      })
      const result = await response.json() as OrderResult & { message?: string | string[] }
      if (!response.ok) throw new Error(Array.isArray(result.message) ? result.message.join(', ') : result.message ?? 'Unable to request an NFC card')
      setOrder(result)
      onOrderCreated()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to request an NFC card')
    } finally {
      setBusy(false)
    }
  }

  async function copyShortUrl() {
    if (!order) return
    await navigator.clipboard.writeText(order.shortUrl)
    setCopied(true)
  }

  return (
    <section className="nfc-studio">
      <header className="nfc-studio-heading">
        <div>
          <button className="back-button" onClick={onBack}>← Back to editor</button>
          <p className="eyebrow">KOOLINK / EXECUTIVE NFC CARD STUDIO</p>
          <h1>Minimalist Matte.<br /><em>One Contactless Tap.</em></h1>
          <p className="nfc-studio-intro">Precision crafted card with your logo, NFC contactless chip &amp; scan backup.</p>
        </div>
        <div className="nfc-studio-brand"><BrandLogo variant="studio" /><small>NFC CARD / 85.6 × 54 MM</small></div>
      </header>

      {/* Mobile Stepper (<= 840px) */}
      <div className="nfc-mobile-stepper">
        <button
          type="button"
          className={`nfc-mobile-step-btn ${mobileStudioTab === 'style' ? 'active' : ''}`}
          onClick={() => setMobileStudioTab('style')}
        >
          🎨 1. Style Card
        </button>
        <button
          type="button"
          className={`nfc-mobile-step-btn ${mobileStudioTab === 'preview' ? 'active' : ''}`}
          onClick={() => setMobileStudioTab('preview')}
        >
          👁️ 2. Preview 3D
        </button>
        <button
          type="button"
          className={`nfc-mobile-step-btn ${mobileStudioTab === 'checkout' ? 'active' : ''}`}
          onClick={() => setMobileStudioTab('checkout')}
        >
          💳 3. Checkout
        </button>
      </div>

      <div className="nfc-studio-grid">
        {/* Left Panel: Placeholders, Text & Style Controls */}
        <aside className={`nfc-design-picker ${mobileStudioTab !== 'style' ? 'nfc-mobile-hidden' : ''}`}>
          <div className="panel-label">CARD PLACEHOLDERS &amp; TEXT</div>

          <div className="nfc-customizer-stack">
            <label className="nfc-field-label">
              <span>Front Card Logo / Brand</span>
              <input
                type="text"
                className="nfc-text-input"
                value={frontLogoText}
                onChange={(e) => setFrontLogoText(e.target.value)}
                placeholder="Your Logo"
                maxLength={40}
              />
              <small>Displays centered on the front face</small>
            </label>

            <label className="nfc-field-label">
              <span>Back Card Full Name</span>
              <input
                type="text"
                className="nfc-text-input"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="Your name"
                maxLength={40}
              />
              <small>Bottom-left of the back face</small>
            </label>

            <label className="nfc-field-label">
              <span>Back Card Designation / Role</span>
              <input
                type="text"
                className="nfc-text-input"
                value={cardDesignation}
                onChange={(e) => setCardDesignation(e.target.value)}
                placeholder="Designation"
                maxLength={50}
              />
              <small>Role, title, or company below your name</small>
            </label>
          </div>

          <div className="panel-label" style={{ marginTop: 24 }}>CARD FINISH &amp; PALETTE</div>
          <div className="nfc-preset-chips">
            {CARD_PRESETS.map((preset) => {
              const isSelected = backgroundColor.toLowerCase() === preset.bg.toLowerCase()
              return (
                <button
                  key={preset.id}
                  type="button"
                  className={`nfc-preset-chip ${isSelected ? 'active' : ''}`}
                  onClick={() => applyPreset(preset)}
                >
                  <span className="nfc-preset-swatch" style={{ background: preset.bg, border: `1px solid ${preset.id === 'pearl' ? '#ccc' : '#444'}` }} />
                  <span>{preset.name}</span>
                </button>
              )
            })}
          </div>

          <div className="nfc-color-controls" style={{ marginTop: 14 }}>
            <label className="nfc-color-control">
              <span>Background</span>
              <input aria-label="Card background color" type="color" value={backgroundColor} onChange={(event) => setBackgroundColor(event.target.value)} />
              <code>{backgroundColor.toUpperCase()}</code>
            </label>
            <label className="nfc-color-control">
              <span>Text &amp; Icons</span>
              <input aria-label="Card text color" type="color" value={textColor} onChange={(event) => setTextColor(event.target.value)} />
              <code>{textColor.toUpperCase()}</code>
            </label>
          </div>

          <div className="nfc-data-note">
            <span className="nfc-note-mark">✦</span>
            <p><strong>NFC Chip &amp; QR Linked to:</strong><br /><code>{getPortfolioDomainLabel(portfolio.subdomain)}</code></p>
          </div>
        </aside>

        {/* Center Panel: Live Card Preview (Duo View or 3D Flip) */}
        <section className={`nfc-preview-column ${mobileStudioTab !== 'preview' ? 'nfc-mobile-hidden' : ''}`} aria-label="Card preview">
          <div className="nfc-preview-label">
            <span>{previewMode === 'duo' ? 'DUO PRESENTATION VIEW (LIKE PHOTO)' : `${cardSide.toUpperCase()} / 3D INTERACTIVE VIEW`}</span>
            <span>CR80 / 85.6 × 54 MM</span>
          </div>

          {/* Mode Switcher */}
          <div className="nfc-view-mode-selector">
            <button
              type="button"
              className={`nfc-side-pill ${previewMode === 'duo' ? 'active' : ''}`}
              onClick={() => setPreviewMode('duo')}
            >
              📷 Side-by-Side (Photo Mode)
            </button>
            <button
              type="button"
              className={`nfc-side-pill ${previewMode === 'single' && cardSide === 'front' ? 'active' : ''}`}
              onClick={() => { setPreviewMode('single'); setCardSide('front'); }}
            >
              📇 Front Side
            </button>
            <button
              type="button"
              className={`nfc-side-pill ${previewMode === 'single' && cardSide === 'back' ? 'active' : ''}`}
              onClick={() => { setPreviewMode('single'); setCardSide('back'); }}
            >
              🔄 Back Side (NFC &amp; QR)
            </button>
          </div>

          <div className="nfc-card-wrap">
            {previewMode === 'duo' ? (
              /* Duo Layout: Angled Front & Back cards on luxury dark surface matching user's photo */
              <div className="nfc-duo-photo-stage">
                {/* Card 1: Front Face */}
                <div
                  className="nfc-duo-card nfc-duo-card--front"
                  style={cardStyle}
                  onClick={() => { setPreviewMode('single'); setCardSide('front'); }}
                  title="Click to inspect Front side"
                >
                  <div className="nfc-duo-card-tag">FRONT</div>
                  <div className="nfc-minimal-front-center">
                    <span className="nfc-minimal-logo-text">{frontLogoText || 'Your Logo'}</span>
                  </div>
                </div>

                {/* Card 2: Back Face */}
                <div
                  className="nfc-duo-card nfc-duo-card--back"
                  style={cardStyle}
                  onClick={() => { setPreviewMode('single'); setCardSide('back'); }}
                  title="Click to inspect Back side"
                >
                  <div className="nfc-duo-card-tag">BACK</div>
                  
                  {/* Top: Wave left, QR right */}
                  <div className="nfc-minimal-back-top">
                    <div className="nfc-contactless-wave-wrap" title="NFC Contactless Tap Area">
                      <ContactlessWaveIcon />
                    </div>

                    <div className="nfc-minimal-qr-wrap">
                      {qrDataUrl && (
                        <img
                          src={qrDataUrl}
                          alt="QR Code"
                          className="nfc-minimal-qr-img"
                        />
                      )}
                    </div>
                  </div>

                  {/* Bottom: Name & Designation */}
                  <div className="nfc-minimal-back-bottom">
                    <h3 className="nfc-minimal-name">{cardName || 'Your name'}</h3>
                    <p className="nfc-minimal-designation">{cardDesignation || 'Designation'}</p>
                  </div>
                </div>
              </div>
            ) : (
              /* Single 3D Flip Card */
              <div
                className="nfc-perspective-stage"
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
                onClick={() => setCardSide((s) => (s === 'front' ? 'back' : 'front'))}
                title="Click card to flip between front and back"
              >
                <div
                  className="nfc-card-flipper"
                  style={{
                    transform: `rotateX(${tilt.y}deg) rotateY(${tilt.x + (cardSide === 'back' ? 180 : 0)}deg)`,
                  }}
                >
                  {/* Front Face */}
                  <article className="nfc-card-face front nfc-minimal-card" style={cardStyle}>
                    <div className="nfc-minimal-front-center">
                      <span className="nfc-minimal-logo-text">{frontLogoText || 'Your Logo'}</span>
                    </div>
                  </article>

                  {/* Back Face */}
                  <article className="nfc-card-face back nfc-minimal-card" style={cardStyle}>
                    <div className="nfc-minimal-back-top">
                      <div className="nfc-contactless-wave-wrap" title="NFC Contactless Tap Area">
                        <ContactlessWaveIcon />
                      </div>

                      <div className="nfc-minimal-qr-wrap">
                        {qrDataUrl && (
                          <img
                            src={qrDataUrl}
                            alt="QR Code"
                            className="nfc-minimal-qr-img"
                          />
                        )}
                      </div>
                    </div>

                    <div className="nfc-minimal-back-bottom">
                      <h3 className="nfc-minimal-name">{cardName || 'Your name'}</h3>
                      <p className="nfc-minimal-designation">{cardDesignation || 'Designation'}</p>
                    </div>
                  </article>
                </div>
              </div>
            )}
          </div>

          <div className="nfc-preview-actions">
            <span>
              {previewMode === 'duo'
                ? 'Showing front & back matching reference photo. Click either card to flip.'
                : 'Click card to flip between front and back sides.'}
            </span>
            <button className="secondary-button" onClick={downloadTemplate} title="Download print-ready vector SVG template">
              ↓ Download Print SVG
            </button>
          </div>
          <p className="nfc-export-note">
            SVG artwork is generated for standard CR80 contactless cards (85.6 × 54 mm). The QR code redirects directly to your live portfolio.
          </p>
        </section>

        {/* Right Panel: Order Form & Ethiopian Payment Instructions */}
        <aside className={`nfc-order-column ${mobileStudioTab !== 'checkout' ? 'nfc-mobile-hidden' : ''}`}>
          <div className="panel-label">REQUEST PHYSICAL CARDS</div>
          {portfolio.status !== 'published' ? (
            <div className="nfc-publish-note">
              <span>01</span>
              <h2>Publish to activate your card.</h2>
              <p>The NFC chip links to your live portfolio. Save and publish it before requesting a physical card.</p>
            </div>
          ) : order ? (
            <div className="nfc-order-success" role="status">
              <span className="nfc-order-check">✓</span>
              <p className="eyebrow">ORDER REQUEST RECEIVED</p>
              <h2>Your card request is registered!</h2>
              <p>
                {order.quantity} {order.quantity === 1 ? 'card' : 'cards'} · {order.unitPrice.toLocaleString()} ETB each
              </p>
              <strong style={{ fontSize: 20, color: 'var(--green)' }}>
                {order.totalAmount.toLocaleString()} {order.currency} Total
              </strong>
              <p>
                Order Ref: <strong>KL-{order.id.slice(0, 8).toUpperCase()}</strong>
              </p>

              {order.paymentStatus === 'paid' ? (
                /* Verified State Banner */
                <div className="nfc-verified-banner" role="status">
                  <div className="nfc-verified-badge">
                    <span>✓</span> Payment Verified via Cheki!
                  </div>
                  <div className="nfc-verified-details">
                    <div>Order Status: <strong>Moved to Manufacturing &amp; Printing Queue</strong></div>
                    <div>Payment Method: <strong>{(order.paymentMethod || payMethod).toUpperCase()}</strong></div>
                    {order.paymentReference && <div>Transaction Ref: <strong>{order.paymentReference}</strong></div>}
                    <div>Amount Paid: <strong>{order.totalAmount.toLocaleString()} ETB</strong></div>
                    {order.paymentVerifiedAt && <div>Verified At: <strong>{new Date(order.paymentVerifiedAt).toLocaleDateString()}</strong></div>}
                    <div style={{ marginTop: 6, fontSize: 11, color: '#15803d' }}>
                      🚀 Your card request has been verified and prioritized for high-precision UV printing and chip encoding.
                    </div>
                  </div>
                </div>
              ) : (
                /* Unpaid State: Manual Payment Guide & Cheki Verification */
                <div className="nfc-payment-guide">
                  <div className="nfc-pay-method-tabs">
                    <button
                      type="button"
                      className={`nfc-pay-tab-btn ${payMethod === 'telebirr' ? 'active' : ''}`}
                      onClick={() => setPayMethod('telebirr')}
                    >
                      <span>📱 Telebirr ({MANUAL_PAYMENT_ACCOUNTS.telebirr.displayPhone})</span>
                    </button>
                    <button
                      type="button"
                      className={`nfc-pay-tab-btn ${payMethod === 'cbe' ? 'active' : ''}`}
                      onClick={() => setPayMethod('cbe')}
                    >
                      <span>🏛️ CBE ንግድ ባንክ ({MANUAL_PAYMENT_ACCOUNTS.cbe.accountNumber})</span>
                    </button>
                  </div>

                  {payMethod === 'telebirr' ? (
                    <div className="nfc-single-payment-details">
                      <div className="nfc-pay-field">
                        <span>Account Holder:</span>
                        <strong>{MANUAL_PAYMENT_ACCOUNTS.accountHolder}</strong>
                      </div>
                      <div className="nfc-pay-field">
                        <span>Telebirr Recipient:</span>
                        <div className="nfc-copy-inline">
                          <strong>{MANUAL_PAYMENT_ACCOUNTS.telebirr.displayPhone}</strong>
                          <button type="button" className="nfc-mini-copy-btn" onClick={() => navigator.clipboard.writeText(MANUAL_PAYMENT_ACCOUNTS.telebirr.rawPhone)}>
                            Copy No.
                          </button>
                        </div>
                      </div>
                      <div className="nfc-pay-field">
                        <span>Total Amount:</span>
                        <div className="nfc-copy-inline">
                          <strong className="nfc-highlight-price">{order.totalAmount.toLocaleString()} ETB</strong>
                          <button type="button" className="nfc-mini-copy-btn" onClick={() => navigator.clipboard.writeText(String(order.totalAmount))}>
                            Copy
                          </button>
                        </div>
                      </div>
                      <div className="nfc-pay-field">
                        <span>Order Reference:</span>
                        <div className="nfc-copy-inline">
                          <code>KL-{order.id.slice(0, 8).toUpperCase()}</code>
                          <button type="button" className="nfc-mini-copy-btn" onClick={() => navigator.clipboard.writeText(`KL-${order.id.slice(0, 8).toUpperCase()}`)}>
                            Copy Ref
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="nfc-single-payment-details">
                      <div className="nfc-pay-field">
                        <span>Bank:</span>
                        <strong>{MANUAL_PAYMENT_ACCOUNTS.cbe.bankName}</strong>
                      </div>
                      <div className="nfc-pay-field">
                        <span>Account Holder:</span>
                        <strong>{MANUAL_PAYMENT_ACCOUNTS.accountHolder}</strong>
                      </div>
                      <div className="nfc-pay-field">
                        <span>Account Number:</span>
                        <div className="nfc-copy-inline">
                          <strong>{MANUAL_PAYMENT_ACCOUNTS.cbe.accountNumber}</strong>
                          <button type="button" className="nfc-mini-copy-btn" onClick={() => navigator.clipboard.writeText(MANUAL_PAYMENT_ACCOUNTS.cbe.accountNumber)}>
                            Copy
                          </button>
                        </div>
                      </div>
                      <div className="nfc-pay-field">
                        <span>Total Amount:</span>
                        <div className="nfc-copy-inline">
                          <strong className="nfc-highlight-price">{order.totalAmount.toLocaleString()} ETB</strong>
                          <button type="button" className="nfc-mini-copy-btn" onClick={() => navigator.clipboard.writeText(String(order.totalAmount))}>
                            Copy
                          </button>
                        </div>
                      </div>
                      <div className="nfc-pay-field">
                        <span>Transfer Reference:</span>
                        <div className="nfc-copy-inline">
                          <code>KL-{order.id.slice(0, 8).toUpperCase()}</code>
                          <button type="button" className="nfc-mini-copy-btn" onClick={() => navigator.clipboard.writeText(`KL-${order.id.slice(0, 8).toUpperCase()}`)}>
                            Copy Ref
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Cheki Automated Verification Form */}
                  <div className="nfc-cheki-card">
                    <div className="nfc-cheki-header">
                      <div className="nfc-cheki-title">
                        <span className="cheki-logo-badge">cheki</span>
                        <div>
                          <h4>Instant Payment Verification</h4>
                        </div>
                      </div>
                      <span className="nfc-cheki-badge-instant">Automated via Cheki</span>
                    </div>
                    <p>
                      Transfer via {payMethod === 'telebirr' ? `Telebirr (${MANUAL_PAYMENT_ACCOUNTS.telebirr.displayPhone})` : `CBE (${MANUAL_PAYMENT_ACCOUNTS.cbe.accountNumber})`} to <strong>{MANUAL_PAYMENT_ACCOUNTS.accountHolder}</strong>, then paste your Transaction Ref ID (e.g. FT... or Telebirr TXN) or receipt URL below to verify instantly.
                    </p>
                    <div className="nfc-cheki-form">
                      <div className="nfc-cheki-input-wrap">
                        <input
                          type="text"
                          className="nfc-cheki-input"
                          placeholder={payMethod === 'cbe' ? 'Enter CBE FT ref (e.g. FT26...) or receipt URL' : 'Enter Telebirr transaction ref ID or URL'}
                          value={chekiRef}
                          onChange={(e) => {
                            setChekiRef(e.target.value)
                            if (verifyError) setVerifyError('')
                          }}
                        />
                        <button
                          type="button"
                          className="nfc-cheki-submit-btn"
                          disabled={verifying || !chekiRef.trim()}
                          onClick={handleVerifyPayment}
                        >
                          {verifying ? 'Verifying...' : 'Verify with Cheki'}
                        </button>
                      </div>
                      {verifyError && (
                        <div className="nfc-cheki-alert-error" role="alert">
                          ⚠️ {verifyError}
                        </div>
                      )}
                      {verifySuccess && (
                        <div className="nfc-cheki-alert-success" role="status">
                          {verifySuccess}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Fallback WhatsApp / Telegram Confirmation */}
                  <div style={{ marginTop: 10 }}>
                    <a
                      href={`https://wa.me/${MANUAL_PAYMENT_ACCOUNTS.telebirr.rawPhone}?text=${encodeURIComponent(
                        `Hi Koolink! I paid for order ref KL-${order.id.slice(0, 8).toUpperCase()} to ${MANUAL_PAYMENT_ACCOUNTS.accountHolder} via ${payMethod.toUpperCase()} (${order.totalAmount} ETB).${chekiRef ? ` My reference ID is ${chekiRef}.` : ' Here is my payment receipt screenshot.'}`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="nfc-whatsapp-confirm"
                    >
                      <span>💬 Send Receipt via WhatsApp ({MANUAL_PAYMENT_ACCOUNTS.telebirr.phone})</span>
                    </a>
                  </div>
                </div>
              )}

              <div style={{ width: '100%', marginTop: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                  NFC TAP REDIRECT SHORTLINK:
                </span>
                <div className="nfc-short-link">{order.shortUrl}</div>
              </div>

              <div style={{ display: 'flex', gap: 8, width: '100%', marginTop: 4 }}>
                <button className="secondary-button" style={{ flex: 1 }} onClick={copyShortUrl}>
                  {copied ? 'Copied!' : 'Copy tap link'}
                </button>
                <button className="text-button" onClick={() => setOrder(null)}>
                  New request
                </button>
              </div>
            </div>
          ) : (
            <form className="nfc-order-form" onSubmit={submitOrder}>
              {user?.customerType && (
                <div className="nfc-account-plan-badge">
                  <div className="nfc-account-plan-badge-left">
                    <strong>{NFC_CARD_TIER_META[user.customerType].name} Account Active</strong>
                    <span>{user.companyName ? `${user.companyName} · ` : ''}{NFC_CARD_TIER_META[user.customerType].priceETB.toLocaleString()} ETB/card tier rate</span>
                  </div>
                  <span className="nfc-account-plan-badge-tag">{user.customerType.toUpperCase()}</span>
                </div>
              )}
              <p className="nfc-order-copy">Choose your card tier and delivery address in Ethiopia:</p>
              <div style={{ display: 'grid', gap: 6, margin: '2px 0 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink)' }}>CARD TIER &amp; PRICING PACKAGES</span>
                  <span style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 600 }}>Tier updates automatically</span>
                </div>
                <div className="nfc-tier-selector-grid">
                  {cardTiers.map((tier) => {
                    const isSelected = selectedTier === tier.id
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => handleSelectTier(tier.id)}
                        className={`nfc-tier-choice-btn ${isSelected ? 'active' : ''}`}
                      >
                        <strong className="nfc-tier-choice-name">{tier.name}</strong>
                        <span className="nfc-tier-choice-range">{tier.range}</span>
                        <span className="nfc-tier-choice-price">{NFC_CARD_TIER_PRICES_ETB[tier.id].toLocaleString()} ETB <small>/card</small></span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <label>
                Quantity (Number of cards)
                <input
                  type="number"
                  min={1}
                  required
                  value={quantity}
                  onChange={(event) => handleQuantityChange(Number(event.target.value))}
                  placeholder="Enter number of cards"
                />
              </label>

              {/* Dynamic Price Calculation Summary */}
              <div className="nfc-price-summary-box">
                <div className="nfc-price-summary-row">
                  <span>Cards to order:</span>
                  <strong>{quantity} {quantity === 1 ? 'card' : 'cards'}</strong>
                </div>
                <div className="nfc-price-summary-row">
                  <span>Selected Package:</span>
                  <span className="nfc-tier-pill">{currentCalc.meta.name} ({currentCalc.meta.rangeLabel})</span>
                </div>
                <div className="nfc-price-summary-row">
                  <span>Unit Price:</span>
                  <strong>{currentCalc.unitPrice.toLocaleString()} ETB / card</strong>
                </div>
                <div className="nfc-price-summary-total">
                  <span>Total Calculated Price:</span>
                  <span className="nfc-total-amount">{currentCalc.totalAmount.toLocaleString()} ETB</span>
                </div>
              </div>
              <label>Recipient name<input required maxLength={100} autoComplete="name" value={address.name} onChange={(event) => setAddress({ ...address, name: event.target.value })} placeholder="Full name of card owner" /></label>
              <label>Delivery phone<input required type="tel" maxLength={32} autoComplete="tel" value={address.phone} onChange={(event) => setAddress({ ...address, phone: event.target.value })} placeholder="+251 9..." /></label>
              <label>Delivery address<input required maxLength={150} autoComplete="address-line1" value={address.addressLine1} onChange={(event) => setAddress({ ...address, addressLine1: event.target.value })} placeholder="Subcity, Woreda, Building or Street" /></label>
              <label>Office / Apartment / Floor <small>OPTIONAL</small><input maxLength={150} autoComplete="address-line2" value={address.addressLine2} onChange={(event) => setAddress({ ...address, addressLine2: event.target.value })} placeholder="Suite, floor, or room number" /></label>
              <div className="nfc-address-row"><label>City<input required maxLength={100} autoComplete="address-level2" value={address.city} onChange={(event) => setAddress({ ...address, city: event.target.value })} placeholder="Addis Ababa" /></label><label>Region / State<input required maxLength={100} autoComplete="address-level1" value={address.region} onChange={(event) => setAddress({ ...address, region: event.target.value })} placeholder="Addis Ababa" /></label></div>
              <div className="nfc-address-row"><label>Postal code <small>OPTIONAL</small><input maxLength={24} autoComplete="postal-code" value={address.postalCode} onChange={(event) => setAddress({ ...address, postalCode: event.target.value })} /></label><label>Country code<input required minLength={2} maxLength={2} pattern="[A-Za-z]{2}" autoComplete="country" value={address.countryCode} onChange={(event) => setAddress({ ...address, countryCode: event.target.value.toUpperCase() })} placeholder="ET" /></label></div>
              {error && <p className="notice error-notice" role="alert">{error}</p>}
              <button className="primary-button" disabled={busy}>
                {busy
                  ? 'Requesting...'
                  : `Submit Order Request — ${currentCalc.totalAmount.toLocaleString()} ETB`}
              </button>
              {selectedTier === 'enterprise' || selectedTier === 'corporate' ? (
                <div className="nfc-dedicated-method-preview corporate">
                  <span className="nfc-method-icon">🏛️</span>
                  <div>
                    <strong>Payment Preference: CBE Wire (1000300153608 — Robba Bayisa)</strong>
                    <p>Commercial Bank of Ethiopia transfer with automated Cheki receipt verification</p>
                  </div>
                </div>
              ) : (
                <div className="nfc-dedicated-method-preview telebirr">
                  <span className="nfc-method-icon">📱</span>
                  <div>
                    <strong>Payment Preference: Instant Telebirr Transfer (0978 447 307 — Robba Bayisa)</strong>
                    <p>Instant mobile transfer to Robba Bayisa with automated Cheki verification</p>
                  </div>
                </div>
              )}
              <small className="nfc-order-disclaimer">No payment is collected upfront. This registers your card order request; Koolink will verify your transfer and coordinate dispatch.</small>
            </form>
          )}
        </aside>
      </div>
    </section>
  )
}

function ContactlessWaveIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 14.5a8 8 0 0 1 12 0" />
      <path d="M6.5 17.5a4.5 4.5 0 0 1 7 0" />
      <path d="M9 20a1.5 1.5 0 0 1 2 0" />
    </svg>
  )
}
