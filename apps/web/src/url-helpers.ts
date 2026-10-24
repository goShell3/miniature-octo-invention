const RESERVED_SUBDOMAINS = ['www', 'app', 'api', 'admin', 'auth']

export function isAdminRoute(): boolean {
  if (typeof window === 'undefined') return false
  const pathname = window.location.pathname.toLowerCase()
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return true
  const hostname = window.location.hostname.toLowerCase()
  if (hostname.startsWith('admin.')) return true
  const searchParams = new URLSearchParams(window.location.search)
  if (searchParams.get('view') === 'admin') return true
  return false
}

export function getSubdomain(): string | null {
  if (typeof window === 'undefined') return null
  const hostname = window.location.hostname.toLowerCase()
  const searchParams = new URLSearchParams(window.location.search)

  // 1. Explicit query param takes priority (e.g. ?subdomain=robben)
  const querySub = searchParams.get('subdomain')
  if (querySub) {
    const clean = querySub.trim().toLowerCase()
    if (clean && !RESERVED_SUBDOMAINS.includes(clean)) {
      return clean
    }
  }

  // 2. Localhost subdomains: e.g. "robben.localhost"
  if (hostname.endsWith('.localhost')) {
    const sub = hostname.slice(0, -'.localhost'.length)
    if (sub && !RESERVED_SUBDOMAINS.includes(sub)) {
      return sub
    }
  }

  // 3. Plain local hostnames - main app workspace
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
    return null
  }

  // 4. Cloud deployment hostnames (Vercel, Render, Cloudflare, etc.) are the main application
  if (
    hostname.endsWith('.vercel.app') ||
    hostname.endsWith('.onrender.com') ||
    hostname.endsWith('.pages.dev') ||
    hostname.endsWith('.trycloudflare.com')
  ) {
    return null
  }

  // 5. Custom Domain via VITE_ROOT_DOMAIN (e.g. sewnet.et)
  const rootDomain = import.meta.env.VITE_ROOT_DOMAIN?.toLowerCase()
  if (rootDomain && hostname.endsWith(`.${rootDomain}`)) {
    const sub = hostname.slice(0, -(`.${rootDomain}`).length)
    if (sub && !RESERVED_SUBDOMAINS.includes(sub)) {
      return sub
    }
  }

  // 6. Generic Multi-level production domain (e.g. robben.sewnet.et)
  const parts = hostname.split('.')
  if (parts.length > 2) {
    const sub = parts[0]
    if (sub && !RESERVED_SUBDOMAINS.includes(sub)) {
      return sub
    }
  }

  return null
}

export function getPortfolioSubdomainUrl(subdomain: string, preview = false): string {
  if (typeof window === 'undefined') return `?subdomain=${encodeURIComponent(subdomain)}`
  const hostname = window.location.hostname.toLowerCase()
  const port = window.location.port ? `:${window.location.port}` : ''
  const previewParam = preview ? 'preview=true' : ''

  // 1. Localhost: use native <subdomain>.localhost:<port>
  if (hostname.endsWith('.localhost') || hostname === 'localhost' || hostname === '127.0.0.1') {
    const query = previewParam ? `?${previewParam}` : ''
    return `http://${subdomain}.localhost${port}/${query}`
  }

  // 2. Vercel / Render cloud domains: route via query param since wildcards don't exist on *.vercel.app
  if (hostname.endsWith('.vercel.app') || hostname.endsWith('.onrender.com')) {
    const query = `?subdomain=${encodeURIComponent(subdomain)}${preview ? '&preview=true' : ''}`
    return `${window.location.protocol}//${window.location.host}/${query}`
  }

  // 3. Custom domain via VITE_ROOT_DOMAIN (e.g. sewnet.et)
  const rootDomain = import.meta.env.VITE_ROOT_DOMAIN?.toLowerCase()
  if (rootDomain) {
    const query = previewParam ? `?${previewParam}` : ''
    return `${window.location.protocol}//${subdomain}.${rootDomain}${port}/${query}`
  }

  // 4. Custom multi-level domain (e.g. sewnet.et -> robben.sewnet.et)
  const hostParts = hostname.split('.')
  const rootHost = hostParts.length > 2 ? hostParts.slice(1).join('.') : hostname
  const query = previewParam ? `?${previewParam}` : ''
  return `${window.location.protocol}//${subdomain}.${rootHost}${port}/${query}`
}

export function getPortfolioDomainLabel(subdomain: string): string {
  if (typeof window === 'undefined') return subdomain
  const hostname = window.location.hostname.toLowerCase()
  if (hostname.endsWith('.localhost') || hostname === 'localhost' || hostname === '127.0.0.1') {
    const port = window.location.port ? `:${window.location.port}` : ''
    return `${subdomain}.localhost${port}`
  }
  if (hostname.endsWith('.vercel.app') || hostname.endsWith('.onrender.com')) {
    return `${window.location.host}/?subdomain=${subdomain}`
  }
  const rootDomain = import.meta.env.VITE_ROOT_DOMAIN?.toLowerCase()
  if (rootDomain) {
    return `${subdomain}.${rootDomain}`
  }
  const hostParts = hostname.split('.')
  const rootHost = hostParts.length > 2 ? hostParts.slice(1).join('.') : hostname
  return `${subdomain}.${rootHost}`
}
