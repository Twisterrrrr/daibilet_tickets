import { Injectable, Logger } from '@nestjs/common';
import { EditorStatus, Prisma } from '@prisma/client';
import type { EventSource } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

const IMPORT_SOURCES: EventSource[] = ['TC', 'TEPLOHOD'];

/**
 * Очередь постредакции: после sync TC/TEP создаём или обновляем EventOverride,
 * чтобы импортные события попадали в очередь редактора в Directus (editorStatus = NEEDS_REVIEW).
 * Sync обновляет только Event/Offer/Session; override не трогает — правки не перетираются.
 */
@Injectable()
export class PostEditQueueService {
  private readonly logger = new Logger(PostEditQueueService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Создать/обновить overrides для импортных событий (очередь постредакции).
   *
   * @param source — TC | TEPLOHOD или undefined для обоих
   * @param since — опционально: только события, обновлённые после этой даты (ускоряет после sync)
   */
  async ensureOverridesForImportedEvents(params?: {
    source?: EventSource;
    since?: Date;
    batchSize?: number;
  }): Promise<{ created: number; updated: number }> {
    const source = params?.source;
    const since = params?.since;
    const batchSize = params?.batchSize ?? 500;

    const where: Prisma.EventWhereInput = {
      source: source ?? { in: IMPORT_SOURCES },
      isDeleted: false,
      ...(since ? { updatedAt: { gte: since } } : {}),
    };

    let created = 0;
    let updated = 0;
    let cursorId: string | null = null;

    while (true) {
      const events: { id: string; updatedAt: Date }[] = await this.prisma.event.findMany({
        where,
        select: { id: true, updatedAt: true },
        orderBy: { id: 'asc' },
        take: batchSize,
        ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
      });

      if (events.length === 0) break;

      for (const e of events) {
        const existing = await this.prisma.eventOverride.findUnique({
          where: { eventId: e.id },
          select: { id: true, editorStatus: true },
        });

        if (!existing) {
          await this.prisma.eventOverride.create({
            data: {
              eventId: e.id,
              editorStatus: EditorStatus.NEEDS_REVIEW,
              needsReviewAt: new Date(),
              lastImportedAt: e.updatedAt,
              updatedBy: null,
            },
          });
          created++;
          continue;
        }

        if (existing.editorStatus === EditorStatus.PUBLISHED) {
          await this.prisma.eventOverride.update({
            where: { eventId: e.id },
            data: { lastImportedAt: e.updatedAt },
          });
          updated++;
          continue;
        }

        const nextStatus =
          existing.editorStatus === EditorStatus.IN_PROGRESS
            ? EditorStatus.IN_PROGRESS
            : EditorStatus.NEEDS_REVIEW;

        await this.prisma.eventOverride.update({
          where: { eventId: e.id },
          data: {
            editorStatus: nextStatus,
            needsReviewAt: nextStatus === EditorStatus.NEEDS_REVIEW ? new Date() : undefined,
            lastImportedAt: e.updatedAt,
          },
        });
        updated++;
      }

      cursorId = events[events.length - 1]!.id;
    }

    this.logger.log(`Post-edit queue ensured. created=${created}, updated=${updated}`);
    return { created, updated };
  }
}
