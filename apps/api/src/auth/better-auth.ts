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

export const auth = betterAuth({
  appName: 'Sewnet',
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  basePath: '/api/auth',
  secret,
  database: new PostgresDialect({
    pool: new Pool({
      host: process.env.DATABASE_HOST ?? '127.0.0.1',
      port: Number(process.env.DATABASE_PORT ?? 5433),
      user: process.env.DATABASE_USERNAME ?? 'amalink',
      password: process.env.DATABASE_PASSWORD ?? 'amalink',
      database: process.env.DATABASE_NAME ?? 'amalink',
      max: 10,
    }),
  }),
  user: {
    modelName: 'users',
    fields: {
      emailVerified: 'email_verified',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
  advanced: {
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
  trustedOrigins: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175',
    'http://localhost:5173',
    'https://observer-portions-charger-polished.trycloudflare.com',
    'https://ccd-cigarette-wonderfull-villa.trycloudflare.com', 
  ],
});
