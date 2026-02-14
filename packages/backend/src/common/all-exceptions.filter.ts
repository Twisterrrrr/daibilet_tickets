import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';

interface ErrorResponse {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
  requestId: string;
  path: string;
  timestamp: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request.headers['x-request-id'] as string) || randomUUID();

    let status: number;
    let code: string;
    let message: string;
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();

      if (typeof exResponse === 'string') {
        code = HttpStatus[status] || 'ERROR';
        message = exResponse;
      } else if (typeof exResponse === 'object' && exResponse !== null) {
        const obj = exResponse as Record<string, unknown>;
        code = (obj.error as string) || HttpStatus[status] || 'ERROR';
        message = Array.isArray(obj.message)
          ? (obj.message as string[]).join('; ')
          : (obj.message as string) || 'Error';
        details = obj.details ?? (Array.isArray(obj.message) ? obj.message : undefined);
      } else {
        code = HttpStatus[status] || 'ERROR';
        message = 'Error';
      }
    } else {
      // Непредвиденная ошибка — 500
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      code = 'INTERNAL_SERVER_ERROR';
      message = 'Внутренняя ошибка сервера';
    }

    // Логируем 5xx и непредвиденные ошибки
    if (status >= 500) {
      const errMsg = exception instanceof Error ? exception.message : String(exception);
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(
        `[${requestId}] ${request.method} ${request.url} → ${status}: ${errMsg}`,
        stack,
      );
    } else if (status >= 400) {
      this.logger.warn(
        `[${requestId}] ${request.method} ${request.url} → ${status}: ${message}`,
      );
    }

    const body: ErrorResponse = {
      statusCode: status,
      code,
      message,
      ...(details ? { details } : {}),
      requestId,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(body);
  }
}
