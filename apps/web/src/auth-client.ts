import { createAuthClient } from 'better-auth/client'
import { API_URL } from './config'

const TOKEN_KEY = 'koolink.session_token'

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setAuthToken(token: string | null): void {
  if (typeof window === 'undefined') return
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_KEY, token)
    } else {
      window.localStorage.removeItem(TOKEN_KEY)
    }
  } catch {}
}

export const authClient = createAuthClient({
  baseURL: API_URL,
  basePath: '/api/auth',
  fetchOptions: {
    onRequest(ctx) {
      const token = getAuthToken()
      if (token) {
        ctx.headers.set('authorization', 'Bearer ' + token)
      }
      return ctx
    },
    onResponse(ctx) {
      const token = ctx.response.headers.get('set-auth-token')
      if (token) {
        setAuthToken(token)
      }
    },
  },
})
