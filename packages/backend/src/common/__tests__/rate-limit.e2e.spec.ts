/**
 * E2E: Rate limit 429 с errorCode RATE_LIMIT_EXCEEDED.
 * Минимальный NestJS app с ThrottlerModule.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test } from '@nestjs/testing';
import { Controller, Get } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AllExceptionsFilter } from '../all-exceptions.filter';
import * as http from 'http';

@Controller()
class TestController {
  @Get('limited')
  limited() {
    return { ok: true };
  }
}

@Module({
  imports: [
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 3 }]),
  ],
  controllers: [TestController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
class TestModule {}

function httpGet(url: string): Promise<{ statusCode: number; body: string; headers: Record<string, string> }> {
  return new Promise((resolve, reject) => {
    const r = http.get(url, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const headers: Record<string, string> = {};
        for (const [k, v] of Object.entries(res.headers ?? {})) {
          headers[k.toLowerCase()] = Array.isArray(v) ? v[0] : String(v ?? '');
        }
        resolve({
          statusCode: res.statusCode ?? 0,
          body: Buffer.concat(chunks).toString('utf8'),
          headers,
        });
      });
    });
    r.on('error', reject);
  });
}

describe('Rate Limit E2E', () => {
  let baseUrl: string;
  let app: { close: () => Promise<void> };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestModule],
    }).compile();

    const nestApp = moduleRef.createNestApplication();
    await nestApp.init();
    await nestApp.listen(0);

    const addr = nestApp.getHttpServer().address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    baseUrl = `http://127.0.0.1:${port}`;
    app = nestApp;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('returns 429 with errorCode RATE_LIMIT_EXCEEDED after exceeding limit', async () => {
    // First 3 succeed (in a fresh test run)
    for (let i = 0; i < 3; i++) {
      const r = await httpGet(`${baseUrl}/limited`);
      expect(r.statusCode).toBe(200);
    }
    // 4th request should get 429
    const r = await httpGet(`${baseUrl}/limited`);
    expect(r.statusCode).toBe(429);
    const body = JSON.parse(r.body);
    expect(body.errorCode).toBe('RATE_LIMIT_EXCEEDED');
    expect(body.statusCode).toBe(429);
  });
});
