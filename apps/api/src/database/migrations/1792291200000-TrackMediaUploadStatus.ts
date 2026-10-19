import { MigrationInterface, QueryRunner } from 'typeorm';

export class TrackMediaUploadStatus1792291200000 implements MigrationInterface {
  name = 'TrackMediaUploadStatus1792291200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE media_assets
      ADD COLUMN IF NOT EXISTS is_uploaded boolean NOT NULL DEFAULT true
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE media_assets
      DROP COLUMN IF EXISTS is_uploaded
    `);
  }
}
