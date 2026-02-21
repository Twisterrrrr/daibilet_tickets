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
  async upsert(eventId: string, data: any, updatedBy: string) {
    const { id: _, createdAt, updatedAt, event, ...clean } = data;

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
  async applyOverrides(events: any[]): Promise<any[]> {
    if (events.length === 0) return events;

    const eventIds = events.map(e => e.id);
    const overrides = await this.prisma.eventOverride.findMany({
      where: { eventId: { in: eventIds } },
    });

    if (overrides.length === 0) return events;

    const overrideMap = new Map(overrides.map(o => [o.eventId, o]));

    return events
      .map(event => {
        const override = overrideMap.get(event.id);
        if (!override) return event;
        if (override.isHidden) return null; // Фильтруем скрытые

        return {
          ...event,
          title: override.title ?? event.title,
          description: override.description ?? event.description,
          imageUrl: override.imageUrl ?? event.imageUrl,
          category: override.category ?? event.category,
          audience: override.audience ?? event.audience,
          subcategories: override.subcategories?.length ? override.subcategories : event.subcategories,
          minAge: override.minAge ?? event.minAge,
          rating: override.manualRating ?? event.rating,
          templateData: (override as any).templateData ?? null,
          _hasOverride: true,
        };
      })
      .filter(Boolean);
  }
}
