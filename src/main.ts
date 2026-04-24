import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ValidationPipe, ClassSerializerInterceptor, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { json } from 'express';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const configService = app.get(ConfigService);

  // Global prefix
  app.setGlobalPrefix('api');

  // Security headers
  app.use(helmet());

  // Response compression
  app.use(compression());

  // Body size limit
  app.use(json({ limit: '1mb' }));

  // CORS — restrict to configured origins
  const corsOrigin = configService.get<string>('CORS_ORIGIN', '*');
  app.enableCors({
    origin: corsOrigin === '*' ? '*' : corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Serialization — respects @Exclude() decorators on entities
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Global exception filter — sanitizes error responses in production
  app.useGlobalFilters(new AllExceptionsFilter(configService));

  // Graceful shutdown
  app.enableShutdownHooks();

  // Swagger — disable in production
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  if (nodeEnv !== 'production') {
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
  }

  const port = configService.get<number>('PORT', 3001);
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`Bohri Connect API running on http://localhost:${port}/api`);
  if (nodeEnv !== 'production') {
    logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
  }
}

bootstrap();
