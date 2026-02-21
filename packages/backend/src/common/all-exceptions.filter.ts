import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { maskPiiInString } from './pii-mask.util';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const requestId = req.id ?? 'n/a';

    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;
    let message: string;
    if (exception instanceof HttpException) {
      const exResp = exception.getResponse();
      const m = typeof exResp === 'object' && exResp !== null
        ? (exResp as Record<string, unknown>).message
        : exResp;
      message = Array.isArray(m) ? m.join('; ') : (m as string) || exception.message;
    } else {
      message = (exception instanceof Error ? exception.message : null) || 'Internal Server Error';
    }

    const maskedMessage = maskPiiInString(message);
    const stack = exception instanceof Error ? exception.stack : undefined;
    const maskedStack = stack ? maskPiiInString(stack) : undefined;

    this.logger.error(
      `[requestId=${requestId}] ${req.method} ${req.url} ${status} ${maskedMessage}`,
      maskedStack,
    );

    res.setHeader('x-request-id', requestId);
    const body: Record<string, unknown> = {
      statusCode: status,
      message,
      path: req.url,
    };
    if (status === HttpStatus.TOO_MANY_REQUESTS) {
      body.errorCode = 'RATE_LIMIT_EXCEEDED';
    }
    if (process.env.NODE_ENV !== 'production' && exception instanceof Error) {
      body.stack = exception.stack;
    }
    res.status(status).json(body);
  }
}
