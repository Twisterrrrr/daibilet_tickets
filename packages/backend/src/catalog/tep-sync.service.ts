import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TepApiService, TepEvent, TepCity } from './tep-api.service';
import { EventCategory } from '@prisma/client';

/**
 * Синхронизация событий из teplohod.info → наша БД.
 *
 * Маппинг данных:
 *  - tep.id → tcEventId = "tep-{id}" (Event.source = TEPLOHOD)
 *  - tep.title → title
 *  - tep.description → description (plain text с \r\n)
 *  - tep.duration → durationMinutes
 *  - tep.category → mapCategory()
 *  - tep.place → venue name (хранится в tcData)
 *  - tep.images[0] → imageUrl, остальные → galleryUrls
 *  - tep.eventPlaces[0].lat/lng → lat/lng
 *  - tep.eventPlaces[0].address → address
 *  - min(eventTickets.price) → priceFrom (в копейках)
 *  - tep.eventTickets → session.prices (маппинг в наш формат)
 */
@Injectable()
export class TepSyncService {
  private readonly logger = new Logger(TepSyncService.name);

  /** Кэш tepCityId → наш cityId (UUID) */
  private cityCache = new Map<number, string>();

  /**
   * Маппинг city_id teplohod.info → наш slug.
   * ID из https://api.teplohod.info/v1/cities
   */
  private readonly CITY_MAP: Record<number, string> = {
    1: 'moscow',           // Москва
    2: 'saint-petersburg', // Санкт-Петербург (в API город с id=2 назван "Санкт-Петербург" но events city_id=2 при этом московские)
    3: 'krasnoyarsk',
    4: 'kazan',
    5: 'cherepovets',
    6: 'penza',
    7: 'nizhny-novgorod',
    8: 'cheboksary',
    9: 'sortavala',
    10: 'yaroslavl',
    11: 'samara',
    12: 'perm',
    13: 'suzdal',
    14: 'rybinsk',
    15: 'tula',
    16: 'vladimir',
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly tepApi: TepApiService,
  ) {}

  /**
   * Полная синхронизация всех городов из teplohod.info.
   */
  async syncAll(): Promise<{
    status: string;
    citiesFetched: number;
    eventsFound: number;
    eventsSynced: number;
    newCitiesCreated: string[];
    errors: string[];
  }> {
    this.logger.log('=== Начинаю синхронизацию из teplohod.info ===');
    this.cityCache.clear();

    const errors: string[] = [];
    const newCitiesCreated: string[] = [];
    let totalEvents = 0;
    let totalSynced = 0;

    // 1. Получаем города из TEP API
    let tepCities: TepCity[] = [];
    try {
      tepCities = await this.tepApi.getCities();
      this.logger.log(`TEP: ${tepCities.length} городов`);
    } catch (err: any) {
      return {
        status: 'error',
        citiesFetched: 0,
        eventsFound: 0,
        eventsSynced: 0,
        newCitiesCreated: [],
        errors: [`Загрузка городов: ${err.message}`],
      };
    }

    // 2. Создаём/находим города в нашей БД
    for (const tepCity of tepCities) {
      const created = await this.ensureCity(tepCity);
      if (created) newCitiesCreated.push(created);
    }

    // 3. Загружаем события по каждому городу
    for (const tepCity of tepCities) {
      const cityId = this.cityCache.get(tepCity.id);
      if (!cityId) continue;

      try {
        const events = await this.tepApi.getEvents(tepCity.id);
        this.logger.log(`TEP ${tepCity.name}: ${events.length} событий`);
        totalEvents += events.length;

        for (const tepEvent of events) {
          try {
            const ok = await this.syncEvent(tepEvent, cityId);
            if (ok) totalSynced++;
          } catch (err: any) {
            errors.push(`[tep-${tepEvent.id}] ${tepEvent.title}: ${err.message}`);
            this.logger.warn(`Ошибка tep-${tepEvent.id}: ${err.message}`);
          }
        }
      } catch (err: any) {
        errors.push(`Город ${tepCity.name}: ${err.message}`);
      }
    }

    this.logger.log(
      `=== TEP синхронизация: ${totalSynced}/${totalEvents} событий из ${tepCities.length} городов ===`,
    );

    return {
      status: 'ok',
      citiesFetched: tepCities.length,
      eventsFound: totalEvents,
      eventsSynced: totalSynced,
      newCitiesCreated,
      errors,
    };
  }

