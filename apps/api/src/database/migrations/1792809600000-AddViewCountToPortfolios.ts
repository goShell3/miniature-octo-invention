import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddViewCountToPortfolios1792809600000 implements MigrationInterface {
  name = 'AddViewCountToPortfolios1792809600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "portfolios"
      ADD COLUMN IF NOT EXISTS "view_count" integer NOT NULL DEFAULT 0;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "portfolios"
      DROP COLUMN IF EXISTS "view_count";
    `);
  }
}
