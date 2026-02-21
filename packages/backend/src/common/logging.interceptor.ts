/**
 * Request Logging Interceptor — логирует входящие HTTP-запросы с requestId.
 * Выполняется после RequestIdMiddleware, req.id уже установлен.
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const { method, url } = req;
    const requestId = req.id ?? 'n/a';
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          const res = ctx.getResponse();
          const status = res.statusCode;
          this.logger.log(
            `[requestId=${requestId}] ${method} ${url} ${status} ${duration}ms`,
          );
        },
      }),
    );
  }
}
