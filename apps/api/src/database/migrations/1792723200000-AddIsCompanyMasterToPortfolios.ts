import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsCompanyMasterToPortfolios1792723200000 implements MigrationInterface {
  name = 'AddIsCompanyMasterToPortfolios1792723200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "portfolios"
      ADD COLUMN IF NOT EXISTS "is_company_master" boolean NOT NULL DEFAULT false;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "portfolios"
      DROP COLUMN IF EXISTS "is_company_master";
    `);
  }
}
