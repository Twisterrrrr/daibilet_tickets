import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@/prisma-client';

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
    before?: Prisma.InputJsonValue | null,
    after?: Prisma.InputJsonValue | null,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action,
          entity,
          entityId,
          before: before != null ? before : undefined,
          after: after != null ? after : undefined,
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
    q?: string;
    from?: Date;
    to?: Date;
    page?: number;
    limit?: number;
  }) {
    const { entity, entityId, userId, action, q, from, to, page = 1, limit = 50 } = filters;

    const where: Prisma.AuditLogWhereInput = {};
    if (entity) where.entity = entity;
    if (entityId) where.entityId = entityId;
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      };
    }
    if (q && q.trim().length > 0) {
      const term = q.trim();
      where.OR = [
        { entity: { contains: term, mode: 'insensitive' } },
        { entityId: { contains: term, mode: 'insensitive' } },
        { action: { contains: term, mode: 'insensitive' } },
      ];
    }

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
