import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { Prisma } from '@prisma/client';
import { getPriceByTypeKopecks } from '@daibilet/shared';

interface CuratedEventSlot {
  eventId: string;
  dayNumber: number;
  slot: string;
  time: string;
}

/**
 * Combo Service — готовые программы.
 *
 * Принципы:
 * 1. SEO-стабильность: curatedEvents перезаписываются ТОЛЬКО если >30% событий невалидны.
 * 2. Фактор новизны: новые события получают бонус при подборе.
 * 3. Умный populate: обрабатываются только затронутые города / невалидные combo.
 */

const SLOT_TIMES: Record<string, string> = { MORNING: '10:00', AFTERNOON: '14:00', EVENING: '19:00' };
const CATEGORY_SLOT_PREF: Record<string, string> = { MUSEUM: 'MORNING', EXCURSION: 'AFTERNOON', EVENT: 'EVENING' };

/** Порог невалидности: если больше этого % событий мертвы — перепопулировать */
const INVALIDATION_THRESHOLD = 0.3;

/** Бонус за новизну: сколько дней событие считается "новым" */
const FRESHNESS_DAYS = 30;
const FRESHNESS_BONUS = 15; // баллов

@Injectable()
export class ComboService {
  private readonly logger = new Logger(ComboService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
  ) {}

  // ==========================================
  // Public API
  // ==========================================

