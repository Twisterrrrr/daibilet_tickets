/**
 * Sentry Context Middleware — устанавливает теги (requestId, route) для событий Sentry.
 * Должен выполняться после RequestIdMiddleware.
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/nestjs';

@Injectable()
export class SentryContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    if (process.env.SENTRY_DSN && process.env.NODE_ENV === 'production') {
      Sentry.setTag('requestId', req.id ?? 'n/a');
      Sentry.setTag('route', req.path ?? req.url ?? 'unknown');
    }
    next();
  }
}
