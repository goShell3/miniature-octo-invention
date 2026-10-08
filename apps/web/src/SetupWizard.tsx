import { useState, useId } from 'react'
import type { CSSProperties } from 'react'
import type { PortfolioBlock, PortfolioTheme } from '@amalink/types'
import './SetupWizard.css'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WizardData {
  subdomain: string
  name: string
  tagline: string
  about: string
  projectTitle: string
  projectDescription: string
  projectLink: string
  email: string
  accentColor: `#${string}`
}

interface SetupWizardProps {
  /** Called when the user finishes. App.tsx creates the portfolio from this data. */
  onFinish: (data: WizardData) => Promise<void>
  /** Check subdomain availability against the API */
  checkSubdomain: (subdomain: string) => Promise<boolean>
  busy: boolean
  error: string
}

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS = [
  { key: 'address',  label: 'Address',  headline: 'Claim your address.',       sub: 'This becomes your portfolio URL. You can always change it later.' },
  { key: 'identity', label: 'Identity', headline: 'What should we call you?',   sub: 'Your name and the role or tagline that describes your work.' },
  { key: 'about',    label: 'About',    headline: 'Tell us a little about you.', sub: 'A short paragraph about your practice — a few sentences is plenty.' },
  { key: 'work',     label: 'Work',     headline: 'Show your first piece.',      sub: 'Add one project to start. You can add more in the editor.' },
  { key: 'finish',   label: 'Finish',   headline: 'One last touch.',             sub: 'Add a contact email and choose an accent color for your portfolio.' },
] as const

type StepKey = (typeof STEPS)[number]['key']

// ─── Main component ────────────────────────────────────────────────────────────

