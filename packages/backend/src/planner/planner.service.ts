import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService, MarkupContext } from '../pricing/pricing.service';
import { CalculatePlanDto } from './dto/calculate-plan.dto';

// ==========================================
// Planner Service — ядро Trip Planner
//
// Алгоритм:
// 1. Загрузить события → отфильтровать по городу/дате/возрасту/доступности
// 2. Скоринг каждого события для каждого слота
// 3. Генерация 3 вариантов: Эконом / Оптимальный / Премиум
// 4. Расчёт цен через PricingService
// ==========================================

interface ScoredEvent {
  event: any;
  session: any;
  score: number;
  adultPrice: number;
  childPrice: number;
}

type VariantTier = 'economy' | 'optimal' | 'premium';

const SLOT_TIMES: Record<string, string> = {
  MORNING: '10:00',
  AFTERNOON: '14:00',
  EVENING: '19:00',
  LATE_AFTERNOON: '16:00',
};

const SLOT_RANGES: Record<string, { start: number; end: number }> = {
  MORNING: { start: 9, end: 12 },
  AFTERNOON: { start: 13, end: 17 },
  EVENING: { start: 18, end: 23 },
};

// Насколько хорошо категория события подходит для слота (0-30)
const CATEGORY_SLOT_FIT: Record<string, Record<string, number>> = {
  MUSEUM:     { MORNING: 28, AFTERNOON: 22, EVENING: 8 },
  EXCURSION:  { MORNING: 20, AFTERNOON: 28, EVENING: 18 },
  EVENT:      { MORNING: 8, AFTERNOON: 15, EVENING: 30 },
};

const VARIANT_CONFIG: Record<VariantTier, { name: string; priceWeight: number; ratingWeight: number }> = {
  economy:  { name: 'Эконом', priceWeight: -0.4, ratingWeight: 0.2 },
  optimal:  { name: 'Оптимальный', priceWeight: 0.0, ratingWeight: 0.4 },
  premium:  { name: 'Премиум', priceWeight: 0.3, ratingWeight: 0.5 },
};

@Injectable()
export class PlannerService {
  private readonly logger = new Logger(PlannerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
  ) {}

  /**
   * Подобрать программу посещения города.
   */
  async calculate(dto: CalculatePlanDto) {
    const { city, dateFrom, dateTo, adults, children, childrenAges, intensity } = dto;
    const totalPersons = adults + (children || 0);

    // 1. Параметры дат
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    const dayCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const minChildAge = childrenAges?.length ? Math.min(...childrenAges) : 99;

    this.logger.log(
      `Planner: city=${city}, ${dateFrom}→${dateTo} (${dayCount}д), ` +
      `${adults}+${children || 0}, intensity=${intensity}`,
    );

    // 2. Загрузить события с сессиями
    const events = await this.prisma.event.findMany({
      where: {
        city: { slug: city },
        isActive: true,
        minAge: { lte: minChildAge },
        sessions: {
          some: {
            startsAt: { gte: start, lte: end },
            isActive: true,
            availableTickets: { gte: totalPersons },
          },
        },
      },
      include: {
        sessions: {
          where: {
            startsAt: { gte: start, lte: end },
            isActive: true,
            availableTickets: { gte: totalPersons },
          },
          orderBy: { startsAt: 'asc' },
        },
        city: { select: { slug: true, name: true } },
        tags: { include: { tag: true } },
      },
      orderBy: { rating: 'desc' },
    });

    if (events.length === 0) {
      return {
        variants: [],
        meta: {
          city, dateFrom, dateTo, dayCount, adults, children: children || 0,
          intensity, availableEventsCount: 0,
          message: 'Не найдено доступных событий для указанных параметров.',
        },
      };
    }

    this.logger.log(`Найдено ${events.length} подходящих событий`);

    // 3. Настройки интенсивности
    const iConfig = this.getIntensityConfig(intensity);

    // 4. Генерировать 3 варианта
    const tiers: VariantTier[] = ['economy', 'optimal', 'premium'];
    const variants = [];

    for (const tier of tiers) {
      const variant = await this.buildVariant(
        tier, events, start, dayCount, iConfig, adults, children || 0, city, dateFrom,
      );
      if (variant && variant.days.some(d => d.slots.length > 0)) {
        variants.push(variant);
      }
    }

    // Убрать дубликаты (если economy = optimal из-за малого выбора)
    const uniqueVariants = this.deduplicateVariants(variants);

    return {
      variants: uniqueVariants,
      upsells: await this.pricing.getUpsells(city),
      meta: {
        city,
        dateFrom,
        dateTo,
        dayCount,
        adults,
        children: children || 0,
        intensity,
        availableEventsCount: events.length,
        variantsGenerated: uniqueVariants.length,
        message: `Сформировано ${uniqueVariants.length} вариант(ов) из ${events.length} событий.`,
      },
    };
  }

