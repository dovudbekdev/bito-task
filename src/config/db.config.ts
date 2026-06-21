import { registerAs } from '@nestjs/config';

export const dbConfig = registerAs('db', () => ({
  dbUrl: process.env.DB_URL,
  ssl: (process.env.DB_SSL ?? 'false') === 'true',
}));

export type DbConfigType = ReturnType<typeof dbConfig>;