export function SetupWizard({ onFinish, checkSubdomain, busy, error }: SetupWizardProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [subdomainStatus, setSubdomainStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [fieldError, setFieldError] = useState('')

  const [data, setData] = useState<WizardData>({
    subdomain: '',
    name: '',
    tagline: '',
    about: '',
    projectTitle: '',
    projectDescription: '',
    projectLink: '',
    email: '',
    accentColor: '#e06b24',
  })

  const uid = useId()
  const step = STEPS[stepIndex]
  const isLast = stepIndex === STEPS.length - 1
  const progress = ((stepIndex) / (STEPS.length - 1)) * 100

  function patch(update: Partial<WizardData>) {
    setData((d) => ({ ...d, ...update }))
    setFieldError('')
  }

  // ── Subdomain check ──────────────────────────────────────────────────────────
  async function handleCheckSubdomain() {
    const val = data.subdomain.trim()
    if (!val) { setFieldError('Enter a subdomain first.'); return }
    if (!/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(val)) {
      setFieldError('Use 3–30 lowercase letters, numbers, or hyphens. Cannot start or end with a hyphen.')
      return
    }
    setSubdomainStatus('checking')
    setFieldError('')
    try {
      const available = await checkSubdomain(val)
      setSubdomainStatus(available ? 'available' : 'taken')
      if (!available) setFieldError('That address is already taken. Try another.')
    } catch {
      setSubdomainStatus('idle')
      setFieldError('Could not check availability. Try again.')
    }
  }

  // ── Navigation ───────────────────────────────────────────────────────────────
  function canAdvance(): boolean {
    switch (step.key) {
      case 'address':  return subdomainStatus === 'available'
      case 'identity': return data.name.trim().length > 0
      case 'about':    return data.about.trim().length > 0
      case 'work':     return data.projectTitle.trim().length > 0
      case 'finish':   return true
    }
  }

  function goNext() {
    if (!canAdvance()) return
    setDirection('forward')
    setFieldError('')
    if (isLast) {
      void onFinish(data)
    } else {
      setStepIndex((i) => i + 1)
    }
  }

  function goBack() {
    if (stepIndex === 0) return
    setDirection('back')
    setFieldError('')
    setStepIndex((i) => i - 1)
  }

  function goToStep(index: number) {
    if (index >= stepIndex) return   // only allow going back
    setDirection('back')
    setFieldError('')
    setStepIndex(index)
  }

  // ── Live preview blocks ──────────────────────────────────────────────────────
  const previewBlocks: PortfolioBlock[] = [
    { type: 'hero',     data: { name: data.name || 'Your name', tagline: data.tagline || 'What you do' } },
    { type: 'about',    data: { body: data.about || 'Your introduction will appear here.' } },
    { type: 'projects', data: { items: [{ title: data.projectTitle || 'Project title', description: data.projectDescription || 'Project description' }] } },
    { type: 'contact',  data: { email: data.email } },
  ]
  const previewTheme: PortfolioTheme = { id: 'minimal', accentColor: data.accentColor }

  return (
    <div className="wizard-shell">
      {/* ── Progress track ─────────────────────────────────────────── */}
      <header className="wizard-header">
        <div className="wizard-brand">
          <span className="brand-mark">S</span>
          <span>sewnet</span>
        </div>
        <nav className="wizard-steps" aria-label="Setup progress">
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              className={`wizard-step-dot ${i === stepIndex ? 'active' : ''} ${i < stepIndex ? 'done' : ''}`}
              onClick={() => goToStep(i)}
              disabled={i >= stepIndex}
              aria-label={`${s.label}${i < stepIndex ? ' (completed)' : i === stepIndex ? ' (current)' : ''}`}
              aria-current={i === stepIndex ? 'step' : undefined}
            >
              <span className="dot-number">{i < stepIndex ? '✓' : String(i + 1)}</span>
              <span className="dot-label">{s.label}</span>
            </button>
          ))}
          <div className="wizard-progress-bar" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
            <div className="wizard-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </nav>
        <div className="wizard-step-count" aria-hidden="true">
          {String(stepIndex + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}
        </div>
      </header>

      {/* ── Two-column body ────────────────────────────────────────── */}
      <div className="wizard-body">
        {/* Left: step form */}
        <section
          className={`wizard-form-col ${direction}`}
          key={step.key}
          aria-label={`Step ${stepIndex + 1}: ${step.label}`}
        >
          <div className="wizard-form-inner">
            <p className="wizard-eyebrow">STEP {String(stepIndex + 1).padStart(2, '0')} — {step.label.toUpperCase()}</p>
            <h2 className="wizard-headline">{step.headline}</h2>
            <p className="wizard-sub">{step.sub}</p>

            <div className="wizard-fields">
              {/* ── STEP 1: Address ──────────────────────────────── */}
              {step.key === 'address' && (
                <>
                  <div className="wizard-field">
                    <label htmlFor={`${uid}-subdomain`}>Your portfolio address</label>
                    <div className="wizard-domain-row">
                      <input
                        id={`${uid}-subdomain`}
                        type="text"
                        value={data.subdomain}
                        autoFocus
                        autoCapitalize="none"
                        autoComplete="off"
                        spellCheck={false}
                        maxLength={30}
                        placeholder="yourname"
                        onChange={(e) => {
                          const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                          patch({ subdomain: val })
                          setSubdomainStatus('idle')
                        }}
                        aria-describedby={`${uid}-subdomain-hint`}
                      />
                      <span className="domain-suffix">.yoursite.com</span>
                    </div>
                    <span id={`${uid}-subdomain-hint`} className="wizard-field-hint">
                      Lowercase letters, numbers, hyphens. 3–30 characters.
                    </span>
                  </div>
                  <div className="wizard-check-row">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={handleCheckSubdomain}
                      disabled={!data.subdomain || subdomainStatus === 'checking'}
                    >
                      {subdomainStatus === 'checking' ? 'Checking…' : 'Check availability'}
                    </button>
                    {subdomainStatus === 'available' && (
                      <span className="wizard-status available" role="status">✓ Available</span>
                    )}
                    {subdomainStatus === 'taken' && (
                      <span className="wizard-status taken" role="status">✗ Already taken</span>
                    )}
                  </div>
                </>
              )}

              {/* ── STEP 2: Identity ─────────────────────────────── */}
              {step.key === 'identity' && (
                <>
                  <div className="wizard-field">
                    <label htmlFor={`${uid}-name`}>Your name</label>
                    <input
                      id={`${uid}-name`}
                      type="text"
                      value={data.name}
                      autoFocus
                      autoComplete="name"
                      placeholder="Ada Lovelace"
                      onChange={(e) => patch({ name: e.target.value })}
                    />
                  </div>
                  <div className="wizard-field">
                    <label htmlFor={`${uid}-tagline`}>
                      Tagline <span className="wizard-optional">OPTIONAL</span>
                    </label>
                    <input
                      id={`${uid}-tagline`}
                      type="text"
                      value={data.tagline}
                      autoComplete="off"
                      placeholder="Designer, engineer, and builder of things"
                      maxLength={120}
                      onChange={(e) => patch({ tagline: e.target.value })}
                    />
                  </div>
                </>
              )}

              {/* ── STEP 3: About ─────────────────────────────────── */}
              {step.key === 'about' && (
                <div className="wizard-field">
                  <label htmlFor={`${uid}-about`}>About you</label>
                  <textarea
                    id={`${uid}-about`}
                    rows={6}
                    value={data.about}
                    autoFocus
                    placeholder="I'm a product designer based in Nairobi. I've spent the last seven years crafting tools that help people work clearly…"
                    onChange={(e) => patch({ about: e.target.value })}
                  />
                  <span className="wizard-field-hint">
                    Write naturally — you can refine this later.
                  </span>
                </div>
              )}

              {/* ── STEP 4: Work ──────────────────────────────────── */}
              {step.key === 'work' && (
                <>
                  <div className="wizard-field">
                    <label htmlFor={`${uid}-ptitle`}>Project name</label>
                    <input
                      id={`${uid}-ptitle`}
                      type="text"
                      value={data.projectTitle}
                      autoFocus
                      placeholder="Redesigning onboarding for 10 000 users"
                      onChange={(e) => patch({ projectTitle: e.target.value })}
                    />
                  </div>
                  <div className="wizard-field">
                    <label htmlFor={`${uid}-pdesc`}>
                      Short description <span className="wizard-optional">OPTIONAL</span>
                    </label>
                    <textarea
                      id={`${uid}-pdesc`}
                      rows={3}
                      value={data.projectDescription}
                      placeholder="A brief summary of what you did and why it mattered."
                      onChange={(e) => patch({ projectDescription: e.target.value })}
                    />
                  </div>
                  <div className="wizard-field">
                    <label htmlFor={`${uid}-plink`}>
                      Project link <span className="wizard-optional">OPTIONAL</span>
                    </label>
                    <input
                      id={`${uid}-plink`}
                      type="url"
                      value={data.projectLink}
                      placeholder="https://…"
                      onChange={(e) => patch({ projectLink: e.target.value })}
                    />
                  </div>
                </>
              )}

              {/* ── STEP 5: Finish ────────────────────────────────── */}
              {step.key === 'finish' && (
                <>
                  <div className="wizard-field">
                    <label htmlFor={`${uid}-email`}>
                      Contact email <span className="wizard-optional">OPTIONAL</span>
                    </label>
                    <input
                      id={`${uid}-email`}
                      type="email"
                      value={data.email}
                      autoFocus
                      autoComplete="email"
                      placeholder="hello@example.com"
                      onChange={(e) => patch({ email: e.target.value })}
                    />
                  </div>
                  <div className="wizard-field">
                    <label htmlFor={`${uid}-color`}>Accent color</label>
                    <div className="wizard-color-row">
                      <input
                        id={`${uid}-color`}
                        type="color"
                        value={data.accentColor}
                        onChange={(e) => patch({ accentColor: e.target.value as `#${string}` })}
                      />
                      <div className="wizard-color-swatches" role="group" aria-label="Color presets">
                        {(['#e06b24', '#f48935', '#191513', '#2563eb', '#0f766e', '#7c3aed'] as const).map((c) => (
                          <button
                            key={c}
                            type="button"
                            className={`color-swatch ${data.accentColor === c ? 'selected' : ''}`}
                            style={{ '--swatch-color': c } as CSSProperties}
                            onClick={() => patch({ accentColor: c })}
                            aria-label={`Color ${c}`}
                            aria-pressed={data.accentColor === c}
                          />
                        ))}
                      </div>
                      <code className="wizard-color-code">{data.accentColor}</code>
                    </div>
                  </div>

                  <div className="wizard-summary">
                    <p className="wizard-summary-label">YOUR PORTFOLIO WILL INCLUDE</p>
                    <ul>
                      <li><span>↗</span>{data.subdomain}.yoursite.com</li>
                      <li><span>↗</span>Hero — {data.name || '(name)'}</li>
                      {data.about && <li><span>↗</span>About section</li>}
                      {data.projectTitle && <li><span>↗</span>Project — {data.projectTitle}</li>}
                      {data.email && <li><span>↗</span>Contact — {data.email}</li>}
                    </ul>
                    <p className="wizard-summary-note">Everything can be edited and expanded in the full editor.</p>
                  </div>
                </>
              )}
            </div>

            {/* Errors */}
            {(fieldError || error) && (
              <p className="wizard-error" role="alert">{fieldError || error}</p>
            )}

            {/* Navigation */}
            <div className="wizard-nav">
              {stepIndex > 0 && (
                <button type="button" className="wizard-back-btn" onClick={goBack} disabled={busy}>
                  ← Back
                </button>
              )}
              <button
                type="button"
                className="primary-button wizard-next-btn"
                onClick={goNext}
                disabled={!canAdvance() || busy}
              >
                {busy ? 'Creating your portfolio…' : isLast ? 'Create my portfolio →' : 'Continue →'}
              </button>
            </div>
          </div>
        </section>

        {/* Right: live preview */}
        <aside className="wizard-preview-col" aria-label="Live preview">
          <div className="wizard-preview-label">
            <span><i className="preview-dot" aria-hidden="true" /> LIVE PREVIEW</span>
            <span>{data.subdomain ? `${data.subdomain}.yoursite.com` : 'yoursite.com'}</span>
          </div>
          <WizardPreview blocks={previewBlocks} theme={previewTheme} activeStep={step.key} />
        </aside>
      </div>
    </div>
  )
}

