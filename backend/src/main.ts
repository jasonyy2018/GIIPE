// Import polyfills first
import './polyfills';

import { NestFactory, Reflector } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { SecurityConfigService } from './common/config/security.config';
import { Logger } from '@nestjs/common';
import { checkEnvironment } from './pre-start';

async function bootstrap() {
  // Run critical environment check before startup
  checkEnvironment();
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
  const securityConfig = app.get(SecurityConfigService);
  const config = securityConfig.config;

  // Enable urlencoded body parsing (payment gateway sends form-urlencoded callbacks)
  const expressApp = app.getHttpAdapter().getInstance();
  const express = require('express');
  expressApp.use(express.urlencoded({ extended: true }));

  // Trust proxy - required when behind Nginx/reverse proxy
  // Only trust the first proxy (Nginx) to prevent IP spoofing
  // This allows express-rate-limit to correctly identify client IPs from X-Forwarded-For header
  // Setting to 1 means only trust the first proxy (Nginx in Docker network)
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Enhanced Security Headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: config.helmet.contentSecurityPolicy.directives,
    },
    hsts: {
      maxAge: config.helmet.hsts.maxAge,
      includeSubDomains: config.helmet.hsts.includeSubDomains,
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'same-origin' },
    frameguard: { action: 'deny' },
  }));
  
  // CORS with enhanced configuration
  app.enableCors({
    origin: config.cors.origin,
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-CSRF-Token',
      'X-Request-ID',
    ],
    exposedHeaders: ['X-Request-ID', 'X-API-Version'],
  });

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global guards (JWT and Roles are now handled by SecurityModule)
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGuard(reflector));
  app.useGlobalGuards(new RolesGuard(reflector));

  // Health check endpoint (register BEFORE global prefix to avoid /api prefix)
  app.getHttpAdapter().get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // API prefix
  app.setGlobalPrefix('api');

  // Swagger documentation
  if (!securityConfig.isProduction()) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Conference Management Platform API')
      .setDescription('API for managing conferences, events, and users')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('Authentication', 'User authentication and authorization')
      .addTag('Events', 'Conference and event management')
      .addTag('Users', 'User management')
      .addTag('Content', 'Content management')
      .addTag('Analytics', 'System analytics and reporting')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
    logger.log('Swagger documentation available at /api/docs');
  }

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`Security features enabled: Rate limiting, CSRF protection, Input sanitization`);
}
bootstrap();