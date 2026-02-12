import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors({
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000')
      .split(',')
      .map((s) => s.trim()),
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
  console.log(`Daibilet API running on port ${port}`);
  console.log(`Swagger: http://localhost:${port}/api/docs`);
}

bootstrap();
