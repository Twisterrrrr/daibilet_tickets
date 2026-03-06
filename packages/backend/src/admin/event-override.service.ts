import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EventOverrideService {
  private readonly logger = new Logger(EventOverrideService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Получить override для одного события.
   */
  async getOverride(eventId: string) {
    return this.prisma.eventOverride.findUnique({ where: { eventId } });
  }

  /**
   * Создать или обновить override для события.
   */
  async upsert(eventId: string, data: Record<string, unknown>, updatedBy: string) {
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, event: _event, ...clean } = data;

    return this.prisma.eventOverride.upsert({
      where: { eventId },
      create: { ...clean, eventId, updatedBy },
      update: { ...clean, updatedBy },
    });
  }

  /**
   * Удалить override (вернуть к оригинальным данным sync).
   */
  async remove(eventId: string) {
    const existing = await this.prisma.eventOverride.findUnique({ where: { eventId } });
    if (!existing) return null;
    return this.prisma.eventOverride.delete({ where: { eventId } });
  }

  /**
   * Toggle isHidden для события.
   */
  async toggleHidden(eventId: string, isHidden: boolean, updatedBy: string) {
    return this.prisma.eventOverride.upsert({
      where: { eventId },
      create: { eventId, isHidden, updatedBy },
      update: { isHidden, updatedBy },
    });
  }

  /**
   * Применить overrides к массиву событий.
   * Возвращает события с мёрженными данными, фильтрует isHidden.
   */
  async applyOverrides<T extends Record<string, unknown> & { id: string }>(
    events: T[],
    options?: { preview?: boolean },
  ): Promise<T[]> {
    if (events.length === 0) return events;

    const preview = options?.preview ?? false;

    const eventIds = events.map((e) => e.id);
    const overrides = await this.prisma.eventOverride.findMany({
      where: { eventId: { in: eventIds } },
    });

    if (overrides.length === 0) return events;

    const overrideMap = new Map(overrides.map((o) => [o.eventId, o]));

    return events
      .map((event) => {
        const override = overrideMap.get(event.id) as
          | (Record<string, unknown> & {
              editorStatus?: string;
              subcategories?: unknown[];
              subcategoriesMode?: string | null;
              subcategoriesOverride?: unknown[];
            })
          | undefined;
        if (!override) return event;
        if (!preview && (override as { isHidden?: boolean }).isHidden) return null;
        // Очередь постредакции: не показывать, пока редактор не выставил PUBLISHED
        const status = override.editorStatus;
        if (!preview && status !== undefined && status !== 'PUBLISHED') return null;
        const ev = event as Record<string, unknown>;

        let subcategories: unknown[] = ev.subcategories as unknown[];
        const mode = (override.subcategoriesMode || 'INHERIT').toUpperCase();
        if (mode === 'CLEAR') {
          subcategories = [];
        } else if (mode === 'OVERRIDE') {
          subcategories = override.subcategoriesOverride && override.subcategoriesOverride.length > 0
            ? override.subcategoriesOverride
            : [];
        } else if (override.subcategories && override.subcategories.length > 0) {
          // Для обратной совместимости, если subcategoriesMode не задан, но subcategories есть
          subcategories = override.subcategories;
        }

        return {
          ...event,
          title: override.title ?? ev.title,
          description: override.description ?? ev.description,
          imageUrl: override.imageUrl ?? ev.imageUrl,
          category: override.category ?? ev.category,
          audience: override.audience ?? ev.audience,
          subcategories,
          minAge: override.minAge ?? ev.minAge,
          rating: override.manualRating ?? ev.rating,
          templateData: (override as { templateData?: unknown }).templateData ?? null,
          _hasOverride: true,
        } as T;
      })
      .filter((x): x is T => x != null);
  }
}
