import { NODE_ENV } from '@common';
import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  name: process.env.APP_NAME ?? 'BITO-TASK',
  env: process.env.NODE_ENV ?? NODE_ENV.DEVELOPMENT,
  host: process.env.APP_HOST ?? 'localhost',
  port: Number(process.env.APP_PORT ?? 3000),
  url: process.env.APP_URL ?? 'http://localhost:3000/',
  prefix: process.env.APP_PREFIX ?? 'api/',
}));

export type AppConfigType = ReturnType<typeof appConfig>;