  /**
   * Синхронизация одного события из teplohod.info.
   */
  private async syncEvent(tep: TepEvent, cityId: string): Promise<boolean> {
    const sourceId = `tep-${tep.id}`;
    const title = tep.title?.trim();
    if (!title) return false;

    const description = this.cleanDescription(tep.description);
    const category = this.mapCategory(tep);
    const durationMinutes = tep.duration > 0 ? tep.duration : null;

    const slug = await this.generateUniqueSlug(title, sourceId);

    // Изображения
    const imageUrl = tep.images?.[0] || null;
    const galleryUrls = tep.images?.slice(1) || [];

    // Координаты и адрес из первого места
    const place = tep.eventPlaces?.[0];
    const lat = place?.lat ? parseFloat(place.lat) : null;
    const lng = place?.lng ? parseFloat(place.lng) : null;
    const address = place?.address || null;

    // Цены
    const priceFrom = this.extractMinPrice(tep.eventTickets);
    const prices = this.extractPrices(tep.eventTickets);

    // Upsert события
    const existing = await this.prisma.event.findUnique({
      where: { tcEventId: sourceId },
    });

    if (existing) {
      await this.prisma.event.update({
        where: { tcEventId: sourceId },
        data: {
          title,
          description,
          category,
          durationMinutes,
          lat,
          lng,
          address,
          imageUrl,
          galleryUrls,
          priceFrom,
          isActive: true,
          tcData: tep as any,
          lastSyncAt: new Date(),
        },
      });
    } else {
      await this.prisma.event.create({
        data: {
          source: 'TEPLOHOD',
          tcEventId: sourceId,
          cityId,
          title,
          slug,
          description,
          category,
          durationMinutes,
          lat,
          lng,
          address,
          imageUrl,
          galleryUrls,
          priceFrom,
          isActive: true,
          tcData: tep as any,
          lastSyncAt: new Date(),
        },
      });
    }

    // Создаём «виртуальную» сессию с ценами
    // (без привязки к конкретной дате — compact API не содержит расписание)
    await this.syncSession(sourceId, tep, prices);

    // Теги из фич
    await this.syncFeatureTags(sourceId, tep.eventFeatures || []);

    return true;
  }

  /**
   * Создать/обновить сессию (без расписания в compact-режиме).
   */
  private async syncSession(
    sourceId: string,
    tep: TepEvent,
    prices: any[],
  ): Promise<void> {
    const event = await this.prisma.event.findUnique({
      where: { tcEventId: sourceId },
      select: { id: true },
    });
    if (!event) return;

    const sessionId = `${sourceId}-main`;

    // В compact API нет расписания — создаём «открытую дату»
    // startsAt = завтра (чтобы не фильтровалось как прошлое)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const totalVacant = tep.eventTickets?.reduce((sum, t) => sum + (t.is_attached ? 0 : 1), 0) || 1;

    await this.prisma.eventSession.upsert({
      where: { tcSessionId: sessionId },
      update: {
        prices,
        availableTickets: totalVacant * 10, // приблизительно
        isActive: true,
      },
      create: {
        eventId: event.id,
        tcSessionId: sessionId,
        startsAt: tomorrow,
        availableTickets: totalVacant * 10,
        prices,
        isActive: true,
      },
    });
  }

  /**
   * Связать фичи teplohod.info (Кафе-бар, WC, Дискотека) с тегами.
   */
  private async syncFeatureTags(
    sourceId: string,
    features: { id: number; title: string }[],
  ): Promise<void> {
    const event = await this.prisma.event.findUnique({
      where: { tcEventId: sourceId },
      select: { id: true },
    });
    if (!event) return;

    const featureToTag: Record<string, string> = {
      'С обедом/ужином': 's-pitaniem',
      'Живая музыка': 'zhivaya-muzyka',
      'Дискотека': 'diskoteka',
      'Кафе-бар': 'kafe-bar',
      'Шоу-программа': 'shou-programma',
      'Можно с детской коляской': 's-detmi',
      'Панорамный теплоход': 'panoramnyi',
      'Ресторан-бар': 'restoran',
    };

    for (const feature of features) {
      const tagSlug = featureToTag[feature.title];
      if (!tagSlug) continue;

      let tag = await this.prisma.tag.findUnique({ where: { slug: tagSlug } });
      if (!tag) {
        tag = await this.prisma.tag.create({
          data: {
            slug: tagSlug,
            name: feature.title,
            category: 'THEME',
            isActive: true,
          },
        });
      }

      await this.prisma.eventTag
        .upsert({
          where: { eventId_tagId: { eventId: event.id, tagId: tag.id } },
          update: {},
          create: { eventId: event.id, tagId: tag.id },
        })
        .catch(() => {}); // ignore if already exists
    }
  }

