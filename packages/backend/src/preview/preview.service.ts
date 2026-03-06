import { createHmac } from 'crypto';

import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type PreviewEntityType = 'EVENT' | 'VENUE';

interface PreviewPayload {
  v: 1;
  type: PreviewEntityType;
  id: string;
  iat: number;
  exp: number;
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=');
  return Buffer.from(padded, 'base64').toString('utf8');
}

@Injectable()
export class PreviewService {
  private readonly secret: string;

  constructor(private readonly config: ConfigService) {
    // Отдельный секрет для preview, с безопасным fallback на JWT_SECRET.
    this.secret =
      this.config.get<string>('PREVIEW_TOKEN_SECRET') ||
      this.config.get<string>('JWT_SECRET') ||
      'dev-preview-secret-change-me';
  }

  signPreviewToken(type: PreviewEntityType, id: string, ttlSeconds = 30 * 60): string {
    const now = Math.floor(Date.now() / 1000);
    const payload: PreviewPayload = {
      v: 1,
      type,
      id,
      iat: now,
      exp: now + ttlSeconds,
    };

    const json = JSON.stringify(payload);
    const payloadB64 = base64UrlEncode(json);
    const signature = this.sign(payloadB64);

    return `${payloadB64}.${signature}`;
  }

  verifyPreviewToken(token: string): PreviewPayload {
    if (!token || typeof token !== 'string') {
      throw new BadRequestException('preview token is required');
    }

    const parts = token.split('.');
    if (parts.length !== 2) {
      throw new BadRequestException('preview token malformed');
    }

    const [payloadB64, signature] = parts;
    const expectedSignature = this.sign(payloadB64);

    if (!this.timingSafeEqual(signature, expectedSignature)) {
      throw new UnauthorizedException('preview token invalid');
    }

    let payloadJson: string;
    try {
      payloadJson = base64UrlDecode(payloadB64);
    } catch {
      throw new BadRequestException('preview token payload malformed');
    }

    let payload: PreviewPayload;
    try {
      payload = JSON.parse(payloadJson) as PreviewPayload;
    } catch {
      throw new BadRequestException('preview token payload is not JSON');
    }

    if (
      payload.v !== 1 ||
      (payload.type !== 'EVENT' && payload.type !== 'VENUE') ||
      !payload.id ||
      typeof payload.exp !== 'number' ||
      typeof payload.iat !== 'number'
    ) {
      throw new BadRequestException('preview token payload invalid');
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) {
      throw new UnauthorizedException('preview token expired');
    }

    return payload;
  }

  private sign(payloadB64: string): string {
    return createHmac('sha256', this.secret).update(payloadB64).digest('base64url');
  }

  private timingSafeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
      return false;
    }
    // crypto.timingSafeEqual недоступен без прямого импорта, имитируем поведение через HMAC-складывание.
    const result = createHmac('sha256', this.secret).update(bufA).digest();
    const expected = createHmac('sha256', this.secret).update(bufB).digest();
    let diff = 0;
    for (let i = 0; i < result.length; i++) {
      diff |= result[i] ^ expected[i];
    }
    return diff === 0;
  }
}

