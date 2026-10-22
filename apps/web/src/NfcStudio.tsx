import { useEffect, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import QRCode from 'qrcode'
import { NFC_CARD_TIER_PRICES_ETB, NFC_CARD_TIER_META, getTierFromQuantity, calculateTierPrice } from '@amalink/types'
import type { NfcCardTier, PortfolioBlock, PortfolioTheme } from '@amalink/types'
import { API_URL } from './config'
import { getPortfolioSubdomainUrl } from './url-helpers'
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

function getIdentity(portfolio: Portfolio) {
  const hero = portfolio.content?.blocks.find((block) => block.type === 'hero')
  const contact = portfolio.content?.blocks.find((block) => block.type === 'contact')
  return {
    name: hero?.type === 'hero' && hero.data.name.trim() ? hero.data.name.trim() : portfolio.subdomain,
    tagline: hero?.type === 'hero' && hero.data.tagline.trim() ? hero.data.tagline.trim() : 'Independent creative',
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

function toLines(value: string, limit: number) {
  const words = value.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (next.length > limit && line) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines.slice(0, 2)
}

async function createCardSvg(backgroundColor: string, textColor: string, portfolioUrl: string, portfolio: Portfolio) {
  const { name, tagline } = getIdentity(portfolio)
  const safeName = toLines(name, 26).map(escapeXml)
  const nameSvg = safeName.map((line, index) => `<text x="58" y="${280 + index * 52}" class="name">${line}</text>`).join('')
  const taglineSvg = toLines(tagline, 44).map(escapeXml).map((line, index) => `<text x="60" y="${380 + index * 26}" class="tagline">${line}</text>`).join('')
  const safeUrl = escapeXml(portfolioUrl)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="85.6mm" height="54mm" viewBox="0 0 856 540" role="img" aria-label="Koolink NFC card for ${escapeXml(name)}">
    <style>text{font-family:Arial,sans-serif;fill:${textColor}}.brand{font-size:24px;font-weight:700}.mark{font-size:24px;font-weight:800;fill:${backgroundColor}}.eyebrow{font-size:12px;font-weight:700;letter-spacing:2.5px;opacity:.7}.name{font-family:Georgia,serif;font-size:48px;font-weight:600}.tagline{font-size:20px;opacity:.82}.domain{font-size:15px;font-weight:700}.tap-wave{font-size:13px;font-weight:800;letter-spacing:1px;opacity:.85}</style>
    <rect width="856" height="540" rx="24" fill="${backgroundColor}"/>
    <rect x="24" y="24" width="808" height="492" rx="18" fill="none" stroke="${textColor}" stroke-opacity=".18"/>
    <rect x="58" y="52" width="42" height="42" rx="4" fill="${textColor}"/>
    <text x="79" y="82" text-anchor="middle" class="mark">K</text>
    <text x="116" y="82" class="brand">koolink</text>
    <text x="796" y="82" text-anchor="end" class="tap-wave">))) CONTACTLESS</text>
    <text x="60" y="215" class="eyebrow">YOUR DIGITAL IDENTITY</text>
    ${nameSvg}
    ${taglineSvg}
    <text x="60" y="493" class="domain">${escapeXml(portfolio.subdomain)}</text>
    <text x="796" y="493" text-anchor="end" class="domain">TAP TO OPEN</text>
    <title>${safeUrl}</title>
  </svg>`
}

export function NfcStudio({ portfolio, onBack, initialTier, onOrderCreated }: { portfolio: Portfolio; onBack: () => void; initialTier?: NfcCardTier; onOrderCreated: () => void }) {
  const identity = getIdentity(portfolio)
  const portfolioUrl = getPortfolioSubdomainUrl(portfolio.subdomain, portfolio.status !== 'published')
  const [backgroundColor, setBackgroundColor] = useState('#101010')
  const [textColor, setTextColor] = useState('#ffffff')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const cardStyle = {
    '--card-background': backgroundColor,
    '--card-text': textColor,
  } as CSSProperties
  const [address, setAddress] = useState<Address>({
    name: identity.name || '',
    phone: '',
    addressLine1: '',
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
  const [selectedTier, setSelectedTier] = useState<NfcCardTier>(initialTier ?? 'individual')
  const [quantity, setQuantity] = useState(1)

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

  const currentCalc = calculateTierPrice(quantity)
  const [cardSide, setCardSide] = useState<'front' | 'back'>('front')
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

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
      margin: 4,
      color: { dark: '#101010', light: '#ffffff' },
    }).then((dataUrl) => {
      if (isCurrent) setQrDataUrl(dataUrl)
    }).catch((reason: unknown) => {
      console.error('Unable to generate portfolio QR code:', reason)
    })
    return () => { isCurrent = false }
  }, [portfolioUrl])

  async function downloadTemplate() {
    const svg = await createCardSvg(backgroundColor, textColor, portfolioUrl, portfolio)
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${portfolio.subdomain}-nfc-card.svg`
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
      const response = await fetch(`${API_URL}/nfc-orders`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
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
          <p className="eyebrow">KOOLINK / CARD STUDIO</p>
          <h1>One identity.<br /><em>One tap.</em></h1>
          <p className="nfc-studio-intro">A tap-ready card, shaped around {identity.name}. Every connection measured.</p>
        </div>
        <div className="nfc-studio-brand"><BrandLogo variant="studio" /><small>NFC CARD / 85.6 × 54 MM</small></div>
      </header>

      <div className="nfc-studio-grid">
        <aside className="nfc-design-picker">
          <div className="panel-label">CARD COLORS</div>
          <div className="nfc-color-controls">
            <label className="nfc-color-control">
              <span>Background</span>
              <input aria-label="Card background color" type="color" value={backgroundColor} onChange={(event) => setBackgroundColor(event.target.value)} />
              <code>{backgroundColor.toUpperCase()}</code>
            </label>
            <label className="nfc-color-control">
              <span>Text</span>
              <input aria-label="Card text color" type="color" value={textColor} onChange={(event) => setTextColor(event.target.value)} />
              <code>{textColor.toUpperCase()}</code>
            </label>
          </div>
          <div className="nfc-data-note"><span className="nfc-note-mark">K</span><p><strong>Personalized for {portfolio.subdomain}</strong><br />The QR code opens this portfolio directly.</p></div>
        </aside>

        <section className="nfc-preview-column" aria-label="Card preview">
          <div className="nfc-preview-label">
            <span>{cardSide === 'front' ? 'FRONT / LIVE 3D PREVIEW' : 'BACK / CHIP & QR PREVIEW'}</span>
            <span>85.6 × 54 MM</span>
          </div>

          <div className="nfc-side-selector">
            <button
              type="button"
              className={`nfc-side-pill ${cardSide === 'front' ? 'active' : ''}`}
              onClick={() => setCardSide('front')}
            >
              📇 Front Side
            </button>
            <button
              type="button"
              className={`nfc-side-pill ${cardSide === 'back' ? 'active' : ''}`}
              onClick={() => setCardSide('back')}
            >
              🔄 Back Side (QR & Chip)
            </button>
          </div>

          <div className="nfc-card-wrap">
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
                <article className="nfc-card nfc-card-face front" style={cardStyle}>
                  <div className="nfc-card-brand" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="nfc-card-mark">K</span>
                      <strong>Koolink</strong>
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, opacity: 0.75 }}>
                      ))) CONTACTLESS
                    </span>
                  </div>
                  <div className="nfc-card-content">
                    <span className="nfc-card-kicker">YOUR DIGITAL IDENTITY</span>
                    <h2>{identity.name}</h2>
                    <p>{identity.tagline}</p>
                  </div>
                  <div className="nfc-card-foot">
                    <span>{portfolio.subdomain}.sewnet.et</span>
                    <b><i className="nfc-wave" /> TAP TO OPEN</b>
                  </div>
                </article>

                {/* Back Face */}
                <article className="nfc-card-face back" style={cardStyle}>
                  <div className="nfc-card-brand" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="nfc-card-mark">K</span>
                      <strong>Koolink Smart Card</strong>
                    </div>
                    <span className="nfc-card-chip-badge">
                      <span>📡</span> NTAG216 CHIP
                    </span>
                  </div>

                  <div className="nfc-card-back-grid">
                    <div className="nfc-card-back-info">
                      <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, opacity: 0.65 }}>
                        CONTACTLESS SMART TAP
                      </span>
                      <strong style={{ fontSize: 16, fontFamily: 'Georgia, serif' }}>
                        {identity.name}
                      </strong>
                      <span style={{ fontSize: 12, opacity: 0.8 }}>
                        {portfolio.subdomain}.sewnet.et
                      </span>
                      <p style={{ fontSize: 10, opacity: 0.65, margin: '6px 0 0', lineHeight: 1.4 }}>
                        Hold card near top of iPhone or center back of Android to open digital card.
                      </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      {qrDataUrl && (
                        <img
                          src={qrDataUrl}
                          alt="QR Code"
                          style={{
                            width: 110,
                            height: 110,
                            background: '#fff',
                            padding: 6,
                            borderRadius: 8,
                            display: 'block',
                          }}
                        />
                      )}
                      <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: 1 }}>CAMERA BACKUP</span>
                    </div>
                  </div>

                  <div className="nfc-card-foot">
                    <span style={{ fontSize: 9, opacity: 0.7 }}>
                      AUTHENTICATED NFC CARD · 888 BYTES
                    </span>
                    <b><i className="nfc-wave" /> TAP ANYWHERE</b>
                  </div>
                </article>
              </div>
            </div>
          </div>
          <div className="nfc-preview-actions">
            <span>Click card or use buttons above to flip front &amp; back.</span>
            <button className="secondary-button" onClick={downloadTemplate} title="Download print-ready SVG">↓ Download SVG</button>
          </div>
          <p className="nfc-export-note">SVG artwork is sized to standard card dimensions (85.6 × 54 mm). Add bleed and chip placement with your print supplier.</p>
        </section>

        <aside className="nfc-order-column">
          <div className="panel-label">REQUEST A CARD</div>
          {portfolio.status !== 'published' ? (
            <div className="nfc-publish-note"><span>01</span><h2>Publish to activate your card.</h2><p>The NFC chip links to your live portfolio. Save and publish it before requesting a physical card.</p></div>
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

              <div className="nfc-payment-guide">
                <h3>💳 Complete Payment in Ethiopia</h3>
                <p>Transfer via Telebirr or Commercial Bank of Ethiopia (CBE) using your order reference code:</p>
                <div className="nfc-payment-options">
                  <div className="nfc-pay-method">
                    <div className="nfc-pay-info">
                      <strong>Telebirr Transfer</strong>
                      <span>091 123 4567 (Koolink Ethiopia)</span>
                    </div>
                    <button
                      type="button"
                      className="nfc-copy-code-btn"
                      onClick={() => navigator.clipboard.writeText('0911234567')}
                    >
                      Copy No.
                    </button>
                  </div>

                  <div className="nfc-pay-method">
                    <div className="nfc-pay-info">
                      <strong>Commercial Bank of Ethiopia (CBE)</strong>
                      <span>1000 1234 56789 (Koolink Tech)</span>
                    </div>
                    <button
                      type="button"
                      className="nfc-copy-code-btn"
                      onClick={() => navigator.clipboard.writeText('1000123456789')}
                    >
                      Copy Acc.
                    </button>
                  </div>
                </div>

                <a
                  href={`https://wa.me/251911234567?text=${encodeURIComponent(`Hi Koolink! I placed card order ref KL-${order.id.slice(0, 8).toUpperCase()} for ${order.totalAmount} ETB (${portfolio.subdomain}). Here is my payment confirmation.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="nfc-whatsapp-confirm"
                >
                  <span>💬 Confirm via WhatsApp / Telegram</span>
                </a>
              </div>

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
              <small className="nfc-order-disclaimer">No payment is collected here. This submits a request; Koolink will confirm availability, payment, and delivery before fulfillment.</small>
            </form>
          )}
        </aside>
      </div>
    </section>
  )
}
