import { HttpException } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';

const SENTRY_DSN = process.env.SENTRY_DSN;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

if (SENTRY_DSN && IS_PRODUCTION) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV || 'production',
    initialScope: {
      tags: {
        service: 'daibilet-backend',
      },
    },
    beforeSend(event, hint) {
      const ex = hint?.originalException;
      if (ex && typeof (ex as HttpException).getStatus === 'function') {
        const status = (ex as HttpException).getStatus();
        if (status >= 400 && status < 500) return null;
      }
      return event;
    },
  });
}

import { setCompatDisabled, setCompatLogger } from '@daibilet/shared';
import { Logger as NestLogger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

const logger = new NestLogger('Bootstrap');

async function bootstrap() {
  // Kill switch: env DISABLE_PURCHASE_TYPE_COMPAT=true запрещает legacy PurchaseType
  if (process.env.DISABLE_PURCHASE_TYPE_COMPAT === 'true') {
    setCompatDisabled(true);
    logger.warn('PurchaseType COMPAT disabled — legacy values will throw');
  }

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  if (SENTRY_DSN && IS_PRODUCTION) {
    try {
      const sentryNestjs = await import('@sentry/nestjs');
      const FilterClass = (sentryNestjs as any).SentryGlobalFilter;
      if (FilterClass) {
        app.useGlobalFilters(new FilterClass());
      }
    } catch {
      // SentryGlobalFilter not available — skip
    }
  }

  // Персистентный лог legacy PurchaseType → AuditLog (переживает рестарты)
  const prisma = app.get(PrismaService);
  setCompatLogger((raw, resolved, context) => {
    prisma.auditLog
      .create({
        data: {
          userId: '00000000-0000-0000-0000-000000000000', // system
          action: 'LEGACY_PURCHASE_TYPE',
          entity: 'PurchaseType',
          entityId: raw,
          before: { raw } as Prisma.InputJsonValue,
          after: { resolved, context } as Prisma.InputJsonValue,
        },
      })
      .catch((e) => logger.error('Audit log failed: ' + (e as Error).message));
  });

  app.setGlobalPrefix('api/v1');

  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true, // Пока true — перевести на false после полного покрытия DTO
        exposeDefaultValues: true,
      },
    }),
  );

  // Глобальный фильтр ошибок: единый формат + логирование 5xx
  const { AllExceptionsFilter } = await import('./common/all-exceptions.filter');
  app.useGlobalFilters(new AllExceptionsFilter());

  // CORS: CORS_ORIGINS или CORS_ORIGIN (comma-separated); dev: localhost, prod: APP_URL fallback
  const { getCorsOrigins } = await import('./common/cors.util');
  const origins = getCorsOrigins();
  app.enableCors({
    origin: origins.length > 0 ? origins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
  });

  const config = new DocumentBuilder()
    .setTitle('Дайбилет API')
    .setDescription('API агрегатора билетов daibilet.ru')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('catalog', 'Каталог событий, городов, тегов')
    .addTag('planner', 'Trip Planner — подбор программы')
    .addTag('checkout', 'Оплата и создание заказов')
    .addTag('vouchers', 'QR-ваучеры')
    .addTag('articles', 'Блог и SEO-статьи')
    .addTag('admin', 'Админ-панель')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`Daibilet API running on port ${port}`);
  logger.log(`Swagger: http://localhost:${port}/api/docs`);
}

bootstrap();