  /**
   * Заменить событие в слоте.
   */
  async customize(body: {
    variant: any;
    dayNumber: number;
    slotIndex: number;
    newEventId: string;
  }) {
    const event = await this.prisma.event.findUnique({
      where: { id: body.newEventId },
      include: {
        sessions: { where: { isActive: true }, orderBy: { startsAt: 'asc' } },
        city: { select: { slug: true, name: true } },
      },
    });

    if (!event || event.sessions.length === 0) {
      return { success: false, message: 'Событие не найдено или нет доступных сессий' };
    }

    // Найти день и слот
    const day = body.variant.days?.find((d: any) => d.dayNumber === body.dayNumber);
    if (!day || !day.slots[body.slotIndex]) {
      return { success: false, message: 'Слот не найден' };
    }

    const slot = day.slots[body.slotIndex];
    const session = event.sessions[0];
    const prices = (session.prices as Array<{ type: string; price?: number }>) || [];
    const adultPrice = prices.find((p) => p.type === 'adult')?.price || 0;
    const childPrice = prices.find((p) => p.type === 'child')?.price || adultPrice;

    // Пересчитать
    const adultTotal = adultPrice * (slot.tickets?.adult?.count || 1);
    const childTotal = childPrice * (slot.tickets?.child?.count || 0);
    const subtotal = adultTotal + childTotal;

    // Заменить
    slot.event = this.mapEventToListItem(event);
    slot.session = this.mapSession(session);
    slot.tickets = {
      adult: { count: slot.tickets?.adult?.count || 1, unitPrice: adultPrice, total: adultTotal },
      child: { count: slot.tickets?.child?.count || 0, unitPrice: childPrice, total: childTotal },
    };
    slot.subtotal = subtotal;

    // Пересчитать итого
    const totalPrice = body.variant.days.reduce(
      (sum: number, d: any) => sum + d.slots.reduce((s: number, sl: any) => s + (sl.subtotal || 0), 0),
      0,
    );

    const breakdown = await this.pricing.calculateBreakdown(totalPrice, slot.tickets.adult.count + slot.tickets.child.count);

    body.variant.totalPrice = breakdown.basePrice;
    body.variant.serviceFee = breakdown.serviceFee;
    body.variant.grandTotal = breakdown.grandTotal;
    body.variant.perPerson = breakdown.perPerson;

    return { success: true, variant: body.variant };
  }

  // ==========================================
  // Построение варианта
  // ==========================================

