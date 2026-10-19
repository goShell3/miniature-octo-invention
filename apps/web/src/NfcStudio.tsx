import { useEffect, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import QRCode from 'qrcode'
import { NFC_CARD_TIER_PRICES_ETB } from '@amalink/types'
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

const cardTiers: Array<{ id: NfcCardTier; name: string }> = [
  { id: 'individual', name: 'Individual' },
  { id: 'business', name: 'S&M Business' },
  { id: 'enterprise', name: 'Enterprise' },
  { id: 'corporate', name: 'Corporate' },
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
  const safeName = toLines(name, 21).map(escapeXml)
  const nameSvg = safeName.map((line, index) => `<text x="58" y="${348 + index * 48}" class="name">${line}</text>`).join('')
  const taglineSvg = toLines(tagline, 34).map(escapeXml).map((line, index) => `<text x="60" y="${438 + index * 24}" class="tagline">${line}</text>`).join('')
  const qrSvg = await QRCode.toString(portfolioUrl, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 4,
    color: { dark: '#101010', light: '#ffffff' },
  })
  const qrViewBox = qrSvg.match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 100 100'
  const qrContents = qrSvg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
  const embeddedQr = `<svg x="632" y="228" width="168" height="168" viewBox="${qrViewBox}" shape-rendering="crispEdges">${qrContents}</svg>`
  const safeUrl = escapeXml(portfolioUrl)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="85.6mm" height="54mm" viewBox="0 0 856 540" role="img" aria-label="Koolink NFC card for ${escapeXml(name)}">
    <style>text{font-family:Arial,sans-serif;fill:${textColor}}.brand{font-size:24px;font-weight:700}.mark{font-size:24px;font-weight:800;fill:${backgroundColor}}.eyebrow{font-size:11px;font-weight:700;letter-spacing:2px;opacity:.68}.name{font-family:Georgia,serif;font-size:46px}.tagline{font-size:17px;opacity:.78}.domain{font-size:14px;font-weight:700}.qr-label{font-size:10px;font-weight:700;letter-spacing:1px}</style>
    <rect width="856" height="540" rx="24" fill="${backgroundColor}"/>
    <rect x="24" y="24" width="808" height="492" rx="18" fill="none" stroke="${textColor}" stroke-opacity=".18"/>
    <rect x="58" y="52" width="42" height="42" rx="4" fill="${textColor}"/>
    <text x="79" y="82" text-anchor="middle" class="mark">K</text>
    <text x="116" y="82" class="brand">koolink</text>
    <text x="60" y="292" class="eyebrow">YOUR DIGITAL IDENTITY</text>
    ${nameSvg}
    ${taglineSvg}
    <text x="60" y="493" class="domain">${escapeXml(portfolio.subdomain)}</text>
    <rect x="626" y="222" width="180" height="180" rx="5" fill="#ffffff"/>
    ${embeddedQr}
    <text x="716" y="426" text-anchor="middle" class="qr-label">SCAN PORTFOLIO</text>
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
          <div className="nfc-preview-label"><span>FRONT / LIVE PREVIEW</span><span>85.6 × 54 MM</span></div>
          <div className="nfc-card-wrap">
            <article className="nfc-card" style={cardStyle}>
              <div className="nfc-card-brand"><span className="nfc-card-mark">K</span><strong>Koolink</strong></div>
              <div className="nfc-card-content">
                <span className="nfc-card-kicker">YOUR DIGITAL IDENTITY</span>
                <h2>{identity.name}</h2>
                <p>{identity.tagline}</p>
              </div>
              <div className="nfc-card-qr">
                {qrDataUrl && <img src={qrDataUrl} alt={`QR code linking to ${portfolio.subdomain}`} />}
                <span>SCAN PORTFOLIO</span>
              </div>
              <div className="nfc-card-foot"><span>{portfolio.subdomain}</span><b><i className="nfc-wave" /> TAP TO OPEN</b></div>
            </article>
          </div>
          <div className="nfc-preview-actions">
            <span>Koolink identity stays on every design.</span>
            <button className="secondary-button" onClick={downloadTemplate} title="Download print-ready SVG">↓ Download SVG</button>
          </div>
          <p className="nfc-export-note">SVG artwork is sized to standard card dimensions (85.6 × 54 mm). Add bleed and chip placement with your print supplier.</p>
        </section>

        <aside className="nfc-order-column">
          <div className="panel-label">REQUEST A CARD</div>
          {portfolio.status !== 'published' ? (
            <div className="nfc-publish-note"><span>01</span><h2>Publish to activate your card.</h2><p>The NFC chip links to your live portfolio. Save and publish it before requesting a physical card.</p></div>
          ) : order ? (
            <div className="nfc-order-success" role="status"><span className="nfc-order-check">✓</span><p className="eyebrow">REQUEST RECEIVED</p><h2>Your card request is pending.</h2><p>{order.quantity} {order.quantity === 1 ? 'card' : 'cards'} · {order.unitPrice.toLocaleString()} ETB each</p><strong>{order.totalAmount.toLocaleString()} {order.currency} total</strong><p>Request status: <strong>{order.status}</strong></p><div className="nfc-short-link">{order.shortUrl}</div><button className="secondary-button" onClick={copyShortUrl}>{copied ? 'Copied' : 'Copy tap link'}</button><button className="text-button" onClick={() => setOrder(null)}>New card request</button></div>
          ) : (
            <form className="nfc-order-form" onSubmit={submitOrder}>
              <p className="nfc-order-copy">Choose your card tier and delivery address in Ethiopia:</p>
              <div style={{ display: 'grid', gap: 6, margin: '2px 0 10px' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink)' }}>CARD TIER &amp; PRICING</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {cardTiers.map((tier) => (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setSelectedTier(tier.id as typeof selectedTier)}
                      style={{
                        padding: '7px 4px',
                        border: selectedTier === tier.id ? '2px solid #e06b24' : '1px solid var(--line)',
                        background: selectedTier === tier.id ? '#faece2' : '#fff',
                        borderRadius: 3,
                        cursor: 'pointer',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    >
                      <strong style={{ fontSize: 9, color: 'var(--ink)' }}>{tier.name}</strong>
                      <span style={{ fontSize: 8, fontWeight: 700, color: '#ff3535' }}>{NFC_CARD_TIER_PRICES_ETB[tier.id].toLocaleString()} ETB</span>
                    </button>
                  ))}
                </div>
              </div>
              <label>Quantity<input type="number" min={1} max={100} required value={quantity} onChange={(event) => setQuantity(Math.max(1, Math.min(100, Number(event.target.value) || 1)))} /></label>
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
                  : `Order request (${(NFC_CARD_TIER_PRICES_ETB[selectedTier] * quantity).toLocaleString()} ETB)`}
              </button>
              <small className="nfc-order-disclaimer">No payment is collected here. This submits a request; Koolink will confirm availability, payment, and delivery before fulfillment.</small>
            </form>
          )}
        </aside>
      </div>
    </section>
  )
}
