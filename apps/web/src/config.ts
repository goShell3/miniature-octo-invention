/**
 * Dynamic API URL configuration.
 *
 * 1. Checks explicit VITE_API_URL environment variable.
 * 2. If running in browser on localhost or 127.0.0.1, defaults to local API: http://localhost:3000
 * 3. If running on cloud/production (e.g. sewnet.vercel.app, *.vercel.app, custom domain), defaults to:
 *    https://sewnet-api.onrender.com
 * 4. At Vite build-time, uses production API when mode is PROD, otherwise localhost.
 */
export function getApiUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL?.trim()
  if (envUrl) {
    return envUrl.replace(/\/+$/, '')
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname.toLowerCase()
    const isLocal =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.endsWith('.localhost')

    if (isLocal) {
      return 'http://localhost:3000'
    }

    return 'https://sewnet-api.onrender.com'
  }

  return import.meta.env.PROD
    ? 'https://sewnet-api.onrender.com'
    : 'http://localhost:3000'
}

export const API_URL = getApiUrl()

export function resolveMediaUrl(url?: string): string | undefined {
  if (!url) return undefined
  if (url.startsWith('blob:')) {
    // Only permit blob: URLs if they originate from the current document origin.
    // Cross-origin blob URLs are strictly blocked by the browser's Same-Origin Policy.
    if (typeof window !== 'undefined' && url.startsWith(`blob:${window.location.origin}/`)) {
      return url
    }
    return undefined
  }
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:')
  ) {
    return url
  }
  const cleanUrl = url.startsWith('/') ? url : `/${url}`
  return `${API_URL}${cleanUrl}`
}
