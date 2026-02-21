import { Injectable, Logger } from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { TepApiService, TepEvent, TepCity } from './tep-api.service';
import { normalizeEventTitle } from '@daibilet/shared';
import { EventCategory, EventSubcategory, EventAudience, Prisma } from '@prisma/client';

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
  private readonly tepSiteUrl = process.env.TEP_SITE_URL || 'https://teplohod.info';

  /** Кэш tepCityId → наш cityId (UUID) */
  private cityCache = new Map<number, string>();

  /** Кэш маппинга tep-XXX → tepWidgetId из teplohod-widgets.json */
  private widgetsMappingCache: Record<string, number> | null = null;

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
   * Загрузить маппинг tep-XXX → tepWidgetId из teplohod-widgets.json.
   * Используется для проверки виджета, если tepWidgetId ещё не в widgetPayload (seed не запущен).
   */
  private getTeplohodWidgetsMapping(): Record<string, number> {
    if (this.widgetsMappingCache != null) return this.widgetsMappingCache;
    const paths = [
      join(process.cwd(), 'prisma', 'teplohod-widgets.json'),
      join(__dirname, '../../prisma', 'teplohod-widgets.json'),
    ];
    for (const p of paths) {
      if (existsSync(p)) {
        try {
          const raw = readFileSync(p, 'utf-8');
          const data = JSON.parse(raw) as Record<string, number | string>;
          const out: Record<string, number> = {};
          for (const [k, v] of Object.entries(data)) {
            const num = typeof v === 'number' ? v : parseInt(String(v), 10);
            if (!Number.isNaN(num)) out[k] = num;
          }
          this.widgetsMappingCache = out;
          return out;
        } catch (e) {
          this.logger.warn(`Не удалось загрузить ${p}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }
    this.widgetsMappingCache = {};
    return {};
  }

  /**
   * Полная синхронизация всех событий из teplohod.info.
   *
   * Оптимизация: один запрос к API (teplohod возвращает все события
   * независимо от city_id), город определяется по eventPlaces[0].city_id.
   *
   * @param signal — опционально, для отмены при job timeout
   */
  async syncAll(signal?: AbortSignal): Promise<{
    status: string;
    citiesFetched: number;
    eventsFound: number;
    eventsSynced: number;
    sessionsCreated: number;
    newCitiesCreated: string[];
    errors: string[];
  }> {
    this.logger.log('=== Начинаю синхронизацию из teplohod.info ===');
    this.cityCache.clear();
    this.widgetsMappingCache = null;

    const errors: string[] = [];
    const newCitiesCreated: string[] = [];
    let totalSynced = 0;
    let totalSessions = 0;

    // 1. Получаем города из TEP API и маппим в нашу БД
    let tepCities: TepCity[] = [];
    try {
      tepCities = await this.tepApi.getCities(signal);
      this.logger.log(`TEP: ${tepCities.length} городов`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        status: 'error',
        citiesFetched: 0,
        eventsFound: 0,
        eventsSynced: 0,
        sessionsCreated: 0,
        newCitiesCreated: [],
        errors: [`Загрузка городов: ${msg}`],
      };
    }

    for (const tepCity of tepCities) {
      const created = await this.ensureCity(tepCity);
      if (created) newCitiesCreated.push(created);
    }

    // 2. Один запрос — все события (teplohod API игнорирует city_id)
    let allEvents: TepEvent[] = [];
    try {
      allEvents = await this.tepApi.getEvents(undefined, signal);
      this.logger.log(`TEP: ${allEvents.length} событий загружено`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        status: 'error',
        citiesFetched: tepCities.length,
        eventsFound: 0,
        eventsSynced: 0,
        sessionsCreated: 0,
        newCitiesCreated,
        errors: [`Загрузка событий: ${msg}`],
      };
    }

    // 3. Синхронизируем каждое событие, определяя город из eventPlaces
    for (const tepEvent of allEvents) {
      try {
        // Определяем город по eventPlaces[0].city_id
        const placeCityId = tepEvent.eventPlaces?.[0]?.city_id;
        let cityId: string | undefined;

        if (placeCityId) {
          cityId = this.cityCache.get(placeCityId);
        }

        // Fallback: определяем город по ключевым словам в place/title/description
        if (!cityId) {
          const detectedCityId = this.detectCityFromText(tepEvent);
          if (detectedCityId) {
            cityId = this.cityCache.get(detectedCityId);
          }
        }

        // Финальный fallback: Москва (основной город teplohod.info)
        if (!cityId) {
          cityId = this.cityCache.get(1);
        }

        if (!cityId) {
          errors.push(`[tep-${tepEvent.id}] No city mapping for place.city_id=${placeCityId}`);
          continue;
        }

        const sessions = await this.syncEvent(tepEvent, cityId);
        if (sessions >= 0) {
          totalSynced++;
          totalSessions += sessions;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`[tep-${tepEvent.id}] ${tepEvent.title}: ${msg}`);
        this.logger.warn(`Ошибка tep-${tepEvent.id}: ${msg}`);
      }
    }

    this.logger.log(
      `=== TEP синхронизация: ${totalSynced}/${allEvents.length} событий, ${totalSessions} сессий ===`,
    );

    return {
      status: 'ok',
      citiesFetched: tepCities.length,
      eventsFound: allEvents.length,
      eventsSynced: totalSynced,
      sessionsCreated: totalSessions,
      newCitiesCreated,
      errors,
    };
  }

  /**
   * Синхронизация одного события из teplohod.info.
   * @returns количество созданных сессий, или -1 при ошибке
   */
  private async syncEvent(tep: TepEvent, cityId: string): Promise<number> {
    const sourceId = `tep-${tep.id}`;
    const title = normalizeEventTitle(tep.title || '');
    if (!title) return -1;

    const description = this.cleanDescription(tep.description);
    const { category, subcategories, audience } = this.classifyTep(tep);
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
          cityId,
          title,
          description,
          category,
          subcategories,
          audience,
          durationMinutes,
          lat,
          lng,
          address,
          imageUrl,
          galleryUrls,
          priceFrom,
          isActive: true,
          tcData: tep as unknown as Prisma.InputJsonValue,
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
          subcategories,
          audience,
          durationMinutes,
          lat,
          lng,
          address,
          imageUrl,
          galleryUrls,
          priceFrom,
          isActive: true,
          tcData: tep as unknown as Prisma.InputJsonValue,
          lastSyncAt: new Date(),
        },
      });
    }

    // Upsert EventOffer (мульти-офферная архитектура).
    // purchaseType = WIDGET — единственный вариант для TEPLOHOD.
    // Если embed не работает, событие будет скрыто (DISABLED) проверкой ниже.
    const eventRecord = existing
      ? existing
      : await this.prisma.event.findUnique({ where: { tcEventId: sourceId }, select: { id: true } });
    if (eventRecord) {
      const offer = await this.prisma.eventOffer.findUnique({
        where: { source_externalEventId: { source: 'TEPLOHOD', externalEventId: sourceId } },
        select: { widgetPayload: true },
      });
      const basePayload = (offer?.widgetPayload as Record<string, unknown>) || {};
      const mergedPayload = {
        ...basePayload,
        v: (basePayload.v as number) ?? 1,
        tepEventId: tep.id,
        ...(basePayload.tepWidgetId != null && { tepWidgetId: basePayload.tepWidgetId }),
      };

      await this.prisma.eventOffer.upsert({
        where: {
          source_externalEventId: { source: 'TEPLOHOD', externalEventId: sourceId },
        },
        update: {
          eventId: eventRecord.id,
          purchaseType: 'WIDGET',
          priceFrom,
          deeplink: `${this.tepSiteUrl}/event/${tep.id}`,
          widgetProvider: 'TEPLOHOD',
          widgetPayload: mergedPayload as unknown as Prisma.InputJsonValue,
          externalData: tep as unknown as Prisma.InputJsonValue,
          lastSyncAt: new Date(),
        },
        create: {
          eventId: eventRecord.id,
          source: 'TEPLOHOD',
          purchaseType: 'WIDGET',
          externalEventId: sourceId,
          deeplink: `${this.tepSiteUrl}/event/${tep.id}`,
          widgetProvider: 'TEPLOHOD',
          widgetPayload: { tepEventId: tep.id } as unknown as Prisma.InputJsonValue,
          priceFrom,
          isPrimary: true,
          status: 'ACTIVE',
          externalData: tep as unknown as Prisma.InputJsonValue,
          lastSyncAt: new Date(),
        },
      });
    }

    // Создаём сессии из расписания (eventTimes) или виртуальную сессию
    const hasRealSchedule = !!tep.eventTimes?.length;
    const sessionCount = await this.syncSession(sourceId, tep, prices);
    this.logger.debug(`tep-${tep.id}: ${sessionCount} sessions (real=${hasRealSchedule})`);

    // Проверка виджета teplohod.info по tepWidgetId (account.teplohod.info/widget/embed/{tepWidgetId}).
    // tepWidgetId — из widgetPayload (seed-teplohod-widgets) или teplohod-widgets.json.
    if (eventRecord) {
      const offerAfter = await this.prisma.eventOffer.findUnique({
        where: { source_externalEventId: { source: 'TEPLOHOD', externalEventId: sourceId } },
        select: { widgetPayload: true },
      });
      const payload = (offerAfter?.widgetPayload as Record<string, unknown>) || {};
      const tepWidgetId =
        (payload.tepWidgetId as number | string | null | undefined) ??
        this.getTeplohodWidgetsMapping()[sourceId];

      let offerStatus: 'ACTIVE' | 'DISABLED' = 'ACTIVE';
      let eventIsActive = true;

      if (tepWidgetId != null) {
        try {
          const widgetStatus = await this.tepApi.checkWidgetStatusByTepWidgetId(tepWidgetId);
          if (widgetStatus === 'working') {
            offerStatus = 'ACTIVE';
            eventIsActive = true;
          } else {
            offerStatus = 'DISABLED';
            eventIsActive = false;
            this.logger.debug(
              `tep-${tep.id}: виджет ${tepWidgetId} → ${widgetStatus}, скрываем`,
            );
          }
        } catch (err) {
          this.logger.warn(
            `tep-${tep.id}: ошибка проверки виджета ${tepWidgetId}: ${err instanceof Error ? err.message : String(err)}`,
          );
          // При ошибке сети оставляем ACTIVE — не скрываем из-за временных сбоев
        }
      }

      await this.prisma.eventOffer.updateMany({
        where: { source: 'TEPLOHOD', externalEventId: sourceId },
        data: { purchaseType: 'WIDGET', status: offerStatus },
      });

      const ev = await this.prisma.event.findUnique({
        where: { tcEventId: sourceId },
        select: { isActive: true },
      });
      if (ev) {
        const needReactivate = !ev.isActive && eventIsActive;
        const needDeactivate = ev.isActive && !eventIsActive;
        if (needReactivate) {
          this.logger.log(`tep-${tep.id}: реактивируем`);
          await this.prisma.event.update({
            where: { tcEventId: sourceId },
            data: { isActive: true },
          });
          await this.prisma.eventSession.updateMany({
            where: { eventId: eventRecord.id, tcSessionId: { startsWith: sourceId } },
            data: { isActive: true },
          });
        } else if (needDeactivate) {
          await this.prisma.event.update({
            where: { tcEventId: sourceId },
            data: { isActive: false },
          });
          await this.prisma.eventSession.updateMany({
            where: { eventId: eventRecord.id, tcSessionId: { startsWith: sourceId } },
            data: { isActive: false },
          });
        }
      }
    }

    // Теги из фич
    await this.syncFeatureTags(sourceId, tep.eventFeatures || []);

    // Теги по ключевым словам (title + description)
    await this.syncKeywordTags(sourceId, tep.title || '', this.cleanDescription(tep.description || ''));

    return sessionCount;
  }

  /**
   * Создать/обновить сессии из eventTimes (реальное расписание)
   * или fallback на виртуальную сессию если eventTimes отсутствует.
   *
   * Используем batch INSERT ... ON CONFLICT для производительности.
   */
  private async syncSession(
    sourceId: string,
    tep: TepEvent,
    prices: any[],
  ): Promise<number> {
    const event = await this.prisma.event.findUnique({
      where: { tcEventId: sourceId },
      select: { id: true },
    });
    if (!event) return 0;

    const offer = await this.prisma.eventOffer.findUnique({
      where: { source_externalEventId: { source: 'TEPLOHOD', externalEventId: sourceId } },
      select: { id: true },
    });

    const now = new Date();
    const pricesJson = JSON.stringify(prices);

    // Если есть eventTimes — создаём реальные сессии батчем
    if (tep.eventTimes?.length) {
      const durationMinutes = tep.duration > 0 ? tep.duration : 60;
      const rows: {
        tcSessionId: string;
        startsAt: Date;
        endsAt: Date;
        availableTickets: number;
        isActive: boolean;
      }[] = [];

      for (const slot of tep.eventTimes) {
        const startsAt = new Date(slot.datetime);
        if (startsAt <= now) continue;

        rows.push({
          tcSessionId: `${sourceId}-${slot.id}`,
          startsAt,
          endsAt: new Date(startsAt.getTime() + durationMinutes * 60000),
          availableTickets: slot.available_tickets || 0,
          isActive: (slot.available_tickets || 0) > 0,
        });
      }

      if (rows.length === 0) {
        // Нет будущих слотов — деактивируем все сессии (событие скроется из каталога)
        await this.prisma.eventSession.updateMany({
          where: { eventId: event.id, tcSessionId: { startsWith: sourceId } },
          data: { isActive: false },
        });
        return 0;
      }

      const seenIds = rows.map((r) => r.tcSessionId);

      // Batch upsert через параметризованный Prisma.sql (без интерполяции строк)
      const offerId = offer?.id ?? null;
      const valuesSql = Prisma.join(
        rows.map(
          (r) =>
            Prisma.sql`(gen_random_uuid(), ${event.id}::uuid, ${offerId}::uuid, ${r.tcSessionId}, ${r.startsAt}::timestamptz, ${r.endsAt}::timestamptz, ${r.availableTickets}::int, ${pricesJson}::jsonb, ${r.isActive}, NOW(), NOW())`,
        ),
      );

      await this.prisma.$executeRaw`
        INSERT INTO event_sessions ("id", "eventId", "offerId", "tcSessionId", "startsAt", "endsAt", "availableTickets", "prices", "isActive", "createdAt", "updatedAt")
        VALUES ${valuesSql}
        ON CONFLICT ("tcSessionId") DO UPDATE SET
          "offerId" = EXCLUDED."offerId",
          "startsAt" = EXCLUDED."startsAt",
          "endsAt" = EXCLUDED."endsAt",
          "availableTickets" = EXCLUDED."availableTickets",
          "prices" = EXCLUDED."prices",
          "isActive" = EXCLUDED."isActive",
          "updatedAt" = NOW()
      `;

      // Деактивируем старую «виртуальную» main-сессию
      await this.prisma.eventSession.updateMany({
        where: { tcSessionId: `${sourceId}-main` },
        data: { isActive: false },
      });

      // Деактивируем сессии, которые больше не в расписании
      await this.prisma.eventSession.updateMany({
        where: {
          eventId: event.id,
          tcSessionId: { startsWith: sourceId, notIn: seenIds },
          isActive: true,
        },
        data: { isActive: false },
      });

      return rows.length;
    }

    // Fallback: compact API — виртуальная сессия
    const sessionId = `${sourceId}-main`;
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const totalVacant = tep.eventTickets?.reduce(
      (sum, t) => sum + (t.is_attached ? 0 : 1),
      0,
    ) ?? 0;
    const hasAvailableSlots = totalVacant > 0;

    const existing = await this.prisma.eventSession.findUnique({
      where: { tcSessionId: sessionId },
      select: { startsAt: true },
    });
    const startsAt = (existing && new Date(existing.startsAt) > now)
      ? existing.startsAt
      : tomorrow;

    await this.prisma.eventSession.upsert({
      where: { tcSessionId: sessionId },
      update: {
        offerId: offer?.id ?? undefined,
        prices,
        availableTickets: totalVacant * 10,
        isActive: hasAvailableSlots,
        startsAt,
      },
      create: {
        eventId: event.id,
        offerId: offer?.id ?? undefined,
        tcSessionId: sessionId,
        startsAt: tomorrow,
        availableTickets: totalVacant * 10,
        prices,
        isActive: hasAvailableSlots,
      },
    });
    return 1;
  }

  /**
   * Маппинг ключевых слов (title+description) → slug тегов.
   * Совпадает с TC Sync для единообразия.
   */
  private static readonly KEYWORD_TAG_MAP: Record<string, string[]> = {
    'ночн': ['nochnye', 'night'],
    'ночь': ['night'],
    'полуночн': ['night'],
    night: ['night'],
    'теплоход': ['panoramnyi', 'water'],
    'речн': ['panoramnyi', 'water'],
    'катер': ['water'],
    'яхт': ['water'],
    'водн': ['water'],
    'по неве': ['water', 'panoramnyi'],
    'по реке': ['water'],
    'по каналам': ['water'],
    boat: ['water'],
    river: ['water'],
    'романтик': ['romantika', 'romantic'],
    'свидан': ['romantika', 'romantic'],
    'для двоих': ['romantika', 'romantic'],
    romantic: ['romantic'],
    'с гидом': ['with-guide'],
    'экскурсовод': ['with-guide'],
    'сопровожден': ['with-guide'],
    'гид ': ['with-guide'],
    guided: ['with-guide'],
    'закрыт': ['bad-weather-ok'],
    'в помещени': ['bad-weather-ok'],
    'крытый': ['bad-weather-ok'],
    indoor: ['bad-weather-ok'],
    'обзорн': ['first-time-city'],
    'знакомство с город': ['first-time-city'],
    'главные достопримечательност': ['first-time-city'],
    'must see': ['first-time-city'],
    'топ ': ['first-time-city'],
    'лучшие места': ['first-time-city'],
    'интерактив': ['interactive'],
    'квест': ['kvesty', 'interactive'],
    interactive: ['interactive'],
    quest: ['interactive'],
    'аудиогид': ['audioguide'],
    'аудио-гид': ['audioguide'],
    audioguide: ['audioguide'],
    'audio guide': ['audioguide'],
    'без очеред': ['no-queue'],
    'приоритетн': ['no-queue'],
    'skip the line': ['no-queue'],
    'fast track': ['no-queue'],
    'с обедом': ['s-pitaniem'],
    'с ужином': ['s-pitaniem'],
    'живая музыка': ['zhivaya-muzyka'],
    'кафе': ['kafe-bar'],
    'бар': ['kafe-bar'],
    'панорам': ['panoramnyi'],
  };

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
        .catch((e) => this.logger.error('tag sync failed: ' + (e as Error).message));
    }
  }

  /**
   * Auto-assign tags by keyword matching in title+description.
   */
  private async syncKeywordTags(sourceId: string, title: string, description: string): Promise<void> {
    const event = await this.prisma.event.findUnique({
      where: { tcEventId: sourceId },
      select: { id: true },
    });
    if (!event) return;

    const text = `${title} ${description}`.toLowerCase();
    const slugsToLink = new Set<string>();
    const isBusTour = ['автобус', 'bus', 'hop-on', 'hop on'].some((w) => text.includes(w));

    for (const [keyword, slugs] of Object.entries(TepSyncService.KEYWORD_TAG_MAP)) {
      if (text.includes(keyword)) {
        for (const s of slugs) {
          if (isBusTour && s === 'water') continue;
          slugsToLink.add(s);
        }
      }
    }

    if (isBusTour) {
      const waterTag = await this.prisma.tag.findFirst({ where: { slug: 'water', isActive: true } });
      if (waterTag) {
        await this.prisma.eventTag.deleteMany({ where: { eventId: event.id, tagId: waterTag.id } });
      }
    }

    for (const slug of slugsToLink) {
      const tag = await this.prisma.tag.findFirst({ where: { slug, isActive: true } });
      if (tag) {
        await this.prisma.eventTag
          .upsert({
            where: { eventId_tagId: { eventId: event.id, tagId: tag.id } },
            update: {},
            create: { eventId: event.id, tagId: tag.id },
          })
          .catch((e) => this.logger.error('tag sync failed: ' + (e as Error).message));
      }
    }
  }

  // ========================
  // Хелперы
  // ========================

  /**
   * Маппинг ключевых слов → teplohod city_id.
   * Используется для событий без eventPlaces.
   */
  private static readonly CITY_KEYWORDS: { cityId: number; keywords: string[] }[] = [
    { cityId: 2, keywords: ['санкт-петербург', 'петербург', 'спб', 'невы', 'неве', 'невой', 'исаакиевск', 'крестовск', 'адмиралтейск', 'василеостровск', 'петроградск', 'эрмитаж', 'финский залив'] },
    { cityId: 4, keywords: ['казань', 'казани', 'казанск', 'татарстан'] },
    { cityId: 7, keywords: ['нижний новгород', 'нижнего новгорода', 'нижнем новгороде', 'минина и пожарского', 'дмитриевской башни'] },
    { cityId: 3, keywords: ['красноярск'] },
    { cityId: 5, keywords: ['череповец'] },
    { cityId: 6, keywords: ['пенза'] },
    { cityId: 8, keywords: ['чебоксар'] },
    { cityId: 9, keywords: ['сортавала'] },
    { cityId: 10, keywords: ['ярославль', 'ярославля'] },
    { cityId: 11, keywords: ['самара', 'самары'] },
    { cityId: 12, keywords: ['пермь', 'перми'] },
    { cityId: 13, keywords: ['суздаль'] },
    { cityId: 14, keywords: ['рыбинск'] },
    { cityId: 15, keywords: ['тула', 'тулы'] },
    { cityId: 16, keywords: ['владимир'] },
  ];

  /**
   * Определить город по тексту события (place, title, description, openDate.description).
   */
  private detectCityFromText(tep: TepEvent): number | null {
    const parts = [
      tep.place || '',
      tep.title || '',
      tep.description || '',
      (tep as Record<string, any>).openDate?.description || '',
      tep.schedule_description || '',
    ];
    const text = parts.join(' ').toLowerCase();

    for (const { cityId, keywords } of TepSyncService.CITY_KEYWORDS) {
      for (const kw of keywords) {
        if (text.includes(kw)) return cityId;
      }
    }
    return null; // Не определён → fallback на Москву
  }

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
   * Маппинг категорий teplohod.info → category + subcategory + audience.
   * teplohod.info — разнородный агрегатор: речные экскурсии, музеи, автобусы, мероприятия и т.д.
   */
  private classifyTep(tep: TepEvent): { category: EventCategory; subcategories: EventSubcategory[]; audience: EventAudience } {
    const cat = (tep.category || '').toLowerCase();
    const title = (tep.title || '').toLowerCase();
    const desc = (tep.description || '').toLowerCase();
    const text = `${title} ${desc} ${cat}`;

    // Detect audience
    const kidsMarkers = ['для детей', 'детский', 'детское', 'детская', 'детям', '0+', '3+'];
    const familyMarkers = ['семейн', 'family', 'для всей семьи'];
    let audience: EventAudience = 'ALL' as EventAudience;
    if (kidsMarkers.some((w) => text.includes(w))) {
      audience = 'KIDS' as EventAudience;
    } else if (familyMarkers.some((w) => text.includes(w))) {
      audience = 'FAMILY' as EventAudience;
    }

    // Мероприятия — выпускной, последний звонок, дискотека (даже на теплоходе) — проверяем ДО водных
    if (this.hasTep(text, ['выпускной', 'последний звонок', 'дискотек', 'disco']))
      return { category: EventCategory.EVENT, subcategories: [EventSubcategory.PARTY], audience };

    // Речная/водная экскурсия — только если в заголовке/описании есть «экскурсия»
    const isWater = this.hasTep(text, ['теплоход', 'речн', 'катер', 'корабл', 'яхт', 'водн', 'по неве', 'по реке', 'круиз', 'развод мостов', 'салют', 'палубн']);
    const hasExcursion = this.hasTep(text, ['экскурсия']);
    if (isWater && hasExcursion) {
      const subs: EventSubcategory[] = [EventSubcategory.RIVER];
      if (!this.hasTep(text, ['лагерь', 'camp', 'выездной']) && this.hasTep(text, ['гастро', 'гастрономич', 'дегустац', 'culinary', 'food tour']))
        subs.push(EventSubcategory.GASTRO);
      return { category: EventCategory.EXCURSION, subcategories: subs, audience };
    }

    // Музей и площадки (смотровая площадка = площадка, не мероприятие)
    if (cat.includes('музей') || title.includes('музей'))
      return { category: EventCategory.MUSEUM, subcategories: [EventSubcategory.MUSEUM_CLASSIC], audience };
    if (cat.includes('выставк') || title.includes('выставк'))
      return { category: EventCategory.MUSEUM, subcategories: [EventSubcategory.EXHIBITION], audience };
    if (this.hasTep(text, ['смотровая площадка', 'смотров', 'observation']))
      return { category: EventCategory.MUSEUM, subcategories: [EventSubcategory.ART_SPACE], audience };

    // Мероприятия
    if (this.hasTep(text, ['стендап', 'stand-up', 'stand up', 'комедия', 'comedy', 'комик']))
      return { category: EventCategory.EVENT, subcategories: [EventSubcategory.STANDUP], audience };
    if (this.hasTep(text, ['концерт', 'concert']))
      return { category: EventCategory.EVENT, subcategories: [EventSubcategory.CONCERT], audience };
    if (this.hasTep(text, ['шоу', 'show', 'представлен']))
      return { category: EventCategory.EVENT, subcategories: [EventSubcategory.SHOW], audience };
    if (this.hasTep(text, ['фестиваль', 'festival']))
      return { category: EventCategory.EVENT, subcategories: [EventSubcategory.FESTIVAL], audience };

    // Экстрим — только наземные (танк, квадроцикл и т.п.). Речные прогулки никогда не экстрим.
    if (this.hasTep(text, ['танк', 'танке', 'квадроцикл', 'стрельб', 'экстрим', 'броневик']))
      return { category: EventCategory.EXCURSION, subcategories: [EventSubcategory.EXTREME], audience };
    if (this.hasTep(text, ['автобус', 'bus', 'hop-on', 'hop on']) || (this.hasTep(text, ['обзорн']) && !isWater))
      return { category: EventCategory.EXCURSION, subcategories: [EventSubcategory.BUS], audience };

    // По умолчанию — EVENT. teplohod.info не только речные прогулки: музеи, площадки, мероприятия.
    return { category: EventCategory.EVENT, subcategories: [], audience };
  }

  private hasTep(text: string, words: string[]): boolean {
    return words.some((w) => text.includes(w));
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
