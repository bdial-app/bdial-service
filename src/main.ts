import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api');

  // CORS
  app.enableCors({
    origin: '*',
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Bohri Connect API')
    .setDescription(
      'REST API for Bohri Connect — a women-empowerment-centric community business directory for Dawoodi Bohra community.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'OTP-based authentication')
    .addTag('Admin Auth', 'Admin OTP-based authentication')
    .addTag('Users', 'User profile management')
    .addTag('Categories', 'Service categories')
    .addTag('Listings', 'Business listings (public browse + provider CRUD)')
    .addTag('Verifications', 'Aadhaar & iJamat document submission')
    .addTag('Reviews', 'Listing reviews & ratings')
    .addTag('Admin', 'Admin panel operations')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3002;
  await app.listen(port);
  console.log(`🚀 Bohri Connect API running on http://localhost:${port}/api`);
  console.log(`📖 Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
