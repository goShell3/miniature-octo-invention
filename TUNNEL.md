# Cloudflare Tunnel — Amalink

Expose the local dev stack (API on `:3000`, web on `:5173`) over the internet
via Cloudflare Tunnel — useful for testing auth callbacks, NFC short-links, and
mobile access without deploying.

Two modes are available:

| Mode | Hostname | Login required | Persistent URL |
|------|----------|---------------|----------------|
| **Quick tunnel** | random `*.trycloudflare.com` | ✖ No | ✖ Changes on restart |
| **Named tunnel** | your own domain | ✔ Yes | ✔ Permanent |

---

## Prerequisites

```sh
# cloudflared must be installed
cloudflared version   # should print 2026.x.x or newer
```

Both dev servers must already be running:

```sh
npm run dev:api   # NestJS on :3000
npm run dev:web   # Vite   on :5173
```

---

## Option A — Quick Tunnel (no login, temp URLs)

Run the helper script from the repo root:

```sh
./tunnel.sh
```

The script will:
1. Start two `cloudflared` quick-tunnel processes.
2. Detect the assigned `*.trycloudflare.com` hostnames.
3. **Automatically patch** `apps/api/.env` and `apps/web/.env` with those URLs.
4. Print a summary table.

After the script patches the env files you **must restart both dev servers**
so the new values are picked up:

```sh
# in a separate terminal
npm run dev:api
npm run dev:web
```

The script keeps running in the foreground to hold the tunnels open. Press
**Ctrl-C** to stop.

> ⚠ Because the hostname changes on every restart, OAuth redirect URIs (Google,
> Facebook) need to be updated in the provider console each time.

---

## Option B — Named Tunnel (permanent hostname)

### 1. Log in to Cloudflare

```sh
cloudflared tunnel login
```

A browser window opens. Authorise cloudflared for your domain. A credentials
file is saved to `~/.cloudflared/cert.pem`.

### 2. Create the tunnel

```sh
cloudflared tunnel create amalink
```

Note the UUID printed (e.g. `a1b2c3d4-…`). A JSON credentials file is saved to
`~/.cloudflared/<TUNNEL-ID>.json`.

### 3. Edit `.cloudflared/config.yml`

Open `.cloudflared/config.yml` (in the repo root) and replace the placeholders:

```yaml
tunnel: a1b2c3d4-…          # ← your tunnel UUID
credentials-file: /home/vortex/.cloudflared/a1b2c3d4-….json

ingress:
  - hostname: api.amalink.dev    # ← your domain
    service: http://localhost:3000

  - hostname: app.amalink.dev    # ← your domain
    service: http://localhost:5173

  - service: http_status:404
```

### 4. Create DNS records

```sh
cloudflared tunnel route dns amalink api.amalink.dev
cloudflared tunnel route dns amalink app.amalink.dev
```

### 5. Update env files

**`apps/api/.env`**

```
BETTER_AUTH_URL=https://api.amalink.dev
WEB_ORIGIN=https://app.amalink.dev
PUBLIC_BASE_URL=https://api.amalink.dev
```

**`apps/web/.env`**

```
VITE_API_URL=https://api.amalink.dev
```

### 6. Update `better-auth.ts` trusted origins

Add your domain to the `trustedOrigins` array in
`apps/api/src/auth/better-auth.ts`:

```ts
trustedOrigins: [
  // existing localhost entries …
  'https://app.amalink.dev',
],
```

### 7. Run the tunnel

```sh
./tunnel.sh named
```

Or directly:

```sh
cloudflared tunnel --config .cloudflared/config.yml run
```

---

## OAuth redirect URIs

When using a tunnel URL as the public address, update the authorized redirect
URIs in each provider console:

| Provider | URI to add |
|----------|-----------|
| Google | `https://api.amalink.dev/api/auth/callback/google` |
| Facebook | `https://api.amalink.dev/api/auth/callback/facebook` |

For quick tunnels substitute the current `*.trycloudflare.com` API hostname.

---

## Environment variable reference

### `apps/api/.env`

| Variable | Purpose | Tunnel value |
|----------|---------|-------------|
| `BETTER_AUTH_URL` | Base URL better-auth uses for callbacks | API tunnel URL |
| `WEB_ORIGIN` | CORS allowed origin | Web tunnel URL |
| `PUBLIC_BASE_URL` | NFC short-link base URL | API tunnel URL |

### `apps/web/.env`

| Variable | Purpose | Tunnel value |
|----------|---------|-------------|
| `VITE_API_URL` | API base URL used by `apiRequest()` and `authClient` | API tunnel URL |
| `VITE_ALLOWED_HOSTS` | Extra hostnames Vite dev server accepts | Web tunnel hostname |

---

## Troubleshooting

**Vite returns "Invalid Host header"**
The web tunnel hostname is not in the `allowedHosts` list. Add it to
`VITE_ALLOWED_HOSTS` in `apps/web/.env` and restart `npm run dev:web`.

**CORS errors in the browser**
`WEB_ORIGIN` in `apps/api/.env` doesn't match the web tunnel URL. Check for
trailing slashes or `http` vs `https` mismatches, then restart `npm run dev:api`.

**`better-auth` rejects the session / CSRF errors**
`BETTER_AUTH_URL` must match the URL the browser actually uses to call the API.
Update it and restart `npm run dev:api`.

**Quick tunnel script can't detect the URL**
Check `/tmp/cf-api.log` and `/tmp/cf-web.log` for the assigned hostnames and
patch the env files manually.
