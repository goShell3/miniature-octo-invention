import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentVerificationToNfcOrders1792464000000 implements MigrationInterface {
  name = 'AddPaymentVerificationToNfcOrders1792464000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "nfc_orders"
      ADD COLUMN IF NOT EXISTS "payment_method" varchar(50),
      ADD COLUMN IF NOT EXISTS "payment_status" varchar(50) NOT NULL DEFAULT 'unpaid',
      ADD COLUMN IF NOT EXISTS "payment_reference" varchar(255),
      ADD COLUMN IF NOT EXISTS "cheki_url" text,
      ADD COLUMN IF NOT EXISTS "payment_verified_at" timestamptz,
      ADD COLUMN IF NOT EXISTS "payment_verification_data" jsonb;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "nfc_orders"
      DROP COLUMN IF EXISTS "payment_verification_data",
      DROP COLUMN IF EXISTS "payment_verified_at",
      DROP COLUMN IF EXISTS "cheki_url",
      DROP COLUMN IF EXISTS "payment_reference",
      DROP COLUMN IF EXISTS "payment_status",
      DROP COLUMN IF EXISTS "payment_method";
    `);
  }
}