  private async buildVariant(
    tier: VariantTier,
    allEvents: any[],
    startDate: Date,
    dayCount: number,
    intensityConfig: ReturnType<typeof this.getIntensityConfig>,
    adults: number,
    children: number,
    citySlug: string,
    dateFrom: string,
  ) {
    const config = VARIANT_CONFIG[tier];
    const totalPersons = adults + children;
    const usedEventIds = new Set<string>();
    const days = [];
    let totalBasePrice = 0;

    for (let d = 0; d < dayCount; d++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + d);
      const dateStr = date.toISOString().split('T')[0];

      const slotTypes = this.getSlotsForDay(intensityConfig);
      const slots = [];

      for (const slotType of slotTypes) {
        // Скоринг всех событий для этого слота
        const scored = this.scoreEventsForSlot(
          allEvents, slotType, date, config, usedEventIds, totalPersons,
        );

        if (scored.length === 0) continue;

        // Выбрать лучшее
        const best = scored[0];
        usedEventIds.add(best.event.id);

        const adultTotal = best.adultPrice * adults;
        const childTotal = best.childPrice * children;
        const subtotal = adultTotal + childTotal;
        totalBasePrice += subtotal;

        slots.push({
          slot: slotType,
          time: SLOT_TIMES[slotType] || '10:00',
          event: this.mapEventToListItem(best.event),
          session: this.mapSession(best.session),
          tickets: {
            adult: { count: adults, unitPrice: best.adultPrice, total: adultTotal },
            child: { count: children, unitPrice: best.childPrice, total: childTotal },
          },
          subtotal,
        });
      }

      days.push({
        date: dateStr,
        dayNumber: d + 1,
        slots,
      });
    }

    // Расчёт цен через PricingService
    const daysUntilTrip = this.pricing.daysUntilDate(dateFrom);
    const markupContext: MarkupContext = {
      dateFrom,
      citySlug,
      daysUntilTrip,
    };

    const breakdown = await this.pricing.calculateBreakdown(
      totalBasePrice, totalPersons, [], markupContext,
    );

