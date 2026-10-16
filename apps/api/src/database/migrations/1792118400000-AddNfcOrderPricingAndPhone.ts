import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNfcOrderPricingAndPhone1792118400000 implements MigrationInterface {
  name = 'AddNfcOrderPricingAndPhone1792118400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE nfc_orders
        ADD COLUMN IF NOT EXISTS tier varchar NOT NULL DEFAULT 'individual',
        ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1,
        ADD COLUMN IF NOT EXISTS unit_price integer NOT NULL DEFAULT 2999
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE nfc_orders
        DROP COLUMN IF EXISTS unit_price,
        DROP COLUMN IF EXISTS quantity,
        DROP COLUMN IF EXISTS tier
    `);
  }
}