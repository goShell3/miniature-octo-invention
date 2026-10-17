import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerTypeToUsers1750000000000 implements MigrationInterface {
  name = 'AddCustomerTypeToUsers1750000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "customer_type" varchar(32) NOT NULL DEFAULT 'individual';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "customer_type";
    `);
  }
}
