/**
 * E2E: requestId в response header и в логах при ошибке.
 * Минимальный NestJS app без Prisma/Redis.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { Controller, Get, NotFoundException } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { RequestIdMiddleware } from '../request-id.middleware';
import { AllExceptionsFilter } from '../all-exceptions.filter';
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import * as http from 'http';

// Minimal controller for E2E
@Controller()
class TestController {
  @Get('ok')
  ok() {
    return { status: 'ok' };
  }

  @Get('not-found-route')
  notFound() {
    throw new NotFoundException('Not Found');
  }
}

@Module({
  controllers: [TestController],
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
class TestModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}

function getHeaders(res: http.IncomingMessage): Record<string, string> {
  const headers: Record<string, string> = {};
  if (res.headers) {
    for (const [k, v] of Object.entries(res.headers)) {
      headers[k.toLowerCase()] = Array.isArray(v) ? v[0] : String(v ?? '');
    }
  }
  return headers;
}

describe('RequestId E2E', () => {
  let app: INestApplication;
  let baseUrl: string;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    await app.listen(0);

    const addr = app.getHttpServer().address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    baseUrl = `http://127.0.0.1:${port}`;

    const { Logger } = await import('@nestjs/common');
    logSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterAll(async () => {
    logSpy?.mockRestore();
    await app?.close();
  });

  it('returns x-request-id header on successful request', async () => {
    const headers = await new Promise<Record<string, string>>((resolve, reject) => {
      const r = http.get(`${baseUrl}/ok`, (res) => {
        res.resume();
        resolve(getHeaders(res));
      });
      r.on('error', reject);
    });

    expect(headers['x-request-id']).toBeTruthy();
    expect(headers['x-request-id']!.length).toBeGreaterThan(10);
  });

  it('returns x-request-id on error and logs with requestId', async () => {
    const { statusCode, headers } = await new Promise<{
      statusCode: number;
      headers: Record<string, string>;
    }>((resolve, reject) => {
      const r = http.get(`${baseUrl}/not-found-route`, (res) => {
        resolve({ statusCode: res.statusCode ?? 0, headers: getHeaders(res) });
        res.resume();
      });
      r.on('error', reject);
    });

    expect(statusCode).toBe(404);
    expect(headers['x-request-id']).toBeTruthy();

    expect(logSpy).toHaveBeenCalled();
    const errorCall = logSpy.mock.calls.find(
      (c: unknown[]) => String(c[0]).includes('[requestId=') && String(c[0]).includes('404'),
    );
    expect(errorCall).toBeDefined();
    expect(String(errorCall![0])).toMatch(/\[requestId=[a-f0-9-]+\]/);
  });
});
