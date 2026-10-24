import { useEffect, useState, useCallback } from 'react'
import QRCode from 'qrcode'
import { NFC_CARD_TIER_META } from '@amalink/types'
import type {
  AdminOrderSummary,
  AdminQueueStats,
  PaymentStatus,
} from '@amalink/types'
import { API_URL } from './config'
import { getPortfolioSubdomainUrl } from './url-helpers'
import { createCardSvg } from './NfcStudio'
import './AdminPrintQueue.css'

interface AdminPrintQueueProps {
  onNotification?: (msg: string, type?: 'success' | 'error') => void
}

export function AdminPrintQueue({ onNotification }: AdminPrintQueueProps) {
  const [stats, setStats] = useState<AdminQueueStats | null>(null)
  const [orders, setOrders] = useState<AdminOrderSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<'all' | 'printing' | 'pending' | 'shipped' | 'delivered'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null)
  const [downloadingOrderId, setDownloadingOrderId] = useState<string | null>(null)
  const [testingTelegram, setTestingTelegram] = useState(false)

  async function handleTestTelegram() {
    setTestingTelegram(true)
    try {
      const res = await fetch(`${API_URL}/admin/telegram/test`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json()
      if (res.ok && data.success) {
        onNotification?.('Telegram alert sent successfully! Check your Telegram chat.', 'success')
      } else {
        onNotification?.(`Telegram alert error: ${data.error || 'Failed to send'}`, 'error')
      }
    } catch (err: any) {
      onNotification?.(`Telegram alert error: ${err?.message || 'Network error'}`, 'error')
    } finally {
      setTestingTelegram(false)
    }
  }

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/orders/stats`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to load stats')
      const data = (await res.json()) as AdminQueueStats
      setStats(data)
    } catch (err) {
      console.error('Error loading stats:', err)
    }
  }, [])

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (activeFilter !== 'all') params.set('status', activeFilter)
      if (searchTerm.trim()) params.set('search', searchTerm.trim())

      const res = await fetch(`${API_URL}/admin/orders?${params.toString()}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to load orders')
      const data = (await res.json()) as AdminOrderSummary[]
      setOrders(data)
    } catch (err) {
      console.error('Error loading orders:', err)
      onNotification?.('Failed to load orders list', 'error')
    } finally {
      setLoading(false)
    }
  }, [activeFilter, searchTerm, onNotification])

  useEffect(() => {
    void fetchStats()
    void fetchOrders()
  }, [fetchStats, fetchOrders])

  async function handleStatusChange(orderId: string, newStatus: 'pending' | 'printing' | 'shipped' | 'delivered') {
    setBusyOrderId(orderId)
    try {
      const res = await fetch(`${API_URL}/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      const updated = (await res.json()) as AdminOrderSummary

      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)))
      void fetchStats()
      onNotification?.(`Order status changed to ${newStatus.toUpperCase()}`, 'success')
    } catch (err) {
      console.error(err)
      onNotification?.('Unable to update order status', 'error')
    } finally {
      setBusyOrderId(null)
    }
  }

  async function handlePaymentStatusToggle(order: AdminOrderSummary) {
    const nextStatus: PaymentStatus = order.paymentStatus === 'paid' ? 'unpaid' : 'paid'
    setBusyOrderId(order.id)
    try {
      const res = await fetch(`${API_URL}/admin/orders/${order.id}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: nextStatus }),
      })
      if (!res.ok) throw new Error('Failed to update payment status')
      const updated = (await res.json()) as AdminOrderSummary

      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)))
      void fetchStats()
      onNotification?.(`Payment marked as ${nextStatus.toUpperCase()}`, 'success')
    } catch (err) {
      console.error(err)
      onNotification?.('Unable to update payment status', 'error')
    } finally {
      setBusyOrderId(null)
    }
  }

  async function handleDownloadPrintSvg(order: AdminOrderSummary) {
    setDownloadingOrderId(order.id)
    try {
      const qrDataUrl = await QRCode.toDataURL(order.shortUrl, {
        width: 320,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: { dark: '#0e0e11', light: '#ffffff' },
      })

      const svg = await createCardSvg('#0e0e11', '#ffffff', order.shortUrl, {
        frontLogoText: order.owner.companyName || order.owner.name,
        cardName: order.shippingAddress?.name || order.owner.name,
        cardDesignation: order.owner.companyName || 'Member',
        qrDataUrl,
      })

      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `KL-${order.id.slice(0, 8).toUpperCase()}-${order.portfolio.subdomain}-print.svg`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)

      onNotification?.('Downloaded vector CR80 print template', 'success')
    } catch (err) {
      console.error('Failed to generate print SVG:', err)
      onNotification?.('Could not generate print template', 'error')
    } finally {
      setDownloadingOrderId(null)
    }
  }

  return (
    <div className="admin-queue-view">
      {/* ── Key Fulfillment Stats Row ── */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card print-queue">
          <span className="admin-stat-label">🖨️ Active Print Queue</span>
          <span className="admin-stat-value">{stats ? stats.printingCount : '...'}</span>
          <span className="admin-stat-sub">Ready for UV printing &amp; encoding</span>
        </div>

        <div className="admin-stat-card revenue">
          <span className="admin-stat-label">💰 Verified Revenue</span>
          <span className="admin-stat-value">
            {stats ? `${stats.totalRevenueETB.toLocaleString()} ETB` : '...'}
          </span>
          <span className="admin-stat-sub">From Cheki &amp; verified transfers</span>
        </div>

        <div className="admin-stat-card unpaid">
          <span className="admin-stat-label">⏳ Pending Orders</span>
          <span className="admin-stat-value">{stats ? stats.pendingCount : '...'}</span>
          <span className="admin-stat-sub">{stats ? `${stats.unpaidCount} unpaid/awaiting` : '...'}</span>
        </div>

        <div className="admin-stat-card fulfilled">
          <span className="admin-stat-label">🚚 Fulfilled Cards</span>
          <span className="admin-stat-value">
            {stats ? stats.shippedCount + stats.deliveredCount : '...'}
          </span>
          <span className="admin-stat-sub">{stats ? `${stats.totalCards} cards total ordered` : '...'}</span>
        </div>
      </div>

      {/* ── Filters & Search Control Bar ── */}
      <div className="admin-queue-controls">
        <div className="admin-filter-tabs">
          <button
            type="button"
            className={`admin-filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            <span>All Orders</span>
            <span className="admin-tab-count">{stats?.totalOrders ?? 0}</span>
          </button>

          <button
            type="button"
            className={`admin-filter-tab ${activeFilter === 'printing' ? 'active' : ''}`}
            onClick={() => setActiveFilter('printing')}
          >
            <span>🖨️ Print Queue</span>
            <span className="admin-tab-count">{stats?.printingCount ?? 0}</span>
          </button>

          <button
            type="button"
            className={`admin-filter-tab ${activeFilter === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveFilter('pending')}
          >
            <span>⏳ Pending</span>
            <span className="admin-tab-count">{stats?.pendingCount ?? 0}</span>
          </button>

          <button
            type="button"
            className={`admin-filter-tab ${activeFilter === 'shipped' ? 'active' : ''}`}
            onClick={() => setActiveFilter('shipped')}
          >
            <span>🚚 Shipped</span>
            <span className="admin-tab-count">{stats?.shippedCount ?? 0}</span>
          </button>

          <button
            type="button"
            className={`admin-filter-tab ${activeFilter === 'delivered' ? 'active' : ''}`}
            onClick={() => setActiveFilter('delivered')}
          >
            <span>✓ Delivered</span>
            <span className="admin-tab-count">{stats?.deliveredCount ?? 0}</span>
          </button>
        </div>

        <div className="admin-search-wrap">
          <input
            type="search"
            className="admin-search-input"
            placeholder="Search ref, customer, phone, city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            type="button"
            className="secondary-button"
            style={{ height: 34, padding: '0 10px', fontSize: 11 }}
            onClick={() => {
              void fetchStats()
              void fetchOrders()
            }}
            title="Refresh order queue"
          >
            ↻ Refresh
          </button>
          <button
            type="button"
            className="secondary-button"
            style={{ height: 34, padding: '0 10px', fontSize: 11, background: '#229ED9', color: '#fff', borderColor: '#229ED9' }}
            onClick={() => void handleTestTelegram()}
            disabled={testingTelegram}
            title="Send a test message to the configured Admin Telegram chat"
          >
            {testingTelegram ? 'Testing...' : '✈ Test Telegram'}
          </button>
        </div>
      </div>

      {/* ── Orders Queue List ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
          Loading admin order queue...
        </div>
      ) : orders.length === 0 ? (
        <div className="empty-state" style={{ textAlign: 'center', padding: '50px 20px', background: '#ffffff', border: '1px solid var(--line)', borderRadius: 12 }}>
          <h3>No orders match this filter.</h3>
          <p style={{ color: 'var(--muted)', fontSize: 12 }}>
            Orders placed via the NFC Studio will appear here for queueing, printing, and delivery dispatch.
          </p>
        </div>
      ) : (
        <div className="admin-order-cards-list">
          {orders.map((order) => {
            const isBusy = busyOrderId === order.id
            const isDownloading = downloadingOrderId === order.id
            const subUrl = getPortfolioSubdomainUrl(order.portfolio.subdomain, false)
            const customerPhone = order.shippingAddress?.phone || order.owner.phoneNumber || ''
            const cleanPhone = customerPhone.replace(/\D/g, '')

            return (
              <article key={order.id} className={`admin-order-card status-${order.status}`}>
                {/* Header */}
                <div className="admin-order-header">
                  <div className="admin-order-ref-wrap">
                    <span className="admin-order-ref">KL-{order.id.slice(0, 8).toUpperCase()}</span>
                    <span className="admin-order-date">
                      {new Date(order.createdAt).toLocaleDateString()} at{' '}
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="admin-badges-wrap">
                    <span className={`admin-status-badge ${order.status}`}>
                      <span className="status-dot" />
                      {order.status === 'printing' ? '🖨️ In Print Queue' : order.status.toUpperCase()}
                    </span>

                    <span className={`admin-pay-badge ${order.paymentStatus}`}>
                      {order.paymentStatus === 'paid' ? '✓ Paid' : order.paymentStatus.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Body Details Grid */}
                <div className="admin-order-body">
                  {/* Customer Information */}
                  <div className="admin-body-col">
                    <h5>Customer</h5>
                    <p><strong>{order.shippingAddress?.name || order.owner.name}</strong></p>
                    {order.owner.companyName && (
                      <p style={{ color: '#0369a1', fontWeight: 600 }}>{order.owner.companyName}</p>
                    )}
                    {order.owner.tinNumber && (
                      <p style={{ fontSize: 11, color: 'var(--muted)' }}>TIN: {order.owner.tinNumber}</p>
                    )}
                    <p style={{ fontSize: 11, color: 'var(--muted)' }}>{order.owner.email}</p>
                    {customerPhone && (
                      <div className="admin-contact-links">
                        <a href={`tel:${customerPhone}`} className="admin-contact-btn">
                          📞 {customerPhone}
                        </a>
                        <a
                          href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hi ${order.shippingAddress?.name || order.owner.name}, this is Koolink regards your card order ref KL-${order.id.slice(0, 8).toUpperCase()}.`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="admin-contact-btn whatsapp"
                        >
                          💬 WhatsApp
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Order Specifications */}
                  <div className="admin-body-col">
                    <h5>Package &amp; Cards</h5>
                    <p>
                      <strong>
                        {order.quantity} {order.quantity === 1 ? 'card' : 'cards'}
                      </strong>{' '}
                      · {NFC_CARD_TIER_META[order.tier]?.name ?? order.tier}
                    </p>
                    <p className="admin-price-highlight">
                      {order.totalAmount.toLocaleString()} {order.currency}
                    </p>
                    <p style={{ fontSize: 11 }}>
                      Subdomain:{' '}
                      <a href={subUrl} target="_blank" rel="noreferrer" style={{ color: '#0284c7', fontWeight: 600 }}>
                        {order.portfolio.subdomain}.sewnet.et ↗
                      </a>
                    </p>
                  </div>

                  {/* Payment Details */}
                  <div className="admin-body-col">
                    <h5>Payment Info</h5>
                    <p>
                      Method: <strong>{(order.paymentMethod || 'Manual').toUpperCase()}</strong>
                    </p>
                    {order.paymentReference ? (
                      <p>
                        Ref: <code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: 4 }}>{order.paymentReference}</code>
                      </p>
                    ) : (
                      <p style={{ color: 'var(--muted)', fontSize: 11 }}>No reference entered yet</p>
                    )}
                    {order.paymentVerifiedAt && (
                      <p style={{ fontSize: 10.5, color: '#16a34a' }}>
                        Verified: {new Date(order.paymentVerifiedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {/* Delivery Address */}
                  <div className="admin-body-col">
                    <h5>Delivery Location</h5>
                    {order.shippingAddress ? (
                      <>
                        <p><strong>{order.shippingAddress.addressLine1}</strong></p>
                        {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
                        <p>{order.shippingAddress.city}, {order.shippingAddress.region}</p>
                        <p style={{ fontSize: 11, color: 'var(--muted)' }}>Phone: {order.shippingAddress.phone}</p>
                      </>
                    ) : (
                      <p style={{ color: 'var(--muted)' }}>No address recorded</p>
                    )}
                  </div>
                </div>

                {/* Footer Action Toolbar */}
                <div className="admin-order-footer">
                  <div className="admin-footer-left">
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>Status:</span>
                    <select
                      className="admin-status-select"
                      value={order.status}
                      disabled={isBusy}
                      onChange={(e) => void handleStatusChange(order.id, e.target.value as any)}
                    >
                      <option value="pending">⏳ Pending Review</option>
                      <option value="printing">🖨️ In Print Queue</option>
                      <option value="shipped">🚚 Shipped / Dispatched</option>
                      <option value="delivered">✓ Delivered to Customer</option>
                    </select>

                    <button
                      type="button"
                      className={`admin-action-btn ${order.paymentStatus === 'paid' ? 'secondary' : 'success'}`}
                      disabled={isBusy}
                      onClick={() => void handlePaymentStatusToggle(order)}
                      title="Toggle payment status manually"
                    >
                      {order.paymentStatus === 'paid' ? 'Mark Unpaid' : '✓ Mark Paid'}
                    </button>
                  </div>

                  <div className="admin-footer-actions">
                    <a
                      href={order.shortUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="admin-action-btn secondary"
                      title="Test physical tap link"
                    >
                      🔗 Tap Link
                    </a>

                    <button
                      type="button"
                      className="admin-action-btn primary"
                      disabled={isDownloading}
                      onClick={() => void handleDownloadPrintSvg(order)}
                      title="Generate and download vector SVG print artwork for this order"
                    >
                      {isDownloading ? 'Generating...' : '⬇️ Download Print SVG'}
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