  // ========================
  // Хелперы
  // ========================

  /**
   * Создать город если не существует.
   */
  private async ensureCity(tepCity: TepCity): Promise<string | null> {
    if (this.cityCache.has(tepCity.id)) return null;

    const slug = this.CITY_MAP[tepCity.id] || this.transliterate(tepCity.name);

    // Ищем по slug
    let city = await this.prisma.city.findUnique({ where: { slug } });
    if (!city) {
      // Ищем по имени
      city = await this.prisma.city.findFirst({
        where: { name: { equals: tepCity.name, mode: 'insensitive' } },
      });
    }

    if (city) {
      this.cityCache.set(tepCity.id, city.id);
      return null;
    }

    // Создаём новый город
    try {
      city = await this.prisma.city.create({
        data: {
          slug,
          name: tepCity.name,
          timezone: 'Europe/Moscow',
          isActive: true,
        },
      });
      this.cityCache.set(tepCity.id, city.id);
      this.logger.log(`+ Новый город (TEP): ${tepCity.name} (${slug})`);
      return slug;
    } catch {
      // Slug collision — добавляем суффикс
      const fallbackSlug = `${slug}-tep`;
      city = await this.prisma.city.create({
        data: {
          slug: fallbackSlug,
          name: tepCity.name,
          timezone: 'Europe/Moscow',
          isActive: true,
        },
      });
      this.cityCache.set(tepCity.id, city.id);
      return fallbackSlug;
    }
  }

  /**
   * Маппинг категорий teplohod.info → наши.
   */
  private mapCategory(tep: TepEvent): EventCategory {
    const cat = (tep.category || '').toLowerCase();
    const title = (tep.title || '').toLowerCase();

    if (cat.includes('смотров') || cat.includes('observation')) return 'EVENT';
    if (cat.includes('речн') || cat.includes('круиз') || cat.includes('теплоход')) return 'EXCURSION';
    if (cat.includes('музей') || cat.includes('выставк')) return 'MUSEUM';
    if (title.includes('экскурси')) return 'EXCURSION';
    if (title.includes('музей')) return 'MUSEUM';

    return 'EXCURSION'; // по умолчанию — большинство событий teplohod.info это прогулки
  }

  /**
   * Минимальная цена в копейках.
   */
  private extractMinPrice(tickets: TepEvent['eventTickets']): number | null {
    if (!tickets?.length) return null;

    const prices = tickets
      .map((t) => Math.round(parseFloat(t.price) * 100))
      .filter((p) => p > 0);

    return prices.length > 0 ? Math.min(...prices) : null;
  }

  /**
   * Все типы билетов → наш формат prices.
   */
  private extractPrices(tickets: TepEvent['eventTickets']): any[] {
    if (!tickets?.length) return [];

    return tickets.map((t) => ({
      setId: `tep-ticket-${t.id}`,
      name: t.title,
      price: Math.round(parseFloat(t.price) * 100),
      priceOrg: Math.round(parseFloat(t.price) * 100),
      priceExtra: 0,
      amount: 100, // teplohod.info не возвращает количество в compact
      amountVacant: 100,
      withSeats: false,
      strikePrice: t.strike_price
        ? Math.round(parseFloat(t.strike_price) * 100)
        : null,
    }));
  }

  /**
   * Очистка описания: \r\n → <br>, trim пробелов.
   */
  private cleanDescription(desc: string): string {
    if (!desc) return '';
    return desc
      .replace(/\r\n/g, '<br>')
      .replace(/\n/g, '<br>')
      .replace(/\t/g, '')
      .replace(/ {2,}/g, ' ')
      .trim();
  }

  /**
   * Генерация уникального slug.
   */
  private async generateUniqueSlug(title: string, fallbackId: string): Promise<string> {
    const base = this.transliterate(title).slice(0, 80) || `event-${fallbackId}`;

    const existing = await this.prisma.event.findUnique({ where: { slug: base } });
    if (!existing) return base;

    const slug2 = `${base.slice(0, 70)}-${fallbackId}`;
    const existing2 = await this.prisma.event.findUnique({ where: { slug: slug2 } });
    if (!existing2) return slug2;

    return `${base.slice(0, 56)}-${fallbackId}-${Date.now().toString(36)}`;
  }

  /**
   * Транслитерация кириллицы.
   */
  private transliterate(text: string): string {
    const map: Record<string, string> = {
      а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh',
      з: 'z', и: 'i', й: 'j', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
      п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts',
      ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu',
      я: 'ya',
    };

    return text
      .toLowerCase()
      .split('')
      .map((c) => map[c] ?? c)
      .join('')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');
  }
}