// ─── Mini live preview ────────────────────────────────────────────────────────

function WizardPreview({ blocks, theme, activeStep }: {
  blocks: PortfolioBlock[]
  theme: PortfolioTheme
  activeStep: StepKey
}) {
  const hero     = blocks.find((b) => b.type === 'hero')
  const about    = blocks.find((b) => b.type === 'about')
  const projects = blocks.find((b) => b.type === 'projects')
  const contact  = blocks.find((b) => b.type === 'contact')

  return (
    <article className="wizard-portfolio-preview" style={{ '--preview-accent': theme.accentColor } as CSSProperties}>
      <div className="preview-nav">
        <span>{hero?.type === 'hero' ? hero.data.name || 'PORTFOLIO' : 'PORTFOLIO'}</span>
        <span>01—04</span>
      </div>

      {hero?.type === 'hero' && (
        <section className={`preview-hero ${activeStep === 'identity' ? 'preview-highlight' : ''}`}>
          <p className="preview-kicker">INDEPENDENT CREATIVE</p>
          <h2>
            {hero.data.name || 'Your name'}<br />
            <em>{hero.data.tagline || 'What you do'}</em>
          </h2>
        </section>
      )}

      {about?.type === 'about' && (
        <section className={`preview-about ${activeStep === 'about' ? 'preview-highlight' : ''}`}>
          <span>01 / ABOUT</span>
          <p>{about.data.body}</p>
        </section>
      )}

      {projects?.type === 'projects' && (
        <section className={`preview-projects ${activeStep === 'work' ? 'preview-highlight' : ''}`}>
          <span>02 / SELECTED WORK</span>
          {projects.data.items.map((item, index) => (
            <div className="preview-project" key={index}>
              <b>{String(index + 1).padStart(2, '0')}</b>
              <div>
                <strong>{item.title}</strong>
                {item.description && <small>{item.description}</small>}
              </div>
              <span>↗</span>
            </div>
          ))}
        </section>
      )}

      {contact?.type === 'contact' && contact.data.email && (
        <section className={`preview-contact ${activeStep === 'finish' ? 'preview-highlight' : ''}`}>
          <span>03 / CONTACT</span>
          <a>{contact.data.email} ↗</a>
        </section>
      )}

      <footer className="preview-footer">
        <span>© {new Date().getFullYear()}</span>
        <span>MADE WITH SEWNET</span>
      </footer>
    </article>
  )
}

// ─── Helpers used by App.tsx ──────────────────────────────────────────────────

/** Convert wizard data into the standard portfolio blocks array. */
export function wizardDataToBlocks(data: WizardData): PortfolioBlock[] {
  return [
    { type: 'hero',     data: { name: data.name, tagline: data.tagline } },
    { type: 'about',    data: { body: data.about } },
    { type: 'projects', data: { items: [{ title: data.projectTitle, description: data.projectDescription, link: data.projectLink || undefined }] } },
    { type: 'contact',  data: { email: data.email } },
  ]
}
