// src/config/swagger.config.ts
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';
import { AppConfigType } from './app.config';

export const setupSwagger = (
  app: INestApplication,
  prefix: string,
) => {
  const config = new DocumentBuilder()
    .setTitle('BITO-TASK API')
    .setDescription('API documentation for BITO-TASK application')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(prefix + 'docs', app, document);
};
