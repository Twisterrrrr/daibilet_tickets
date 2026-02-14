import * as Sentry from '@sentry/nestjs';

const SENTRY_DSN = process.env.SENTRY_DSN;
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV || 'development',
  });
}

import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { setCompatDisabled, setCompatLogger } from '@daibilet/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma/prisma.service';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  // Kill switch: env DISABLE_PURCHASE_TYPE_COMPAT=true запрещает legacy PurchaseType
  if (process.env.DISABLE_PURCHASE_TYPE_COMPAT === 'true') {
    setCompatDisabled(true);
    logger.warn('PurchaseType COMPAT disabled — legacy values will throw');
  }

  const app = await NestFactory.create(AppModule);

  if (process.env.SENTRY_DSN) {
    try {
      const sentryNestjs = await import('@sentry/nestjs');
      // SentryGlobalFilter may not exist in all @sentry/nestjs versions
      const FilterClass = (sentryNestjs as any).SentryGlobalFilter;
      if (FilterClass) {
        app.useGlobalFilters(new FilterClass());
      }
    } catch {
      // @sentry/nestjs not available or SentryGlobalFilter not exported — skip
    }
  }

  // Персистентный лог legacy PurchaseType → AuditLog (переживает рестарты)
  const prisma = app.get(PrismaService);
  setCompatLogger((raw, resolved, context) => {
    prisma.auditLog.create({
      data: {
        userId: '00000000-0000-0000-0000-000000000000', // system
        action: 'LEGACY_PURCHASE_TYPE',
        entity: 'PurchaseType',
        entityId: raw,
        before: { raw } as Prisma.InputJsonValue,
        after: { resolved, context } as Prisma.InputJsonValue,
      },
    }).catch((e) => logger.error('Audit log failed: ' + (e as Error).message));
  });

  app.setGlobalPrefix('api/v1');

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

  // CORS: CORS_ORIGIN env, else in production use APP_URL, else in dev use localhost
  const defaultOrigin =
    process.env.NODE_ENV === 'production' ? (process.env.APP_URL || '') : 'http://localhost:3000';
  const corsOrigin = process.env.CORS_ORIGIN || defaultOrigin;
  app.enableCors({
    origin: corsOrigin.split(',').map((s) => s.trim()).filter(Boolean),
    credentials: true,
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
