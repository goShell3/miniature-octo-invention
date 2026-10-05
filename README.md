# Amalink Portfolio Builder

A portfolio-builder platform with a React/Vite editor and a NestJS REST API. Public portfolios are intended to be rendered by the API and served on user subdomains.

## Requirements

- Node.js 20.19 or newer
- npm 10 or newer
- PostgreSQL will be needed when database persistence is added

## Install and run

```sh
npm install
Copy-Item apps/api/.env.example apps/api/.env
docker compose up -d db
npm run dev:api
npm run dev:web
```

The web app and API run as separate processes. PostgreSQL is provided for local development by `compose.yaml`. The example database credentials are for local development only. `DB_SYNCHRONIZE=true` is honored outside production; production deployments must use reviewed migrations instead.

The API includes `POST /auth/signup`, `POST /auth/login`, and bearer-token-protected `GET /auth/me`. Passwords must be at least 12 characters, and access tokens expire after 15 minutes. Set a private, randomly generated `JWT_SECRET` in `apps/api/.env` before running the API; never use the example placeholder in a deployed environment.

To stop the local database, run `docker compose down`. Add `-v` only when you intend to delete the local database volume and all stored data.

## Workspace layout

- `apps/web`: React + Vite builder application
- `apps/api`: NestJS REST API
- `packages/types`: shared frontend/backend domain types

## Deployment notes

This repository is an application foundation, not a production deployment. Production publishing requires wildcard DNS and a reverse proxy/CDN. Object storage credentials, authentication hardening, queue workers, NFC vendor/payment integration, and domain ownership verification must be configured before enabling those workflows.