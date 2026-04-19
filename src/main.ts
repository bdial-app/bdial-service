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
<<<<<<< HEAD
    origin: '*',
=======
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://localhost:5173', // Vite default port
      'http://localhost:5174',
      'https://localhost:3000',
      'https://localhost:3001',
      'https://localhost:3002',
      'https://localhost:3003',
      'https://localhost:5173',
      'https://localhost:5174',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
>>>>>>> 18c46d0f17fc92615536f9efb765c8a38dc44a9b
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
    .addTag('Providers', 'Business providers (public browse + provider CRUD)')
    .addTag('Verifications', 'Aadhaar & iJamat document submission')
    .addTag('Reviews', 'Provider reviews & ratings')
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
