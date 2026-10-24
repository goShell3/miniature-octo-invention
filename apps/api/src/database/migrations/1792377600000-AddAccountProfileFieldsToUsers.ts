import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAccountProfileFieldsToUsers1792377600000 implements MigrationInterface {
  name = 'AddAccountProfileFieldsToUsers1792377600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "company_name" varchar(150),
      ADD COLUMN IF NOT EXISTS "phone_number" varchar(50),
      ADD COLUMN IF NOT EXISTS "tin_number" varchar(50),
      ADD COLUMN IF NOT EXISTS "team_size" varchar(50);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "company_name",
      DROP COLUMN IF EXISTS "phone_number",
      DROP COLUMN IF EXISTS "tin_number",
      DROP COLUMN IF EXISTS "team_size";
    `);
  }
}
