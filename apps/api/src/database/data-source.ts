import * as path from 'node:path';
import * as dotenv from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import { CardTapEntity } from './entities/card-tap.entity';
import { MediaAssetEntity } from './entities/media-asset.entity';
import { NfcOrderEntity } from './entities/nfc-order.entity';
import { PortfolioContentEntity } from './entities/portfolio-content.entity';
import { PortfolioEntity } from './entities/portfolio.entity';
import { UserEntity } from './entities/user.entity';

dotenv.config({
  path: process.env.DOTENV_CONFIG_PATH ?? path.resolve(__dirname, '../../.env'),
});

const dbUrl = process.env.DATABASE_URL;
const isRemoteDb =
  dbUrl &&
  (dbUrl.includes('supabase.co') ||
    dbUrl.includes('supabase.com') ||
    dbUrl.includes('pooler.supabase.com') ||
    dbUrl.includes('render.com') ||
    dbUrl.includes('neon.tech') ||
    dbUrl.includes('aws'));

const sslOption =
  process.env.DATABASE_SSL === 'false'
    ? false
    : process.env.DATABASE_SSL === 'true' || isRemoteDb
    ? { rejectUnauthorized: false }
    : false;

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  ...(dbUrl
    ? {
        url: dbUrl,
        ssl: sslOption,
        extra: sslOption ? { ssl: { rejectUnauthorized: false } } : undefined,
      }
    : {
        host: process.env.DATABASE_HOST ?? 'localhost',
        username: process.env.DATABASE_USERNAME ?? 'amalink',
        password: process.env.DATABASE_PASSWORD ?? 'amalink',
        port: Number(process.env.DATABASE_PORT ?? 5432),
        database: process.env.DATABASE_NAME ?? 'amalink',
        ssl: sslOption,
        extra: sslOption ? { ssl: { rejectUnauthorized: false } } : undefined,
      }),
  entities: [
    UserEntity,
    PortfolioEntity,
    PortfolioContentEntity,
    MediaAssetEntity,
    NfcOrderEntity,
    CardTapEntity,
  ],
  migrations: [path.resolve(__dirname, 'migrations/*.{js,ts}')],
  migrationsRun: process.env.AUTO_MIGRATE === 'true',
  synchronize: false,
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
