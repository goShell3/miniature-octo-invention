import { createAuthClient } from 'better-auth/client'

// baseURL points to the API root.
// basePath must match the server's basePath in better-auth.ts ('/api/auth').
// The client appends basePath to baseURL for all auth requests.
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  basePath: '/api/auth',
})
