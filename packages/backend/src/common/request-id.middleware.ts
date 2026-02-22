/**
 * Request ID Middleware — обеспечивает трассируемость каждого запроса.
 *
 * Если x-request-id отсутствует → генерируем UUID.
 * Пишем в req.id и в заголовок ответа.
 * Логируем входящий запрос с requestId.
 */

import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestIdMiddleware.name);

  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    req.id = requestId;
    res.setHeader('x-request-id', requestId);
    this.logger.log(`[requestId=${requestId}] ${req.method} ${req.url}`);
    next();
  }
}
