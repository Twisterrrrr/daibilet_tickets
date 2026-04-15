import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserFavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Разрешить slug или UUID события в id (для FK user_favorites.eventId, dual-write с eventSlug). */
  private async resolveEventId(slugOrId: string): Promise<string | null> {
    const raw = slugOrId.trim();
    if (!raw) return null;
    const looksUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw);
    if (looksUuid) {
      const byId = await this.prisma.event.findUnique({
        where: { id: raw },
        select: { id: true },
      });
      return byId?.id ?? null;
    }
    const bySlug = await this.prisma.event.findUnique({
      where: { slug: raw },
      select: { id: true },
    });
    return bySlug?.id ?? null;
  }

  async getSlugs(userId: string): Promise<string[]> {
    const favs = await this.prisma.userFavorite.findMany({
      where: { userId },
      select: { eventSlug: true },
      orderBy: { createdAt: 'desc' },
    });
    return favs.map((f) => f.eventSlug);
  }

  async add(userId: string, slug: string): Promise<string[]> {
    const eventId = await this.resolveEventId(slug);
    await this.prisma.userFavorite.upsert({
      where: {
        userId_eventSlug: { userId, eventSlug: slug },
      },
      create: { userId, eventSlug: slug, ...(eventId ? { eventId } : {}) },
      update: eventId ? { eventId } : {},
    });
    return this.getSlugs(userId);
  }

  async remove(userId: string, slug: string): Promise<string[]> {
    await this.prisma.userFavorite.deleteMany({
      where: { userId, eventSlug: slug },
    });
    return this.getSlugs(userId);
  }

  /**
   * Синхронизация: объединить slugs из localStorage с уже сохранёнными в учётке.
   * Добавляет новые из переданного списка, возвращает полный список.
   */
  async sync(userId: string, slugs: string[]): Promise<string[]> {
    const validSlugs = slugs.filter((s) => typeof s === 'string' && s.trim().length > 0);
    if (validSlugs.length === 0) {
      return this.getSlugs(userId);
    }

    for (const slug of validSlugs) {
      const eventId = await this.resolveEventId(slug);
      await this.prisma.userFavorite.upsert({
        where: {
          userId_eventSlug: { userId, eventSlug: slug },
        },
        create: { userId, eventSlug: slug, ...(eventId ? { eventId } : {}) },
        update: eventId ? { eventId } : {},
      });
    }

    return this.getSlugs(userId);
  }
}
