import { existsSync } from 'node:fs';
import * as path from 'node:path';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { PostgresDialect } from 'kysely';
import { betterAuth, type BetterAuthPlugin } from 'better-auth';
import { bearer } from 'better-auth/plugins';
import { parseSetCookieHeader } from 'better-auth/cookies';

const oauthTokenRedirectPlugin: BetterAuthPlugin = {
  id: 'oauth-token-redirect',
  hooks: {
    after: [
      {
        matcher: (ctx: { path?: string }) => Boolean(ctx.path && ctx.path.includes('/callback')),
        handler: async (ctx: any) => {
          const location = ctx.context?.responseHeaders?.get('location');
          const setCookie = ctx.context?.responseHeaders?.get('set-cookie');
          if (location && setCookie) {
            const parsed = parseSetCookieHeader(setCookie);
            for (const [name, cookie] of parsed.entries()) {
              if (name.includes('session_token') && cookie.value) {
                try {
                  const url = new URL(location);
                  url.searchParams.set('token', cookie.value);
                  ctx.context.responseHeaders.set('location', url.toString());
                } catch {
                  const sep = location.includes('?') ? '&' : '?';
                  ctx.context.responseHeaders.set(
                    'location',
                    `${location}${sep}token=${encodeURIComponent(cookie.value)}`,
                  );
                }
                break;
              }
            }
          }
        },
      },
    ],
  },
};

const envFile = process.env.DOTENV_CONFIG_PATH ?? [
  path.resolve(process.cwd(), 'apps/api/.env'),
  path.resolve(process.cwd(), '.env'),
].find(existsSync);
if (envFile) dotenv.config({ path: envFile });

const secret = process.env.BETTER_AUTH_SECRET;
if (!secret || secret.includes('replace-with')) {
  throw new Error('Set a unique BETTER_AUTH_SECRET before starting the API');
}

const socialProviders = {
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          prompt: 'select_account' as const,
        },
      }
    : {}),
  ...(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET
    ? {
        facebook: {
          clientId: process.env.FACEBOOK_CLIENT_ID,
          clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
        },
      }
    : {}),
};

const dbUrl = process.env.DATABASE_URL;
const isRemoteDb =
  dbUrl &&
  (dbUrl.includes('supabase.co') ||
    dbUrl.includes('supabase.com') ||
    dbUrl.includes('pooler.supabase.com') ||
    dbUrl.includes('render.com') ||
    dbUrl.includes('neon.tech') ||
    dbUrl.includes('aws'));

const pool = dbUrl
  ? new Pool({
      connectionString: dbUrl,
      ssl:
        process.env.DATABASE_SSL === 'false'
          ? false
          : process.env.DATABASE_SSL === 'true' || isRemoteDb
          ? { rejectUnauthorized: false }
          : undefined,
      max: 10,
    })
  : new Pool({
      host: process.env.DATABASE_HOST ?? '127.0.0.1',
      port: Number(process.env.DATABASE_PORT ?? 5433),
      user: process.env.DATABASE_USERNAME ?? 'amalink',
      password: process.env.DATABASE_PASSWORD ?? 'amalink',
      database: process.env.DATABASE_NAME ?? 'amalink',
      ssl:
        process.env.DATABASE_SSL === 'true'
          ? { rejectUnauthorized: false }
          : undefined,
      max: 10,
    });

const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'https://sewnet.vercel.app',
  'https://miniature-octo-invention-rouge.vercel.app',
  'https://*.vercel.app',
  'https://*.onrender.com',
  'http://*.localhost:*',
  'http://localhost:*',
  'http://127.0.0.1:*',
  'https://www.koo-link.com',
  'https://koo-link.com',
  'https://*.koo-link.com',
  'https://*.koolink.com',
  'https://koolink.com',
  'https://*.koolink.co',
  'https://koolink.co',
  'https://*.koolink.io',
  'https://koolink.io',
];
const envOrigins = (process.env.WEB_ORIGIN ?? '')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);
const trustedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

const isProduction =
  process.env.NODE_ENV === 'production' ||
  process.env.RENDER === 'true' ||
  (process.env.BETTER_AUTH_URL ?? '').startsWith('https://');

export const auth = betterAuth({
  appName: 'Koolink',
  baseURL: (process.env.BETTER_AUTH_URL ?? 'https://sewnet-api.onrender.com').replace(/\/+$/, ''),
  basePath: '/api/auth',
  onAPIError: {
    errorURL: process.env.FRONTEND_URL ?? 'https://www.koo-link.com',
  },
  secret,
  database: new PostgresDialect({ pool }),
  user: {
    modelName: 'users',
    fields: {
      emailVerified: 'email_verified',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    additionalFields: {
      role: {
        type: 'string',
        fieldName: 'role',
        required: false,
        defaultValue: 'user',
        input: true,
        returned: true,
      },
      customerType: {
        type: 'string',
        fieldName: 'customer_type',
        required: false,
        defaultValue: 'individual',
        input: true,
        returned: true,
      },
      companyName: {
        type: 'string',
        fieldName: 'company_name',
        required: false,
        input: true,
        returned: true,
      },
      phoneNumber: {
        type: 'string',
        fieldName: 'phone_number',
        required: false,
        input: true,
        returned: true,
      },
      tinNumber: {
        type: 'string',
        fieldName: 'tin_number',
        required: false,
        input: true,
        returned: true,
      },
      teamSize: {
        type: 'string',
        fieldName: 'team_size',
        required: false,
        input: true,
        returned: true,
      },
    },
  },
  advanced: {
    ipAddress: {
      ipAddressHeaders: ['cf-connecting-ip', 'x-forwarded-for'],
    },
    defaultCookieAttributes: {
      sameSite: isProduction ? 'none' : 'lax',
      secure: isProduction,
    },
    database: {
      generateId: ({ model }) =>
        model === 'user' || model === 'users' ? false : randomUUID(),
    },
  },
  socialProviders,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 72,
    password: {
      hash: (password) => bcrypt.hash(password, 12),
      verify: ({ hash, password }) => bcrypt.compare(password, hash),
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google'],
      requireLocalEmailVerified: false,
    },
    skipStateCookieCheck: true,
  },
  plugins: [bearer(), oauthTokenRedirectPlugin],
  trustedOrigins,
});