  async getAll(citySlug?: string) {
    const where: any = { isActive: true };
    if (citySlug) where.city = { slug: citySlug };

    return this.prisma.comboPage.findMany({
      where,
      include: { city: { select: { id: true, slug: true, name: true } } },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async getBySlug(slug: string) {
    const combo = await this.prisma.comboPage.findUnique({
      where: { slug },
      include: { city: { select: { id: true, slug: true, name: true } } },
    });

    if (!combo || !combo.isActive) {
      throw new NotFoundException('Combo-страница не найдена');
    }

    let curatedItems = (combo.curatedEvents as unknown as CuratedEventSlot[]) || [];

    // Auto-fill ТОЛЬКО если пусто (первичное заполнение)
    if (curatedItems.length === 0) {
      curatedItems = await this.autoFillCuratedEvents(combo.cityId, combo.dayCount, combo.intensity);
      if (curatedItems.length > 0) {
        await this.prisma.comboPage.update({
          where: { id: combo.id },
          data: { curatedEvents: curatedItems as unknown as Prisma.InputJsonValue },
        });
        this.logger.log(`Auto-filled ${curatedItems.length} events for combo "${slug}"`);
      }
    }

    return this.buildComboResponse(combo, curatedItems);
  }

  /**
   * Принудительно пересобрать curatedEvents (из админки — без проверок).
   */
  async populate(slug: string) {
    const combo = await this.prisma.comboPage.findUnique({ where: { slug } });
    if (!combo) throw new NotFoundException('Combo не найден');

    const curatedItems = await this.autoFillCuratedEvents(combo.cityId, combo.dayCount, combo.intensity);

    await this.prisma.comboPage.update({
      where: { id: combo.id },
      data: { curatedEvents: curatedItems as unknown as Prisma.InputJsonValue },
    });

    return {
      slug,
      eventsAssigned: curatedItems.length,
      days: combo.dayCount,
      items: curatedItems,
    };
  }

  /**
   * Умный populate: обновляет ТОЛЬКО те combo, которые реально нуждаются.
   *
   * Логика:
   * 1. Если curatedEvents пуст → заполнить.
   * 2. Если >30% событий невалидны (inactive / удалены) → перезаполнить.
   * 3. Иначе → НЕ трогать (SEO-стабильность).
   *
   * @param affectedCityIds — если передан, обрабатываются только combo этих городов
   */
  async populateAll(affectedCityIds?: string[]) {
    const where: any = { isActive: true };
    if (affectedCityIds && affectedCityIds.length > 0) {
      where.cityId = { in: affectedCityIds };
    }

    const combos = await this.prisma.comboPage.findMany({ where });
    const results: { slug: string; action: string; eventsAssigned: number }[] = [];

    for (const combo of combos) {
      const curatedItems = (combo.curatedEvents as unknown as CuratedEventSlot[]) || [];

      // Случай 1: curatedEvents пуст → первичное заполнение
      if (curatedItems.length === 0) {
        const items = await this.autoFillCuratedEvents(combo.cityId, combo.dayCount, combo.intensity);
        if (items.length > 0) {
          await this.prisma.comboPage.update({
            where: { id: combo.id },
            data: { curatedEvents: items as unknown as Prisma.InputJsonValue },
          });
          results.push({ slug: combo.slug, action: 'filled', eventsAssigned: items.length });
        } else {
          results.push({ slug: combo.slug, action: 'no-events', eventsAssigned: 0 });
        }
        continue;
      }

      // Случай 2: проверить валидность существующих событий
      const validation = await this.validateCuratedEvents(curatedItems);

      if (validation.invalidRatio > INVALIDATION_THRESHOLD) {
        // Слишком много невалидных — пересобрать
        const items = await this.autoFillCuratedEvents(combo.cityId, combo.dayCount, combo.intensity);
        if (items.length > 0) {
          await this.prisma.comboPage.update({
            where: { id: combo.id },
            data: { curatedEvents: items as unknown as Prisma.InputJsonValue },
          });
          results.push({
            slug: combo.slug,
            action: `repopulated (${Math.round(validation.invalidRatio * 100)}% invalid)`,
            eventsAssigned: items.length,
          });
        }
      } else {
        // Валидность нормальная — НЕ трогаем
        results.push({
          slug: combo.slug,
          action: `skipped (${validation.validCount}/${validation.totalCount} valid)`,
          eventsAssigned: curatedItems.length,
        });
      }
    }

    const changed = results.filter(r => r.action !== 'skipped' && !r.action.startsWith('skipped'));
    this.logger.log(
      `populateAll: ${combos.length} combo проверено, ${changed.length} обновлено`,
    );

    return { checked: combos.length, changed: changed.length, results };
  }

  // ==========================================
  // Валидация
  // ==========================================

  /**
   * Проверяет, сколько событий из curatedEvents всё ещё активны.
   */
  private async validateCuratedEvents(curatedItems: any[]): Promise<{
    totalCount: number;
    validCount: number;
    invalidCount: number;
    invalidRatio: number;
  }> {
    const eventIds = curatedItems.map((c) => c.eventId).filter(Boolean);
    if (eventIds.length === 0) {
      return { totalCount: 0, validCount: 0, invalidCount: 0, invalidRatio: 1 };
    }

    const activeCount = await this.prisma.event.count({
      where: { id: { in: eventIds }, isActive: true },
    });

    const totalCount = eventIds.length;
    const invalidCount = totalCount - activeCount;

    return {
      totalCount,
      validCount: activeCount,
      invalidCount,
      invalidRatio: totalCount > 0 ? invalidCount / totalCount : 1,
    };
  }

  // ==========================================
  // Auto-fill с фактором новизны
  // ==========================================

  /**
   * Подбирает топ-N событий из города с учётом:
   * - Рейтинга
   * - Популярности (отзывы)
   * - Новизны (бонус для событий < 30 дней)
   * - Категории → слот
   */
  private async autoFillCuratedEvents(
    cityId: string,
    dayCount: number,
    intensity: string,
  ): Promise<any[]> {
    const slotsPerDay = intensity === 'RELAXED' ? 2 : intensity === 'ACTIVE' ? 4 : 3;
    const totalNeeded = dayCount * slotsPerDay;

    const events = await this.prisma.event.findMany({
      where: {
        cityId,
        isActive: true,
        sessions: { some: { isActive: true } },
      },
      orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
      take: totalNeeded * 3, // широкий пул для scoring
      select: {
        id: true,
        category: true,
        durationMinutes: true,
        rating: true,
        reviewCount: true,
        imageUrl: true,
        createdAt: true,
      },
    });

    if (events.length === 0) return [];

    // Скоринг каждого события
    const now = Date.now();
    const scored = events.map((e) => {
      let score = 0;

      // Рейтинг (0–25)
      score += (Number(e.rating) / 5) * 25;

      // Популярность (0–15)
      score += Math.min(e.reviewCount / 50, 1) * 15;

      // Новизна (0–FRESHNESS_BONUS)
      const ageMs = now - new Date(e.createdAt).getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      if (ageDays < FRESHNESS_DAYS) {
        score += FRESHNESS_BONUS * (1 - ageDays / FRESHNESS_DAYS);
      }

      // Бонус за изображение (+3)
      if (e.imageUrl) score += 3;

      return { ...e, score };
    });

    scored.sort((a, b) => b.score - a.score);

    // Раскладываем по дням/слотам
    const byCategory: Record<string, typeof scored> = {};
    for (const e of scored) {
      const cat = e.category || 'EXCURSION';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(e);
    }

    const usedIds = new Set<string>();
    const result: any[] = [];

    for (let d = 1; d <= dayCount; d++) {
      const slots =
        slotsPerDay <= 2
          ? ['MORNING', 'AFTERNOON']
          : slotsPerDay >= 4
            ? ['MORNING', 'AFTERNOON', 'AFTERNOON', 'EVENING']
            : ['MORNING', 'AFTERNOON', 'EVENING'];

      for (const slot of slots) {
        const prefCat = Object.entries(CATEGORY_SLOT_PREF).find(([, s]) => s === slot)?.[0];

        let picked: typeof scored[number] | undefined;

        // Предпочтительная категория
        if (prefCat && byCategory[prefCat]) {
          picked = byCategory[prefCat].find((e) => !usedIds.has(e.id));
        }

        // Любой из общего пула (по скору)
        if (!picked) {
          picked = scored.find((e) => !usedIds.has(e.id));
        }

        if (!picked) break;

        usedIds.add(picked.id);
        result.push({
          eventId: picked.id,
          dayNumber: d,
          slot,
          time: SLOT_TIMES[slot] || '10:00',
        });
      }
    }

    return result;
  }

  // ==========================================
  // Response builder
  // ==========================================

  private async buildComboResponse(combo: any, curatedItems: any[]) {
    const eventIds = curatedItems.map((c: any) => c.eventId).filter(Boolean);
    const events =
      eventIds.length > 0
        ? await this.prisma.event.findMany({
            where: { id: { in: eventIds }, isActive: true },
            include: {
              sessions: {
                where: { isActive: true },
                orderBy: { startsAt: 'asc' },
                take: 5,
              },
              city: { select: { slug: true, name: true } },
            },
          })
        : [];

    const eventMap = new Map(events.map((e) => [e.id, e]));
    const dayMap = new Map<number, any[]>();

    for (const item of curatedItems) {
      const dayNum = item.dayNumber || 1;
      if (!dayMap.has(dayNum)) dayMap.set(dayNum, []);

      const event = eventMap.get(item.eventId);
      if (!event) continue;

      const session = event.sessions[0];
      const adultPrice = getPriceByTypeKopecks(session?.prices, 'adult');

      dayMap.get(dayNum)!.push({
        slot: item.slot || 'MORNING',
        time: item.time || SLOT_TIMES[item.slot] || '10:00',
        event: {
          id: event.id,
          slug: event.slug,
          title: event.title,
          category: event.category,
          imageUrl: event.imageUrl,
          priceFrom: event.priceFrom,
          rating: Number(event.rating),
          reviewCount: event.reviewCount,
          durationMinutes: event.durationMinutes,
          city: event.city,
        },
        session: session
          ? {
              id: session.id,
              startsAt: session.startsAt,
              availableTickets: session.availableTickets,
              prices: session.prices,
            }
          : null,
        adultPrice,
      });
    }

    const days: any[] = [];
    for (const [dayNum, slots] of dayMap) {
      days.push({
        dayNumber: dayNum,
        slots: slots.sort((a, b) => {
          const order: Record<string, number> = { MORNING: 0, AFTERNOON: 1, EVENING: 2 };
          return (order[a.slot] || 0) - (order[b.slot] || 0);
        }),
      });
    }
    days.sort((a, b) => a.dayNumber - b.dayNumber);

    const totalBase = days.reduce(
      (sum, d) => sum + d.slots.reduce((s: number, sl: any) => s + (sl.adultPrice || 0), 0),
      0,
    );

    const breakdown = await this.pricing.calculateBreakdown(combo.suggestedPrice || totalBase * 2, 2);
    const upsells = await this.pricing.getUpsells(combo.city.slug);

    return {
      ...combo,
      days,
      pricing: breakdown,
      upsells,
      availableEvents: events.length,
      totalCuratedEvents: curatedItems.length,
    };
  }

}
