/**
 * Sentry Context Middleware — добавляет requestId в Sentry scope.
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class SentryContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = (req as Request & { id?: string }).id;
    if (requestId && typeof (globalThis as any).Sentry !== 'undefined') {
      (globalThis as any).Sentry.configureScope((scope: any) => scope.setTag('requestId', requestId));
    }
    next();
  }
}
