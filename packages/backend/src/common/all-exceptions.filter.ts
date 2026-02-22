import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/nestjs';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;
    let message: string;
    if (exception instanceof HttpException) {
      const exResp = exception.getResponse();
      const m = typeof exResp === 'object' && exResp !== null ? (exResp as Record<string, unknown>).message : exResp;
      message = Array.isArray(m) ? m.join('; ') : (m as string) || exception.message;
    } else {
      message = (exception instanceof Error ? exception.message : null) || 'Internal Server Error';
    }

    const err = exception instanceof Error ? exception : new Error(String(exception));
    if (status >= 500 && process.env.SENTRY_DSN) {
      Sentry.captureException(err, {
        tags: { env: process.env.NODE_ENV, path: req.url },
      });
    }

    res.status(status).json({
      statusCode: status,
      message,
      path: req.url,
      ...(process.env.NODE_ENV !== 'production' && exception instanceof Error
        ? { stack: exception.stack }
        : {}),
    });
  }
}
