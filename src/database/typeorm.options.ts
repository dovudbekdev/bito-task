import { AllConfigType } from '@config';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function typeormOptions(
  config: ConfigService<AllConfigType>,
): TypeOrmModuleOptions {
  const app = config.get('app', { infer: true })!;
  const db = config.get('db', { infer: true })!;

  if (!db.dbUrl) throw new Error('DB_URL is missing');

  return {
    type: 'postgres',
    url: db.dbUrl,
    ssl: db.ssl ? { rejectUnauthorized: false } : false,
    autoLoadEntities: true,
    synchronize: true,
    logging: false,
    extra: {
      family: 4,
      connectionTimeoutMillis: 30000,
      keepAlive: true,
      max: 5,
    },
  };
}
