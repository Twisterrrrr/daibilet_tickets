import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Записать событие аудита.
   * Можно вызывать напрямую или через AuditInterceptor.
   */
  async log(
    userId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    entity: string,
    entityId: string,
    before?: any,
    after?: any,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action,
          entity,
          entityId,
          before: before ?? undefined,
          after: after ?? undefined,
        },
      });
    } catch (err: unknown) {
      // Не блокируем основную операцию ошибкой аудита
      this.logger.warn(`Audit log error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Получить записи аудита с фильтрацией и пагинацией.
   */
  async findMany(filters: {
    entity?: string;
    entityId?: string;
    userId?: string;
    action?: string;
    page?: number;
    limit?: number;
  }) {
    const { entity, entityId, userId, action, page = 1, limit = 50 } = filters;

    const where: any = {};
    if (entity) where.entity = entity;
    if (entityId) where.entityId = entityId;
    if (userId) where.userId = userId;
    if (action) where.action = action;

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, pages: Math.ceil(total / limit) };
  }
}
