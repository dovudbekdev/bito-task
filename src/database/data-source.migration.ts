import { config } from 'dotenv';
import { DataSource } from 'typeorm';

config({ path: '.env' });
config({ path: '.env.development.local', override: true });

const dbUrl = process.env.DB_URL;
if (!dbUrl) {
  throw new Error('DB_URL is missing. Set it in .env or .env.development.local');
}

const dbSsl = process.env.DB_SSL === 'true';
const isCompiled = __filename.endsWith('.js');

export const MigrationDataSource = new DataSource({
  type: 'postgres',
  url: dbUrl,
  ssl: dbSsl ? { rejectUnauthorized: false } : false,
  entities: [],
  migrations: [
    isCompiled
      ? 'dist/database/migrations/*.js'
      : 'src/database/migrations/*.ts',
  ],
  migrationsTableName: 'typeorm_migrations',
  synchronize: false,
  logging: false,
});
