/**
 * Sentry Context Middleware — добавляет requestId в Sentry scope.
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

interface SentryScope {
  setTag(key: string, value: string): void;
}

interface SentryLike {
  configureScope(cb: (scope: SentryScope) => void): void;
}

declare global {
  var Sentry: SentryLike | undefined;
}

@Injectable()
export class SentryContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = (req as Request & { id?: string }).id;
    const Sentry = globalThis.Sentry;
    if (requestId && typeof Sentry !== 'undefined') {
      Sentry.configureScope((scope: SentryScope) => scope.setTag('requestId', requestId));
    }
    next();
  }
}
