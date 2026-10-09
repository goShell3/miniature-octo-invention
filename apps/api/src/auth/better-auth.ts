import { existsSync } from 'node:fs';
import * as path from 'node:path';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { PostgresDialect } from 'kysely';
import { betterAuth } from 'better-auth';

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
];
const envOrigins = (process.env.WEB_ORIGIN ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const trustedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

export const auth = betterAuth({
  appName: 'Sewnet',
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  basePath: '/api/auth',
  secret,
  database: new PostgresDialect({ pool }),
  user: {
    modelName: 'users',
    fields: {
      emailVerified: 'email_verified',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
    database: {
      generateId: ({ model }) =>
        model === 'user' || model === 'users' ? false : randomUUID(),
    },
  },
  socialProviders,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    maxPasswordLength: 72,
    password: {
      hash: (password) => bcrypt.hash(password, 12),
      verify: ({ hash, password }) => bcrypt.compare(password, hash),
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      allowMultipleAccountsPerUser: false,
      trustedProviders: ["google"],
      emailVerification: false,
    },
  },
  trustedOrigins,
});
