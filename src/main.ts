import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ValidationPipe, ClassSerializerInterceptor, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { json, urlencoded } from 'express';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
    rawBody: true,
    bodyParser: false, // We register body parsers manually below
  });

  const configService = app.get(ConfigService);

  // Global prefix
  app.setGlobalPrefix('api');

  // CORS — must be FIRST so error responses also get CORS headers.
  // Mobile carriers often proxy requests, modifying headers. We must be explicit
  // about allowed methods/headers to survive transparent proxy interference.
  const corsOrigin = configService.get<string>('CORS_ORIGIN', '*');
  app.enableCors({
    origin: corsOrigin === '*'
      ? true  // reflect request origin (works with credentials, unlike literal '*')
      : corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
      'Cache-Control',
      'Pragma',
    ],
    exposedHeaders: ['Content-Disposition'],
    maxAge: 86400, // Cache preflight for 24h — reduces OPTIONS calls on mobile
  });

  // Security headers — crossOriginResourcePolicy loosened so API responses
  // aren't blocked by the browser when loaded from a different origin
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: false,
  }));

  // Response compression
  app.use(compression());

  // Body parsers — only for JSON/urlencoded; multipart is handled by Multer
  // The verify callback stores rawBody for Razorpay webhook signature verification
  app.use(json({
    limit: '5mb',
    verify: (req: any, _res, buf) => { req.rawBody = buf; },
  }));
  app.use(urlencoded({ extended: true, limit: '5mb' }));

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
