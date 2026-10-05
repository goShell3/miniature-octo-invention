import { MigrationInterface, QueryRunner } from 'typeorm';

export class UnifyBetterAuthUsers1790726400000 implements MigrationInterface {
  name = 'UnifyBetterAuthUsers1790726400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email varchar NOT NULL UNIQUE,
        password_hash text,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS name text,
        ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS image text,
        ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS account (
        id text PRIMARY KEY,
        "accountId" text NOT NULL,
        "providerId" text NOT NULL,
        "userId" uuid NOT NULL,
        "accessToken" text,
        "refreshToken" text,
        "idToken" text,
        "accessTokenExpiresAt" timestamptz,
        "refreshTokenExpiresAt" timestamptz,
        scope text,
        password text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS session (
        id text PRIMARY KEY,
        "expiresAt" timestamptz NOT NULL,
        token text NOT NULL UNIQUE,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "ipAddress" text,
        "userAgent" text,
        "userId" uuid NOT NULL
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS verification (
        id text PRIMARY KEY,
        identifier text NOT NULL,
        value text NOT NULL,
        "expiresAt" timestamptz NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      UPDATE users
      SET name = split_part(email, '@', 1)
      WHERE name IS NULL OR name = ''
    `);

    await queryRunner.query(`
      DO $$
      DECLARE constraint_row record;
      BEGIN
        FOR constraint_row IN
          SELECT conname
          FROM pg_constraint
          WHERE contype = 'f'
            AND conrelid IN ('account'::regclass, 'session'::regclass)
        LOOP
          EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I',
            CASE
              WHEN EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conrelid = 'account'::regclass AND conname = constraint_row.conname
              ) THEN 'account'::regclass
              ELSE 'session'::regclass
            END,
            constraint_row.conname);
        END LOOP;
      END $$
    `);

    if (await queryRunner.hasTable('user')) {
      await queryRunner.query(`
        CREATE TEMP TABLE better_auth_user_map (
          auth_user_id text PRIMARY KEY,
          app_user_id uuid NOT NULL
        ) ON COMMIT DROP
      `);
      await queryRunner.query(`
        INSERT INTO better_auth_user_map (auth_user_id, app_user_id)
        SELECT legacy.id,
          COALESCE(
            existing.id,
            CASE
              WHEN legacy.id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                AND NOT EXISTS (SELECT 1 FROM users occupied WHERE occupied.id = legacy.id::uuid)
              THEN legacy.id::uuid
              ELSE gen_random_uuid()
            END
          )
        FROM "user" legacy
        LEFT JOIN users existing ON lower(existing.email) = lower(legacy.email)
      `);
      await queryRunner.query(`
        INSERT INTO users (id, email, name, email_verified, image, created_at, updated_at)
        SELECT mapping.app_user_id, legacy.email, legacy.name,
          legacy."emailVerified", legacy.image, legacy."createdAt", legacy."updatedAt"
        FROM "user" legacy
        JOIN better_auth_user_map mapping ON mapping.auth_user_id = legacy.id
        ON CONFLICT (id) DO UPDATE SET
          name = COALESCE(NULLIF(users.name, ''), EXCLUDED.name),
          email_verified = users.email_verified OR EXCLUDED.email_verified,
          image = COALESCE(users.image, EXCLUDED.image),
          updated_at = GREATEST(users.updated_at, EXCLUDED.updated_at)
      `);
      await queryRunner.query(`
        UPDATE account auth_account
        SET "userId" = mapping.app_user_id::text
        FROM better_auth_user_map mapping
        WHERE auth_account."userId" = mapping.auth_user_id
      `);
      await queryRunner.query(`
        UPDATE session auth_session
        SET "userId" = mapping.app_user_id::text
        FROM better_auth_user_map mapping
        WHERE auth_session."userId" = mapping.auth_user_id
      `);
        await queryRunner.query('DROP TABLE "user"');
    }

    await queryRunner.query(`
      ALTER TABLE account ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid;
      ALTER TABLE session ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid;
      ALTER TABLE users ALTER COLUMN name SET NOT NULL;
      ALTER TABLE users ALTER COLUMN updated_at SET NOT NULL;
      ALTER TABLE account ADD CONSTRAINT account_userId_fkey
        FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
      ALTER TABLE session ADD CONSTRAINT session_userId_fkey
        FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
      CREATE INDEX IF NOT EXISTS "account_userId_idx" ON account ("userId");
      CREATE INDEX IF NOT EXISTS "session_userId_idx" ON session ("userId");
      CREATE INDEX IF NOT EXISTS verification_identifier_idx ON verification (identifier);
    `);

    await queryRunner.query(`
      INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
      SELECT gen_random_uuid()::text, users.id::text, 'credential', users.id,
        users.password_hash, users.created_at, users.updated_at
      FROM users
      WHERE users.password_hash IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM account existing
          WHERE existing."providerId" = 'credential'
            AND existing."accountId" = users.id::text
        )
    `);
    await queryRunner.query('ALTER TABLE users DROP COLUMN IF EXISTS password_hash');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text`);
    await queryRunner.query(`
      UPDATE users app_user
      SET password_hash = credential.password
      FROM account credential
      WHERE credential."providerId" = 'credential'
        AND credential."accountId" = app_user.id::text
    `);

    await queryRunner.query(`
      DO $$
      DECLARE constraint_row record;
      BEGIN
        FOR constraint_row IN
          SELECT conname
          FROM pg_constraint
          WHERE contype = 'f'
            AND conrelid IN ('account'::regclass, 'session'::regclass)
        LOOP
          EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I',
            CASE
              WHEN EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conrelid = 'account'::regclass AND conname = constraint_row.conname
              ) THEN 'account'::regclass
              ELSE 'session'::regclass
            END,
            constraint_row.conname);
        END LOOP;
      END $$
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user" (
        id text PRIMARY KEY,
        name text NOT NULL,
        email text NOT NULL UNIQUE,
        "emailVerified" boolean NOT NULL DEFAULT false,
        image text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      INSERT INTO "user" (id, name, email, "emailVerified", image, "createdAt", "updatedAt")
      SELECT id::text, name, email, email_verified, image, created_at, updated_at
      FROM users
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        "emailVerified" = EXCLUDED."emailVerified",
        image = EXCLUDED.image,
        "updatedAt" = EXCLUDED."updatedAt"
    `);
    await queryRunner.query(`
      UPDATE account SET "userId" = "user".id
      FROM "user" WHERE account."userId"::text = "user".id
    `);
    await queryRunner.query(`
      UPDATE session SET "userId" = "user".id
      FROM "user" WHERE session."userId"::text = "user".id
    `);
    await queryRunner.query(`
      ALTER TABLE account ALTER COLUMN "userId" TYPE text USING "userId"::text;
      ALTER TABLE session ALTER COLUMN "userId" TYPE text USING "userId"::text;
      ALTER TABLE account ADD CONSTRAINT account_userId_fkey
        FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
      ALTER TABLE session ADD CONSTRAINT session_userId_fkey
        FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
      ALTER TABLE users DROP COLUMN IF EXISTS email_verified;
      ALTER TABLE users DROP COLUMN IF EXISTS name;
      ALTER TABLE users DROP COLUMN IF EXISTS image;
      ALTER TABLE users DROP COLUMN IF EXISTS updated_at;
    `);
  }
}
