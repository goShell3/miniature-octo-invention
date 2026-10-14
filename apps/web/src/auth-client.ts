import { createAuthClient } from 'better-auth/client'
import { API_URL } from './config'

// baseURL points to the API root.
// basePath must match the server's basePath in better-auth.ts ('/api/auth').
// The client appends basePath to baseURL for all auth requests.
export const authClient = createAuthClient({
  baseURL: API_URL,
  basePath: '/api/auth',
})
