import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Build the allowed-hosts list:
  //  1. Always allow localhost variants.
  //  2. Add any *.trycloudflare.com or custom domain from VITE_ALLOWED_HOSTS
  //     (comma-separated) or inferred from VITE_API_URL.
  const extraHosts: string[] = []

  if (env.VITE_ALLOWED_HOSTS) {
    extraHosts.push(...env.VITE_ALLOWED_HOSTS.split(',').map((h: string) => h.trim()).filter(Boolean))
  }

  // If VITE_API_URL is a tunnel URL, allow the matching web tunnel hostname too.
  // e.g. https://xyz-api.trycloudflare.com → also allow *.trycloudflare.com
  if (env.VITE_API_URL?.includes('trycloudflare.com')) {
    extraHosts.push('.trycloudflare.com')
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@amalink/types': path.resolve(process.cwd(), '../../packages/types/src/index.ts'),
      },
    },
    server: {
      host: true,          // bind to 0.0.0.0 so cloudflared can reach it
      port: 5173,
      allowedHosts: [
        'localhost',
        '.localhost',
        '127.0.0.1',
        '.vercel.app',
        '.onrender.com',
        '.trycloudflare.com',   // wildcard — covers all quick-tunnel hostnames
        ...extraHosts,
      ],
    },
  }
})
