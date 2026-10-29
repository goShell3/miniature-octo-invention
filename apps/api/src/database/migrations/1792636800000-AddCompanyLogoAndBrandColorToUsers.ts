import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompanyLogoAndBrandColorToUsers1792636800000 implements MigrationInterface {
  name = 'AddCompanyLogoAndBrandColorToUsers1792636800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "company_logo_url" text,
      ADD COLUMN IF NOT EXISTS "brand_color" varchar(16);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "company_logo_url",
      DROP COLUMN IF EXISTS "brand_color";
    `);
  }
}
