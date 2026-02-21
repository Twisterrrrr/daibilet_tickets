import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';

/**
 * Interceptor для автоматического логирования POST/PATCH/DELETE
 * на маршрутах /admin/*.
 * 
 * Использование: навесить @UseInterceptors(AuditInterceptor) на контроллер.
 * Пользователь берётся из req.user (JwtAuthGuard),
 * entity и entityId определяются из пути.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;

    // Логируем только мутирующие запросы
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const userId = req.user?.id;
    if (!userId) return next.handle();

    // Определяем entity из пути: /api/v1/admin/<entity>/...
    const pathParts = (req.route?.path || req.path || '').split('/').filter(Boolean);
    const adminIdx = pathParts.indexOf('admin');
    const entity = adminIdx >= 0 && pathParts[adminIdx + 1]
      ? this.normalizeEntity(pathParts[adminIdx + 1])
      : 'Unknown';

    const entityId = req.params?.id || 'new';

    const action = method === 'DELETE' ? 'DELETE'
      : method === 'POST' ? 'CREATE'
      : 'UPDATE';

    const before = method !== 'POST' ? undefined : undefined; // before снимается в контроллере при необходимости
    const body = req.body;

    return next.handle().pipe(
      tap((result) => {
        // Записываем в аудит после успешного выполнения
        this.audit.log(userId, action, entity, entityId, before, body).catch((e) => this.logger.error('Audit log failed: ' + (e as Error).message));
      }),
    );
  }

  private normalizeEntity(raw: string): string {
    const map: Record<string, string> = {
      cities: 'City',
      events: 'Event',
      tags: 'Tag',
      landings: 'LandingPage',
      combos: 'ComboPage',
      articles: 'Article',
      orders: 'Package',
      settings: 'Settings',
      upsells: 'UpsellItem',
      audit: 'AuditLog',
      jobs: 'FailedJob',
    };
    return map[raw] || raw;
  }
}
