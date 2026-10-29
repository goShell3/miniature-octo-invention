import { useState, useId } from 'react'
import type { PortfolioBlock, UserProfile } from '@amalink/types'
import { API_URL } from './config'
import { getAuthToken } from './auth-client'
import './BulkEmployeeModal.css'

export interface BulkEmployeeRow {
  id: string
  fullName: string
  title: string
  email: string
  phone: string
  subdomain: string
}

interface CompanyInfo {
  companyName: string
  companyLogoUrl?: string | null
  brandColor?: string | null
  location?: string
  website?: string
  companySubdomain: string
}

interface BulkEmployeeModalProps {
  company: CompanyInfo
  user: UserProfile
  remainingCapacity: number | null
  onClose: () => void
  onSuccess: (createdCount: number) => void
  checkSubdomain: (subdomain: string) => Promise<boolean>
}

function sanitizeSubdomain(name: string, companySlug: string): string {
  const cleanName = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 16)

  const cleanCompany = companySlug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 10)

  if (!cleanName) return ''
  return cleanCompany ? `${cleanName}-${cleanCompany}` : cleanName
}

export function BulkEmployeeModal({
  company,
  user: _user,
  remainingCapacity,
  onClose,
  onSuccess,
  checkSubdomain,
}: BulkEmployeeModalProps) {
  const uid = useId()
  const [mode, setMode] = useState<'table' | 'paste'>('table')
  const [pasteText, setPasteText] = useState('')
  const [rows, setRows] = useState<BulkEmployeeRow[]>([
    { id: '1', fullName: '', title: '', email: '', phone: '', subdomain: '' },
    { id: '2', fullName: '', title: '', email: '', phone: '', subdomain: '' },
    { id: '3', fullName: '', title: '', email: '', phone: '', subdomain: '' },
  ])
  const [busy, setBusy] = useState(false)
  const [progressText, setProgressText] = useState('')
  const [error, setError] = useState('')

  function updateRow(id: string, patch: Partial<BulkEmployeeRow>) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        const updated = { ...r, ...patch }
        if (patch.fullName !== undefined && (!r.subdomain || r.subdomain === sanitizeSubdomain(r.fullName, company.companySubdomain))) {
          updated.subdomain = sanitizeSubdomain(patch.fullName, company.companySubdomain)
        }
        return updated
      })
    )
    setError('')
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      {
        id: String(Date.now() + Math.random()),
        fullName: '',
        title: '',
        email: '',
        phone: '',
        subdomain: '',
      },
    ])
  }

  function removeRow(id: string) {
    if (rows.length <= 1) return
    setRows((prev) => prev.filter((r) => r.id !== id))
  }

  function handleParsePaste() {
    if (!pasteText.trim()) return
    const lines = pasteText.split(/\r?\n/).filter((l) => l.trim().length > 0)
    const parsed: BulkEmployeeRow[] = lines.map((line, idx) => {
      // Split by tab (Excel/Sheets) or comma
      const parts = line.includes('\t')
        ? line.split('\t').map((s) => s.trim())
        : line.split(',').map((s) => s.trim())

      const fullName = parts[0] || ''
      const title = parts[1] || 'Team Member'
      const email = parts[2] || ''
      const phone = parts[3] || ''
      const subdomain = sanitizeSubdomain(fullName, company.companySubdomain)

      return {
        id: String(Date.now() + idx),
        fullName,
        title,
        email,
        phone,
        subdomain,
      }
    })

    if (parsed.length > 0) {
      setRows(parsed)
      setMode('table')
      setError('')
    }
  }

  async function handleBulkCreate() {
    const validRows = rows.filter((r) => r.fullName.trim().length > 0)
    if (validRows.length === 0) {
      setError('Please add at least one employee with a name.')
      return
    }

    if (remainingCapacity !== null && validRows.length > remainingCapacity) {
      setError(`Cannot create ${validRows.length} accounts. Your tier has ${remainingCapacity} available slots remaining.`)
      return
    }

    setBusy(true)
    setError('')
    const token = getAuthToken()
    let createdCount = 0

    try {
      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i]
        const fullName = row.fullName.trim()
        const title = row.title.trim() || 'Team Member'
        let sub = row.subdomain.trim().toLowerCase()

        if (!sub || sub.length < 3) {
          sub = sanitizeSubdomain(fullName, company.companySubdomain) || `member-${i + 1}`
        }

        setProgressText(`Creating card ${i + 1} of ${validRows.length}: ${fullName}…`)

        // Verify or ensure uniqueness of subdomain
        let isAvail = await checkSubdomain(sub)
        if (!isAvail) {
          sub = `${sub}-${Math.floor(Math.random() * 899 + 100)}`
        }

        const blocks: PortfolioBlock[] = [
          {
            type: 'hero',
            data: {
              name: fullName,
              tagline: title,
              company: company.companyName,
              companyLogoUrl: company.companyLogoUrl || undefined,
              location: company.location || 'Addis Ababa, Ethiopia',
              phone: row.phone.trim() || undefined,
              email: row.email.trim() || undefined,
            },
          },
          {
            type: 'contact',
            data: {
              email: row.email.trim() || undefined,
              phone: row.phone.trim() || undefined,
              socials: company.website ? [{ platform: 'website', url: company.website, label: 'Company Website' }] : [],
            },
          },
        ]

        const createRes = await fetch(`${API_URL}/portfolios`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: 'Bearer ' + token } : {}),
          },
          body: JSON.stringify({
            subdomain: sub,
            isCompanyMaster: false,
            blocks,
            theme: { id: 'minimal', accentColor: company.brandColor || '#0e0e11' },
          }),
        })

        if (!createRes.ok) {
          const errData = await createRes.json().catch(() => ({}))
          console.warn(`Failed to create ${fullName}:`, errData)
          continue
        }

        const createdData = (await createRes.json()) as { id: string }
        if (createdData?.id) {
          // Auto publish employee card
          await fetch(`${API_URL}/portfolios/${createdData.id}/publish`, {
            method: 'POST',
            credentials: 'include',
            headers: token ? { Authorization: 'Bearer ' + token } : {},
          }).catch(() => {})
          createdCount++
        }
      }

      onSuccess(createdCount)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during bulk account generation.')
    } finally {
      setBusy(false)
      setProgressText('')
    }
  }

  const validRowCount = rows.filter((r) => r.fullName.trim().length > 0).length

  return (
    <div className="bulk-modal-backdrop" onClick={busy ? undefined : onClose}>
      <div className="bulk-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bulk-modal-header">
          <div>
            <span className="bulk-modal-eyebrow">BULK ACCOUNT SETUP</span>
            <h2 className="bulk-modal-title">Generate Team Member Cards</h2>
            <p className="bulk-modal-sub">
              All accounts automatically inherit the official logo and brand color from{' '}
              <strong>{company.companyName}</strong>.
            </p>
          </div>
          <button type="button" className="bulk-modal-close" onClick={busy ? undefined : onClose} disabled={busy}>
            x
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="bulk-mode-tabs">
          <button
            type="button"
            className={`bulk-mode-tab ${mode === 'table' ? 'active' : ''}`}
            onClick={() => setMode('table')}
            disabled={busy}
          >
            Quick Table Entry
          </button>
          <button
            type="button"
            className={`bulk-mode-tab ${mode === 'paste' ? 'active' : ''}`}
            onClick={() => setMode('paste')}
            disabled={busy}
          >
            Paste Spreadsheet / CSV
          </button>
          {remainingCapacity !== null && (
            <span className="bulk-capacity-pill">
              {remainingCapacity} Available Card Slots
            </span>
          )}
        </div>

        {/* Content */}
        <div className="bulk-modal-body">
          {mode === 'paste' ? (
            <div className="bulk-paste-container">
              <label htmlFor={`${uid}-paste`} className="bulk-paste-label">
                Copy and paste lines from Excel, Google Sheets, or CSV:
                <span className="bulk-paste-hint">Format: Full Name [Tab or Comma] Title [Tab or Comma] Email [Tab or Comma] Phone</span>
              </label>
              <textarea
                id={`${uid}-paste`}
                className="bulk-paste-textarea"
                rows={8}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={`Dawit Alemayehu\tHead of Enterprise Solutions\tdawit@${company.companySubdomain || 'company'}.et\t+251 91 123 4567\nSelamawit Tadesse\tLead Systems Architect\tselam@${company.companySubdomain || 'company'}.et\t+251 92 987 6543`}
              />
              <div className="bulk-paste-actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={handleParsePaste}
                  disabled={!pasteText.trim()}
                >
                  Parse Into Table →
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setMode('table')}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="bulk-table-wrapper">
              <table className="bulk-table">
                <thead>
                  <tr>
                    <th style={{ width: 28 }}>#</th>
                    <th>Full Name *</th>
                    <th>Job Title / Designation</th>
                    <th>Work Email</th>
                    <th>Direct Phone</th>
                    <th>Subdomain Link</th>
                    <th style={{ width: 36 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={row.id}>
                      <td className="bulk-td-num">{idx + 1}</td>
                      <td>
                        <input
                          type="text"
                          className="bulk-table-input"
                          value={row.fullName}
                          placeholder="e.g. Dawit Alemayehu"
                          onChange={(e) => updateRow(row.id, { fullName: e.target.value })}
                          disabled={busy}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="bulk-table-input"
                          value={row.title}
                          placeholder="e.g. Head of Enterprise"
                          onChange={(e) => updateRow(row.id, { title: e.target.value })}
                          disabled={busy}
                        />
                      </td>
                      <td>
                        <input
                          type="email"
                          className="bulk-table-input"
                          value={row.email}
                          placeholder="name@domain.com"
                          onChange={(e) => updateRow(row.id, { email: e.target.value })}
                          disabled={busy}
                        />
                      </td>
                      <td>
                        <input
                          type="tel"
                          className="bulk-table-input"
                          value={row.phone}
                          placeholder="+251 91 ..."
                          onChange={(e) => updateRow(row.id, { phone: e.target.value })}
                          disabled={busy}
                        />
                      </td>
                      <td>
                        <span className="bulk-sub-cell">
                          {row.subdomain || 'auto-generated'}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="bulk-row-remove-btn"
                          onClick={() => removeRow(row.id)}
                          disabled={busy || rows.length <= 1}
                          title="Remove row"
                        >
                          x
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <button
                type="button"
                className="secondary-button bulk-add-row-btn"
                onClick={addRow}
                disabled={busy}
              >
                + Add Another Member Row
              </button>
            </div>
          )}

          {error && <div className="bulk-modal-error">{error}</div>}

          {busy && (
            <div className="bulk-progress-bar-container">
              <div className="bulk-progress-spinner" />
              <span>{progressText || 'Creating employee cards in bulk…'}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bulk-modal-footer">
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={handleBulkCreate}
            disabled={busy || validRowCount === 0}
          >
            {busy ? 'Processing Accounts…' : `Generate & Activate ${validRowCount} Employee Cards →`}
          </button>
        </div>
      </div>
    </div>
  )
}
