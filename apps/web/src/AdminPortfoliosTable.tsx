import { useEffect, useState, useMemo } from 'react'
import type { AdminPortfolioSummary } from '@amalink/types'
import { API_URL } from './config'
import { getAuthToken } from './auth-client'
import { getPortfolioSubdomainUrl } from './url-helpers'

interface AdminPortfoliosTableProps {
  onNotification?: (msg: string, type?: 'success' | 'error') => void
}

export function AdminPortfoliosTable({ onNotification }: AdminPortfoliosTableProps) {
  const [portfolios, setPortfolios] = useState<AdminPortfolioSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all')
  const [sortBy, setSortBy] = useState<'clicks' | 'newest' | 'subdomain'>('clicks')

  useEffect(() => {
    async function loadPortfolios() {
      setLoading(true)
      try {
        const token = getAuthToken()
        const res = await fetch(`${API_URL}/admin/portfolios`, {
          credentials: 'include',
          headers: token ? { Authorization: 'Bearer ' + token } : {},
        })
        if (!res.ok) throw new Error('Failed to fetch customer portfolios')
        const data = (await res.json()) as AdminPortfolioSummary[]
        setPortfolios(data)
      } catch (err) {
        console.error(err)
        onNotification?.('Unable to load customer profiles', 'error')
      } finally {
        setLoading(false)
      }
    }
    void loadPortfolios()
  }, [onNotification])

  const filteredPortfolios = useMemo(() => {
    return portfolios
      .filter((p) => {
        if (statusFilter !== 'all' && p.status !== statusFilter) return false
        if (!searchTerm.trim()) return true
        const s = searchTerm.toLowerCase()
        return (
          p.subdomain.toLowerCase().includes(s) ||
          p.owner.name.toLowerCase().includes(s) ||
          p.owner.email.toLowerCase().includes(s) ||
          (p.owner.companyName && p.owner.companyName.toLowerCase().includes(s))
        )
      })
      .sort((a, b) => {
        if (sortBy === 'clicks') return b.clicksCount - a.clicksCount
        if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        return a.subdomain.localeCompare(b.subdomain)
      })
  }, [portfolios, searchTerm, statusFilter, sortBy])

  const totalClicksAll = useMemo(() => {
    return portfolios.reduce((acc, p) => acc + (p.clicksCount || 0), 0)
  }, [portfolios])

  return (
    <div className="admin-portfolios-container">
      {/* ── Filter & Search Bar ── */}
      <div className="admin-queue-controls" style={{ marginBottom: 16 }}>
        <div className="admin-filter-tabs">
          <button
            type="button"
            className={`admin-filter-tab ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            <span>All Profiles</span>
            <span className="admin-tab-count">{portfolios.length}</span>
          </button>

          <button
            type="button"
            className={`admin-filter-tab ${statusFilter === 'published' ? 'active' : ''}`}
            onClick={() => setStatusFilter('published')}
          >
            <span>✓ Published</span>
            <span className="admin-tab-count">
              {portfolios.filter((p) => p.status === 'published').length}
            </span>
          </button>

          <button
            type="button"
            className={`admin-filter-tab ${statusFilter === 'draft' ? 'active' : ''}`}
            onClick={() => setStatusFilter('draft')}
          >
            <span>📝 Drafts</span>
            <span className="admin-tab-count">
              {portfolios.filter((p) => p.status === 'draft').length}
            </span>
          </button>
        </div>

        <div className="admin-search-wrap" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="search"
            className="admin-search-input"
            placeholder="Search subdomain, creator, email, company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ minWidth: 260 }}
          />

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="secondary-button"
            style={{ height: 34, fontSize: 11, fontWeight: 700, padding: '0 8px', cursor: 'pointer' }}
            title="Sort profiles"
          >
            <option value="clicks">Sort: Most Clicks 🔥</option>
            <option value="newest">Sort: Newest First ⏱️</option>
            <option value="subdomain">Sort: Subdomain A-Z 🔤</option>
          </select>
        </div>
      </div>

      {/* ── Table Summary Banner ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 12,
          color: 'var(--muted)',
          marginBottom: 12,
          padding: '0 4px',
        }}
      >
        <span>
          Showing <strong>{filteredPortfolios.length}</strong> of <strong>{portfolios.length}</strong> profiles
        </span>
        <span>
          Total engagement on shown profiles:{' '}
          <strong style={{ color: '#ec4899' }}>
            {filteredPortfolios.reduce((sum, p) => sum + p.clicksCount, 0).toLocaleString()} clicks
          </strong>{' '}
          (of {totalClicksAll.toLocaleString()} platform total)
        </span>
      </div>

      {/* ── Portfolios Data Table ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)', background: '#fff', borderRadius: 12, border: '1px solid var(--line)' }}>
          Loading customer profiles &amp; click analytics...
        </div>
      ) : filteredPortfolios.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 12, border: '1px solid var(--line)' }}>
          <span style={{ fontSize: 32, display: 'block', marginBottom: 8 }}>🔍</span>
          <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>No profiles found</h3>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>
            {searchTerm ? `No profiles matched "${searchTerm}".` : 'No customer profiles have been created yet.'}
          </p>
        </div>
      ) : (
        <div
          style={{
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid var(--line)',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--line)', color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  <th style={{ padding: '12px 16px' }}>Digital Profile &amp; Link</th>
                  <th style={{ padding: '12px 16px' }}>Clicks &amp; Taps</th>
                  <th style={{ padding: '12px 16px' }}>Creator / Owner</th>
                  <th style={{ padding: '12px 16px' }}>Organization / Tier</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Created</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPortfolios.map((p) => {
                  const url = getPortfolioSubdomainUrl(p.subdomain, false)
                  const hasClicks = p.clicksCount > 0

                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: '1px solid var(--line)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Subdomain */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              fontWeight: 800,
                              color: '#0284c7',
                              fontSize: 13,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <span>{p.subdomain}.koo-link.com</span>
                            <span style={{ fontSize: 11 }}>↗</span>
                          </a>
                          {p.isCompanyMaster && (
                            <span
                              style={{
                                display: 'inline-block',
                                width: 'fit-content',
                                background: '#fef3c7',
                                color: '#92400e',
                                padding: '1px 5px',
                                borderRadius: 4,
                                fontSize: 9.5,
                                fontWeight: 700,
                              }}
                            >
                              COMPANY MASTER
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Clicks & Taps */}
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            background: hasClicks ? '#fdf2f8' : '#f1f5f9',
                            color: hasClicks ? '#db2777' : '#64748b',
                            border: `1px solid ${hasClicks ? '#fbcfe8' : '#e2e8f0'}`,
                            padding: '3px 9px',
                            borderRadius: 12,
                            fontWeight: 800,
                            fontSize: 12,
                          }}
                          title="Combined NFC card taps & profile visits"
                        >
                          {hasClicks ? '🔥' : '👆'}{' '}
                          <span>{p.clicksCount.toLocaleString()} {p.clicksCount === 1 ? 'click' : 'clicks'}</span>
                        </span>
                      </td>

                      {/* Creator */}
                      <td style={{ padding: '14px 16px' }}>
                        <div>
                          <strong style={{ display: 'block', color: 'var(--ink)' }}>{p.owner.name}</strong>
                          <span style={{ color: 'var(--muted)', fontSize: 11.5 }}>{p.owner.email}</span>
                        </div>
                      </td>

                      {/* Organization & Tier */}
                      <td style={{ padding: '14px 16px' }}>
                        <div>
                          <span style={{ fontWeight: 600, display: 'block' }}>
                            {p.owner.companyName || '—'}
                          </span>
                          <span
                            style={{
                              display: 'inline-block',
                              background: '#f1f5f9',
                              color: '#475569',
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: 4,
                              textTransform: 'uppercase',
                              marginTop: 2,
                            }}
                          >
                            {p.owner.customerType || 'individual'}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            background: p.status === 'published' ? '#dcfce7' : '#fef3c7',
                            color: p.status === 'published' ? '#166534' : '#92400e',
                            padding: '2px 8px',
                            borderRadius: 999,
                            fontSize: 10.5,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: p.status === 'published' ? '#16a34a' : '#d97706',
                            }}
                          />
                          {p.status}
                        </span>
                      </td>

                      {/* Created Date */}
                      <td style={{ padding: '14px 16px', color: 'var(--muted)', fontSize: 11.5 }}>
                        {new Date(p.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="secondary-button"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '4px 10px',
                            fontSize: 11,
                            fontWeight: 700,
                            textDecoration: 'none',
                          }}
                        >
                          <span>Visit Card</span>
                          <span>↗</span>
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
