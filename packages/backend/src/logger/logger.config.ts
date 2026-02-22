/**
 * Pino logger config — structured JSON logs, requestId, PII redaction.
 * Dev: pino-pretty (human-readable), Prod: pure JSON.
 */

import { Params } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';

const isProd = process.env.NODE_ENV === 'production';

export const loggerConfig: Params = {
  pinoHttp: {
    level: isProd ? 'info' : 'debug',
    transport: isProd ? undefined : { target: 'pino-pretty', options: { colorize: true } },
    genReqId: (req) => (req.headers['x-request-id'] as string) || (req as { id?: string }).id || randomUUID(),
    redact: {
      paths: ['email', 'phone', 'password', 'token', 'apiKey', 'authorization', 'cookie', 'req.headers.authorization', 'req.headers.cookie'],
      censor: '***',
    },
    customProps: () => ({ service: 'daibilet-backend' }),
  },
};
