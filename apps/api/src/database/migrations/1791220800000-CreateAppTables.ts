import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAppTables1791220800000 implements MigrationInterface {
  name = 'CreateAppTables1791220800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // portfolios
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolios (
        id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "owner_id"    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subdomain     varchar NOT NULL UNIQUE,
        custom_domain varchar UNIQUE,
        status        varchar NOT NULL DEFAULT 'draft',
        theme         jsonb,
        created_at    timestamptz NOT NULL DEFAULT now(),
        updated_at    timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS portfolios_owner_idx ON portfolios ("owner_id")
    `);

    // portfolio_content (versioned blocks per portfolio)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolio_content (
        id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "portfolioId" uuid NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
        version      integer NOT NULL,
        blocks       jsonb NOT NULL,
        is_published boolean NOT NULL DEFAULT false,
        created_at   timestamptz NOT NULL DEFAULT now(),
        UNIQUE ("portfolioId", version)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS portfolio_content_portfolio_idx ON portfolio_content ("portfolioId")
    `);

    // nfc_orders
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS nfc_orders (
        id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "portfolioId"     uuid NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
        short_link_code   varchar NOT NULL UNIQUE,
        status            varchar NOT NULL DEFAULT 'pending',
        shipping_address  jsonb NOT NULL,
        created_at        timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS nfc_orders_portfolio_idx ON nfc_orders ("portfolioId")
    `);

    // card_taps
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS card_taps (
        id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "orderId"  uuid NOT NULL REFERENCES nfc_orders(id) ON DELETE CASCADE,
        tapped_at  timestamptz NOT NULL DEFAULT now(),
        user_agent text,
        rough_geo  varchar
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS card_taps_order_idx ON card_taps ("orderId")
    `);

    // media_assets
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS media_assets (
        id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "portfolioId" uuid NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
        object_key   text NOT NULL,
        content_type text NOT NULL,
        type         varchar NOT NULL DEFAULT 'image',
        created_at   timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS media_assets_portfolio_idx ON media_assets ("portfolioId")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS media_assets`);
    await queryRunner.query(`DROP TABLE IF EXISTS card_taps`);
    await queryRunner.query(`DROP TABLE IF EXISTS nfc_orders`);
    await queryRunner.query(`DROP TABLE IF EXISTS portfolio_content`);
    await queryRunner.query(`DROP TABLE IF EXISTS portfolios`);
  }
}
