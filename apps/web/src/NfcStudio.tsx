import { useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { NFC_CARD_TIER_PRICES_ETB } from '@amalink/types'
import type { NfcCardTier, PortfolioBlock, PortfolioTheme } from '@amalink/types'
import { API_URL } from './config'
import './NfcStudio.css'
import './NfcStudioModes.css'
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

const templates = [
  { id: 'paper', name: 'Paper / 01', note: 'Warm stock, quiet details' },
  { id: 'signal', name: 'Signal / 02', note: 'Bright color, clear presence' },
  { id: 'atelier', name: 'Atelier / 03', note: 'Deep green, gallery finish' },
  { id: 'frame', name: 'Frame / 04', note: 'A crisp, modern signature' },
] as const

type TemplateId = (typeof templates)[number]['id']
type ColorMode = 'light' | 'dark'

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

function createCardSvg(templateId: TemplateId, colorMode: ColorMode, portfolio: Portfolio) {
  const { name, tagline } = getIdentity(portfolio)
  const portfolioAccent = /^#[0-9a-f]{6}$/i.test(portfolio.theme.accentColor)
    ? portfolio.theme.accentColor
    : '#ff3535'
  const dark = colorMode === 'dark'
  const palettes: Record<TemplateId, { background: string; panel: string; ink: string; muted: string; accent: string; accentInk: string; rule: string; spotlight: string }> = {
    paper: {
      background: dark ? '#202b27' : '#f0eadc', panel: dark ? '#354840' : '#e0d5bf',
      ink: dark ? '#f0eadc' : '#18332d', muted: dark ? '#c0c9c0' : '#68766c',
      accent: portfolioAccent, accentInk: '#ffffff', rule: dark ? '#67766d' : '#c8c0b0', spotlight: dark ? '#354840' : '#e0d5bf',
    },
    signal: {
      background: dark ? '#172d35' : '#ef6148', panel: dark ? '#ef6148' : '#e2ec7b',
      ink: dark ? '#f0eadc' : '#172d35', muted: dark ? '#d3ddd1' : '#172d35',
      accent: dark ? '#e2ec7b' : '#172d35', accentInk: dark ? '#172d35' : '#f0eadc', rule: dark ? '#e2ec7b' : '#172d35', spotlight: dark ? '#ef6148' : '#e2ec7b',
    },
    atelier: {
      background: dark ? '#183a34' : '#f0eadc', panel: dark ? '#234d43' : '#dce7d5',
      ink: dark ? '#f0eadc' : '#183a34', muted: dark ? '#c5d5ca' : '#68766c',
      accent: dark ? '#b5d581' : '#197a68', accentInk: dark ? '#183a34' : '#ffffff', rule: dark ? '#729185' : '#bdcaba', spotlight: '#b5d581',
    },
    frame: {
      background: dark ? '#172d35' : '#e7eeea', panel: dark ? '#203f46' : '#ffffff',
      ink: dark ? '#f1f4e7' : '#172d35', muted: dark ? '#b9c9c1' : '#65756e',
      accent: portfolioAccent, accentInk: '#ffffff', rule: dark ? '#64837a' : '#b7c8c0', spotlight: dark ? '#e4eb88' : '#d6eee1',
    },
  }
  const palette = palettes[templateId]
  const safeName = toLines(name, 19).map(escapeXml)
  const safeTagline = toLines(tagline, 27).map(escapeXml)
  const nameSvg = safeName.map((line, index) => `<text x="56" y="${286 + index * 58}" class="name">${line}</text>`).join('')
  const taglineSvg = safeTagline.map((line, index) => `<text x="58" y="${390 + index * 28}" class="tagline">${line}</text>`).join('')
  const domain = escapeXml(
    typeof window !== 'undefined'
      ? (window.location.hostname.endsWith('localhost') ? `${portfolio.subdomain}.localhost:5173` : `${portfolio.subdomain}.${window.location.host}`)
      : `${portfolio.subdomain}.sewnet.et`
  )

  const artwork: Record<TemplateId, string> = {
    paper: `<rect width="856" height="540" rx="28" fill="${palette.background}"/><rect x="0" y="0" width="18" height="540" fill="${palette.accent}"/><circle cx="760" cy="110" r="132" fill="${palette.spotlight}"/><circle cx="760" cy="110" r="92" fill="none" stroke="${palette.accent}" stroke-width="2"/><path d="M650 110h220M760 0v220" stroke="${palette.accent}" stroke-opacity=".28"/><rect x="56" y="54" width="44" height="44" rx="4" fill="${palette.accent}"/><text x="78" y="85" text-anchor="middle" class="brand-initial">S</text><text x="116" y="82" class="brand">sewnet</text><text x="58" y="226" class="eyebrow">DIGITAL IDENTITY &amp; NETWORKING</text>${nameSvg}${taglineSvg}<path d="M58 456h740" stroke="${palette.rule}"/><text x="58" y="493" class="domain">${domain}</text><text x="798" y="493" text-anchor="end" class="nfc">TAP TO OPEN  /  NFC</text>`,
    signal: `<rect width="856" height="540" rx="28" fill="${palette.background}"/><path d="M0 0h856v20H0z" fill="${palette.accent}"/><path d="M636 0h220v220H636z" fill="${palette.panel}"/><path d="M636 0l220 220" stroke="${palette.accent}" stroke-width="2"/><rect x="56" y="52" width="46" height="46" rx="23" fill="${palette.accent}"/><text x="79" y="83" text-anchor="middle" class="brand-initial">S</text><text x="118" y="82" class="brand">sewnet</text><text x="58" y="218" class="eyebrow">ONE IDENTITY. ONE TAP.</text>${nameSvg}${taglineSvg}<rect x="58" y="448" width="740" height="2" fill="${palette.rule}"/><text x="58" y="492" class="domain">${domain}</text><text x="798" y="492" text-anchor="end" class="nfc">TAP TO OPEN  /  NFC</text>`,
    atelier: `<rect width="856" height="540" rx="28" fill="${palette.background}"/><path d="M558 0h298v540H558z" fill="${palette.panel}"/><circle cx="706" cy="270" r="178" fill="none" stroke="${palette.spotlight}" stroke-width="2"/><circle cx="706" cy="270" r="142" fill="none" stroke="${palette.spotlight}" stroke-opacity=".5"/><circle cx="706" cy="270" r="105" fill="${palette.spotlight}"/><path d="M706 165v210M601 270h210" stroke="${palette.background}" stroke-opacity=".35"/><rect x="56" y="52" width="46" height="46" rx="4" fill="${palette.accent}"/><text x="79" y="84" text-anchor="middle" class="brand-initial">S</text><text x="118" y="82" class="brand">sewnet</text><text x="58" y="218" class="eyebrow">EVERY CONNECTION MEASURED</text>${nameSvg}${taglineSvg}<path d="M58 448h740" stroke="${palette.rule}"/><text x="58" y="492" class="domain">${domain}</text><text x="798" y="492" text-anchor="end" class="nfc">TAP TO OPEN  /  NFC</text>`,
    frame: `<rect width="856" height="540" rx="28" fill="${palette.background}"/><rect x="24" y="24" width="808" height="492" rx="18" fill="none" stroke="${palette.rule}" stroke-width="2"/><path d="M58 54h48v48M798 438v48h-48" fill="none" stroke="${palette.accent}" stroke-width="5"/><rect x="56" y="54" width="44" height="44" rx="22" fill="${palette.accent}"/><text x="78" y="85" text-anchor="middle" class="brand-initial">S</text><text x="116" y="82" class="brand">sewnet</text><text x="58" y="218" class="eyebrow">YOUR WORK, ONE TAP AWAY</text>${nameSvg}${taglineSvg}<path d="M58 456h740" stroke="${palette.rule}"/><text x="58" y="493" class="domain">${domain}</text><text x="798" y="493" text-anchor="end" class="nfc">TAP TO OPEN  /  NFC</text>`,
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="85.6mm" height="54mm" viewBox="0 0 856 540" role="img" aria-label="${escapeXml(name)} Sewnet ${colorMode} NFC card"><style>text{font-family:Arial,sans-serif}.brand{font-size:25px;font-weight:700;fill:${palette.ink}}.brand-initial{font-family:Arial,sans-serif;font-size:26px;font-weight:800;fill:${palette.accentInk}}.eyebrow{font-size:12px;font-weight:700;letter-spacing:3px;fill:${palette.accent}}.name{font-family:Georgia,serif;font-size:51px;fill:${palette.ink}}.tagline{font-size:18px;fill:${palette.muted}}.domain{font-size:14px;font-weight:700;fill:${palette.ink}}.nfc{font-size:12px;font-weight:700;letter-spacing:1px;fill:${palette.accent}}</style>${artwork[templateId]}</svg>`
}

export function NfcStudio({ portfolio, onBack, initialTier }: { portfolio: Portfolio; onBack: () => void; initialTier?: NfcCardTier }) {
  const identity = getIdentity(portfolio)
  const accent = portfolio.theme.accentColor
  const cardStyle = { '--card-accent': accent } as CSSProperties

  const [templateId, setTemplateId] = useState<TemplateId>('paper')
  const [colorMode, setColorMode] = useState<ColorMode>('light')
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

  function downloadTemplate() {
    const svg = createCardSvg(templateId, colorMode, portfolio)
      .replace(/class="brand">sewnet<\/text>/g, 'class="brand">koolink</text>')
      .replace(/aria-label="([^"]*) Sewnet /, '$1 Koolink ')
      .replace(/class="brand-initial">S<\/text>/g, 'class="brand-initial">K</text>')
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${portfolio.subdomain}-${templateId}-${colorMode}-nfc-card.svg`
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
          <div className="panel-label">CHOOSE A TEMPLATE</div>
          <div className="nfc-template-list" role="tablist" aria-label="Card templates">
            {templates.map((template, index) => (
              <button key={template.id} role="tab" aria-selected={templateId === template.id} className={`nfc-template-option ${templateId === template.id ? 'active' : ''}`} onClick={() => { setTemplateId(template.id); setOrder(null) }}>
                <span className={`nfc-mini-card nfc-mini-card--${template.id} ${colorMode === 'dark' ? 'nfc-mini-card--dark' : ''}`}><span className="mini-brand">S</span><span className="mini-lines" /></span>
                <span className="nfc-template-name"><strong>{template.name}</strong><small>{template.note}</small></span>
                <span className="nfc-template-index">0{index + 1}</span>
              </button>
            ))}
          </div>
          <div className="nfc-data-note"><span className="nfc-note-mark">K</span><p><strong>Built from your portfolio</strong><br />Name, role, address, and accent color come from your live Koolink profile.</p></div>
        </aside>

        <section className="nfc-preview-column" aria-label="Card preview">
          <div className="nfc-preview-label"><span>FRONT / LIVE PREVIEW</span><div className="nfc-mode-switch" role="group" aria-label="Card color mode"><button type="button" aria-pressed={colorMode === 'light'} className={colorMode === 'light' ? 'active' : ''} onClick={() => setColorMode('light')}>Light</button><button type="button" aria-pressed={colorMode === 'dark'} className={colorMode === 'dark' ? 'active' : ''} onClick={() => setColorMode('dark')}>Dark</button></div><span>85.6 × 54 MM</span></div>
          <div className="nfc-card-wrap">
            <article className={`nfc-card nfc-card--${templateId} nfc-card--${colorMode}`} style={cardStyle}>
              <div className="nfc-card-brand"><BrandLogo variant="card" /></div>
              <div className="nfc-card-content">
                <span className="nfc-card-kicker">{templateId === 'signal' ? 'GOOD WORK TRAVELS' : templateId === 'atelier' ? 'MADE TO BE REMEMBERED' : templateId === 'frame' ? 'YOUR WORK, ONE TAP AWAY' : 'A PORTFOLIO, IN PERSON'}</span>
                <h2>{identity.name}</h2>
                <p>{identity.tagline}</p>
              </div>
              <div className="nfc-card-foot"><span>{portfolio.subdomain}</span><b><i className="nfc-wave" /> TAP TO OPEN</b></div>
              <span className="nfc-card-graphic" aria-hidden="true" />
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
            <div className="nfc-order-success" role="status"><span className="nfc-order-check">✓</span><p className="eyebrow">LINK CREATED</p><h2>Your tap destination is ready.</h2><p>Order status: <strong>{order.status}</strong></p><div className="nfc-short-link">{order.shortUrl}</div><button className="secondary-button" onClick={copyShortUrl}>{copied ? 'Copied' : 'Copy tap link'}</button><button className="text-button" onClick={() => setOrder(null)}>New card request</button></div>
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
              <small className="nfc-order-disclaimer">Payment will be collected via Telebirr or CBE upon card fulfillment and delivery.</small>
            </form>
          )}
        </aside>
      </div>
    </section>
  )
}
