#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# tunnel.sh  –  Start Cloudflare Tunnel(s) for Amalink
#
# Usage:
#   ./tunnel.sh            # quick tunnels (temporary hostnames, no login)
#   ./tunnel.sh named      # named tunnel  (permanent hostname, requires login)
#
# Quick mode opens TWO separate quick-tunnel processes and prints both URLs.
# Named mode reads .cloudflared/config.yml — fill in TUNNEL-ID & domain first.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

MODE="${1:-quick}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_ENV="$REPO_ROOT/apps/api/.env"
WEB_ENV="$REPO_ROOT/apps/web/.env"

# ── Helper ────────────────────────────────────────────────────────────────────
update_env() {
  local file="$1" key="$2" value="$3"
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$file"
  else
    echo "${key}=${value}" >> "$file"
  fi
}

# ── Named tunnel ──────────────────────────────────────────────────────────────
if [[ "$MODE" == "named" ]]; then
  CONFIG="$REPO_ROOT/.cloudflared/config.yml"
  if grep -q '<TUNNEL-ID>' "$CONFIG"; then
    echo "✖  .cloudflared/config.yml still has placeholder values."
    echo "   Run: cloudflared tunnel create amalink"
    echo "   Then fill in the TUNNEL-ID and YOUR-DOMAIN in $CONFIG"
    exit 1
  fi
  echo "▶  Starting named tunnel from $CONFIG"
  exec cloudflared tunnel --config "$CONFIG" run
fi

# ── Quick tunnel mode (default) ───────────────────────────────────────────────
echo ""
echo "▶  Starting Cloudflare Quick Tunnels …"
echo "   (hostnames are TEMPORARY — they change on every restart)"
echo ""

# Temp files to capture the hostname output
API_URL_FILE=$(mktemp)
WEB_URL_FILE=$(mktemp)

trap 'kill $(jobs -p) 2>/dev/null; rm -f "$API_URL_FILE" "$WEB_URL_FILE"' EXIT

# Start API tunnel in background, capture the *.trycloudflare.com URL
cloudflared tunnel --url http://localhost:3000 2>&1 | tee /tmp/cf-api.log | \
  grep --line-buffered -oP 'https://[a-z0-9-]+\.trycloudflare\.com' | head -1 > "$API_URL_FILE" &
CF_API_PID=$!

# Start Web tunnel in background
cloudflared tunnel --url http://localhost:5173 2>&1 | tee /tmp/cf-web.log | \
  grep --line-buffered -oP 'https://[a-z0-9-]+\.trycloudflare\.com' | head -1 > "$WEB_URL_FILE" &
CF_WEB_PID=$!

echo "   Waiting for tunnel URLs (up to 30 s) …"
for i in $(seq 1 30); do
  API_URL=$(cat "$API_URL_FILE" 2>/dev/null || true)
  WEB_URL=$(cat "$WEB_URL_FILE" 2>/dev/null || true)
  [[ -n "$API_URL" && -n "$WEB_URL" ]] && break
  sleep 1
done

if [[ -z "$API_URL" || -z "$WEB_URL" ]]; then
  echo ""
  echo "✖  Could not detect tunnel URLs automatically."
  echo "   Check /tmp/cf-api.log and /tmp/cf-web.log for the assigned hostnames."
  echo "   Then manually set:"
  echo "     BETTER_AUTH_URL=<api-url>     in apps/api/.env"
  echo "     WEB_ORIGIN=<web-url>          in apps/api/.env"
  echo "     PUBLIC_BASE_URL=<api-url>     in apps/api/.env"
  echo "     VITE_API_URL=<api-url>        in apps/web/.env"
  wait
  exit 1
fi

echo ""
echo "┌──────────────────────────────────────────────────────────┐"
echo "│  Amalink Cloudflare Quick Tunnels                        │"
echo "├──────────────────────────────────────────────────────────┤"
printf "│  API  %-52s│\n" "$API_URL"
printf "│  Web  %-52s│\n" "$WEB_URL"
echo "└──────────────────────────────────────────────────────────┘"
echo ""
echo "▶  Patching env files …"

# Patch apps/api/.env
[[ -f "$API_ENV" ]] || cp "$REPO_ROOT/apps/api/.env.example" "$API_ENV"
update_env "$API_ENV" "BETTER_AUTH_URL"  "$API_URL"
update_env "$API_ENV" "WEB_ORIGIN"       "$WEB_URL"
update_env "$API_ENV" "PUBLIC_BASE_URL"  "$API_URL"

# Patch apps/web/.env
[[ -f "$WEB_ENV" ]] || touch "$WEB_ENV"
update_env "$WEB_ENV" "VITE_API_URL" "$API_URL"

echo "   ✔  apps/api/.env  → BETTER_AUTH_URL, WEB_ORIGIN, PUBLIC_BASE_URL"
echo "   ✔  apps/web/.env  → VITE_API_URL"
echo ""
echo "⚠  Restart both dev servers (npm run dev:api / npm run dev:web)"
echo "   so they pick up the updated env values."
echo ""
echo "   Press Ctrl-C to stop the tunnels."
echo ""

wait
