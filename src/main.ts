import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AllConfigType, setupSwagger } from '@config';
import { ConfigService } from '@nestjs/config';
import {
  GlobalExceptionFilter,
  HttpLoggingInterceptor,
  TransformResponseInterceptor,
} from '@common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const logger = new Logger('BOOTSTRAP');

  const config = app.get(ConfigService<AllConfigType>);
  const appConfig = config.get('app', { infer: true })!;

  const port = appConfig.port ?? 3000;
  const host = appConfig.host ?? 'localhost';
  const url = appConfig.url ?? `http://${host}:${port}/`;
  const prefix = appConfig.prefix ?? 'api/';
  const globalPrefix = prefix.replace(/\/$/, '');

  app.setGlobalPrefix(globalPrefix);

  // Enable CORS
  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language', 'x-request-id', 'x-signature'],
    credentials: true,
  });

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(
    new HttpLoggingInterceptor(),
    new TransformResponseInterceptor(),
  );
  app.useGlobalPipes(
    new ValidationPipe({ transform: true, whitelist: true }),
  );

  // Swagger
  setupSwagger(app, prefix);

  await app.listen(port, () => {
    logger.log('='.repeat(50));
    logger.log(`🚀 Server muvaffaqiyatli ishga tushdi!`);
    logger.log('='.repeat(50));
    logger.log(`Swagger URL: ${url}${prefix}docs`);
    logger.log(`📍 Environment: ${process.env.NODE_ENV}`);
    logger.log(`🌐 Base URL: ${url}`);
    logger.log(`🔗 API Prefix: ${prefix}`);
    logger.log(`⚡ Port: ${port}`);
    logger.log('='.repeat(50));
  });
}
bootstrap();