    return {
      name: config.name,
      tier,
      totalPrice: breakdown.basePrice,
      serviceFee: breakdown.serviceFee,
      markup: breakdown.markup,
      grandTotal: breakdown.grandTotal,
      perPerson: breakdown.perPerson,
      estimatedCommission: breakdown.estimatedCommission,
      days,
    };
  }

  // ==========================================
  // Scoring
  // ==========================================

  /**
   * Скоринг событий для конкретного слота.
   * Возвращает отсортированный массив (лучшие первыми).
   */
  private scoreEventsForSlot(
    events: any[],
    slotType: string,
    date: Date,
    variantConfig: typeof VARIANT_CONFIG[VariantTier],
    usedEventIds: Set<string>,
    totalPersons: number,
  ): ScoredEvent[] {
    const scored: ScoredEvent[] = [];
    const slotRange = SLOT_RANGES[slotType];
    if (!slotRange) return scored;

    // Ценовой диапазон для нормализации
    const allPrices = events
      .map(e => this.getAdultPrice(e.sessions))
      .filter(p => p > 0);
    const maxPrice = Math.max(...allPrices, 1);
    const minPrice = Math.min(...allPrices, 0);
    const priceRange = maxPrice - minPrice || 1;

    for (const event of events) {
      if (usedEventIds.has(event.id)) continue;

      // Найти лучшую сессию для этого дня и слота
      const session = this.findBestSession(event.sessions, date, slotRange);
      if (!session) continue;

      // Проверить доступность
      if (session.availableTickets < totalPersons) continue;

      const adultPrice = this.getPriceByType(session.prices, 'adult');
      const childPrice = this.getPriceByType(session.prices, 'child') || adultPrice;

      if (adultPrice <= 0) continue;

      // Считаем скор
      let score = 0;

      // 1. Рейтинг (0-25 баллов)
      const rating = Number(event.rating) || 0;
      score += (rating / 5) * 25 * (1 + variantConfig.ratingWeight);

      // 2. Категория × слот (0-30 баллов)
      const catFit = CATEGORY_SLOT_FIT[event.category]?.[slotType] || 15;
      score += catFit;

      // 3. Ценовой фактор (0-20 баллов)
      const priceNorm = (adultPrice - minPrice) / priceRange; // 0..1
      // Эконом предпочитает дешёвые, премиум — дорогие
      score += (0.5 + variantConfig.priceWeight * (priceNorm - 0.5)) * 20;

      // 4. Популярность (0-10 баллов)
      const popularity = Math.min(event.reviewCount / 50, 1); // normalize to 0-1
      score += popularity * 10;

      // 5. Длительность: штраф если событие длиннее слота (0-(-10) баллов)
      if (event.durationMinutes) {
        const slotDuration = (slotRange.end - slotRange.start) * 60;
        if (event.durationMinutes > slotDuration) {
          score -= 5; // Штраф за перебор
        } else if (event.durationMinutes < 30) {
          score -= 3; // Слишком короткое — не стоит целого слота
        }
      }

      // 6. Бонус за наличие описания / изображения
      if (event.imageUrl) score += 2;
      if (event.description) score += 1;

      // 7. Фактор новизны (0-8 баллов) — новые события не теряются в тени старых
      if (event.createdAt) {
        const ageDays = (Date.now() - new Date(event.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        if (ageDays < 30) {
          score += 8 * (1 - ageDays / 30); // Max 8 баллов для совсем новых
        }
      }

      scored.push({ event, session, score, adultPrice, childPrice });
    }

    // Сортировка по скору (убывание)
    scored.sort((a, b) => b.score - a.score);

    return scored;
  }

  // ==========================================
  // Утилиты
  // ==========================================

  private findBestSession(sessions: any[], targetDate: Date, slotRange: { start: number; end: number }) {
    const targetDay = targetDate.toISOString().split('T')[0];

    // Сессии на нужный день в нужном временном диапазоне
    const candidates = sessions.filter(s => {
      const sDate = new Date(s.startsAt);
      const sDay = sDate.toISOString().split('T')[0];
      const sHour = sDate.getUTCHours();
      return sDay === targetDay && sHour >= slotRange.start && sHour < slotRange.end;
    });

    if (candidates.length > 0) return candidates[0];

    // Фолбэк: любая сессия на этот день
    const sameDaySessions = sessions.filter(s => {
      const sDay = new Date(s.startsAt).toISOString().split('T')[0];
      return sDay === targetDay;
    });

    return sameDaySessions[0] || null;
  }

  private getAdultPrice(sessions: any[]): number {
    for (const s of sessions) {
      const price = this.getPriceByType(s.prices, 'adult');
      if (price > 0) return price;
    }
    return 0;
  }

  private getPriceByType(prices: any, type: string): number {
    if (!Array.isArray(prices)) return 0;
    const found = prices.find((p: any) => p.type === type);
    return found?.price || 0;
  }

  private getSlotsForDay(config: ReturnType<typeof this.getIntensityConfig>): string[] {
    switch (config.slotsPerDay) {
      case 2: return ['MORNING', 'AFTERNOON'];
      case 4: return ['MORNING', 'AFTERNOON', 'LATE_AFTERNOON', 'EVENING'];
      default: return ['MORNING', 'AFTERNOON', 'EVENING']; // 3 слота
    }
  }

  private mapEventToListItem(event: any) {
    return {
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
    };
  }

  private mapSession(session: any) {
    return {
      id: session.id,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      availableTickets: session.availableTickets,
      prices: session.prices,
    };
  }

  /**
   * Убрать варианты-дубликаты (если мало событий, economy ≈ optimal).
   */
  private deduplicateVariants(variants: any[]): any[] {
    const seen = new Set<string>();
    return variants.filter(v => {
      // Fingerprint: набор eventId в порядке слотов
      const fp = v.days
        .flatMap((d: any) => d.slots.map((s: any) => s.event.id))
        .join(',');
      if (seen.has(fp)) return false;
      seen.add(fp);
      return true;
    });
  }

  private getIntensityConfig(intensity: string) {
    const configs: Record<string, { slotsPerDay: number; breakMinutes: number; eveningChance: number; startTime: string }> = {
      RELAXED: { slotsPerDay: 2, breakMinutes: 150, eveningChance: 0.3, startTime: '10:00' },
      NORMAL: { slotsPerDay: 3, breakMinutes: 75, eveningChance: 0.5, startTime: '09:30' },
      ACTIVE: { slotsPerDay: 4, breakMinutes: 45, eveningChance: 1.0, startTime: '09:00' },
    };
    return configs[intensity] || configs.NORMAL;
  }
}
