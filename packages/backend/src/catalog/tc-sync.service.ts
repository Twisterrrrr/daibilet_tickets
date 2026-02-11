import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TcApiService } from './tc-api.service';
import { EventCategory } from '@prisma/client';

/**
 * Сервис синхронизации данных из Ticketscloud в нашу БД.
 *
 * ДЕДУПЛИКАЦИЯ: в TC каждый сеанс мероприятия — отдельный «event» с уникальным ID.
 * Мы объединяем все TC-записи с одинаковым title + city в ОДНО Event,
 * а каждый TC-event становится отдельной EventSession.
 *
 * Master-event:
 * - tcEventId = первый (или лучший) TC event ID
 * - priceFrom = минимум из всех сеансов
 * - rating, reviewCount = максимум
 * - imageUrl, description = из лучшей записи
 */
@Injectable()
export class TcSyncService {
  private readonly logger = new Logger(TcSyncService.name);

  private readonly CITY_MAP: Record<number, string> = {
    524901: 'moscow',
    498817: 'saint-petersburg',
    551487: 'kazan',
    554234: 'kaliningrad',
  };

  /** Кэш geoId → cityId (UUID) */
  private cityCache = new Map<number, string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly tcApi: TcApiService,
  ) {}

  /**
   * Полный сброс.
   */
  async resetAll(): Promise<{ deletedEvents: number; deletedCities: number }> {
    this.logger.log('=== RESET: удаляю все события и авто-города ===');
    await this.prisma.articleEvent.deleteMany({});
    await this.prisma.eventTag.deleteMany({});
    await this.prisma.eventSession.deleteMany({});
    const evResult = await this.prisma.event.deleteMany({});
    const cityResult = await this.prisma.city.deleteMany({
      where: { description: null },
    });
    this.logger.log(`Удалено: ${evResult.count} событий, ${cityResult.count} городов`);
    return { deletedEvents: evResult.count, deletedCities: cityResult.count };
  }

  /**
   * Полная синхронизация с дедупликацией.
   *
   * 1. Загружаем ВСЕ события из TC API.
   * 2. Группируем по normalizedTitle + cityGeoId.
   * 3. Для каждой группы создаём/обновляем ОДНО Event.
   * 4. Каждый TC-event в группе → EventSession.
   */
  async syncAll(): Promise<{
    status: string;
    tcEventsFound: number;
    uniqueEvents: number;
    sessionsSynced: number;
    citiesTotal: number;
    newCitiesCreated: string[];
    errors: string[];
  }> {
    this.logger.log('=== Начинаю полную синхронизацию (с дедупликацией) ===');
    const errors: string[] = [];
    const newCitiesCreated: string[] = [];
    this.cityCache.clear();

    // Step 1: Загружаем все TC events
    let allTcEvents: any[] = [];
    try {
      allTcEvents = await this.tcApi.getEvents();
      this.logger.log(`Получено ${allTcEvents.length} TC-записей`);
    } catch (err: any) {
      this.logger.error(`Ошибка загрузки: ${err.message}`);
      return {
        status: 'error',
        tcEventsFound: 0,
        uniqueEvents: 0,
        sessionsSynced: 0,
        citiesTotal: 0,
        newCitiesCreated: [],
        errors: [err.message],
      };
    }

    if (allTcEvents.length === 0) {
      return {
        status: 'empty',
        tcEventsFound: 0,
        uniqueEvents: 0,
        sessionsSynced: 0,
        citiesTotal: 0,
        newCitiesCreated: [],
        errors: ['TC API вернул 0 событий'],
      };
    }

    // Step 2: Создаём недостающие города
    const seenGeoIds = new Set<number>();
    for (const ev of allTcEvents) {
      const geoId = ev?.venue?.city?.id;
      if (geoId && !seenGeoIds.has(geoId)) {
        seenGeoIds.add(geoId);
        const created = await this.ensureCity(geoId, ev);
        if (created) newCitiesCreated.push(created);
      }
    }

    this.logger.log(`Городов: ${this.cityCache.size}, новых: ${newCitiesCreated.length}`);

    // Step 3: Группируем TC-events по (normalizedTitle, cityGeoId)
    const groups = new Map<string, any[]>();
    for (const tc of allTcEvents) {
      const title = tc.title?.text?.trim() || '';
      if (!title) continue;
      const cityGeoId = tc?.venue?.city?.id;
      if (!cityGeoId) continue;

      const key = `${this.normalizeTitle(title)}:::${cityGeoId}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(tc);
    }

    this.logger.log(
      `Группировка: ${allTcEvents.length} TC-записей → ${groups.size} уникальных событий`,
    );

    // Step 4: Синхронизируем каждую группу
    let uniqueCount = 0;
    let sessionCount = 0;

    for (const [key, tcEvents] of groups) {
      try {
        const sessions = await this.syncEventGroup(tcEvents);
        uniqueCount++;
        sessionCount += sessions;
      } catch (err: any) {
        errors.push(`[${key}]: ${err.message}`);
        this.logger.warn(`Ошибка группы ${key}: ${err.message}`);
      }
    }

    this.logger.log(
      `=== Синхронизация: ${uniqueCount} событий, ${sessionCount} сессий ===`,
    );

    // Step 5: Автоматический retag — привязываем теги ко всем событиям
    let retagResult = { eventsProcessed: 0, tagsLinked: 0 };
    try {
      retagResult = await this.retagAll();
      this.logger.log(
        `=== Retag: ${retagResult.eventsProcessed} событий, ${retagResult.tagsLinked} тегов ===`,
      );
    } catch (err: any) {
      this.logger.warn(`Retag ошибка (не критично): ${err.message}`);
      errors.push(`retag: ${err.message}`);
    }

    return {
      status: 'ok',
      tcEventsFound: allTcEvents.length,
      uniqueEvents: uniqueCount,
      sessionsSynced: sessionCount,
      citiesTotal: this.cityCache.size,
      newCitiesCreated,
      errors,
    };
  }

  /**
   * Дедупликация: удаляет дубли из БД прямо сейчас.
   * Для каждой группы (title + cityId) оставляет одно мастер-событие,
   * переносит сессии из дублей в мастер, удаляет дубли.
   */
  async deduplicateExisting(): Promise<{
    groupsProcessed: number;
    duplicatesRemoved: number;
    sessionsMerged: number;
  }> {
    this.logger.log('=== Запуск дедупликации существующих событий ===');

    // Находим все события, группируем по нормализованному title + cityId
    const allEvents = await this.prisma.event.findMany({
      where: { isActive: true },
      select: { id: true, title: true, cityId: true, rating: true, reviewCount: true },
      orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
    });

    // Группируем по нормализованному названию + cityId
    const normalizedGroups = new Map<string, typeof allEvents>();
    for (const ev of allEvents) {
      const key = `${this.normalizeTitle(ev.title)}:::${ev.cityId}`;
      if (!normalizedGroups.has(key)) normalizedGroups.set(key, []);
      normalizedGroups.get(key)!.push(ev);
    }

    // Фильтруем только группы с дублями
    const dupeGroups = [...normalizedGroups.entries()]
      .filter(([, events]) => events.length > 1)
      .map(([key, events]) => ({ key, events }));

    this.logger.log(`Найдено ${dupeGroups.length} групп дублей (с нормализацией эмодзи)`);

    this.logger.log(`Найдено ${dupeGroups.length} групп дублей`);

    let groupsProcessed = 0;
    let duplicatesRemoved = 0;
    let sessionsMerged = 0;

    for (const group of dupeGroups) {
      // Загружаем полные данные для группы
      const eventIds = group.events.map((e) => e.id);
      const events = await this.prisma.event.findMany({
        where: { id: { in: eventIds } },
        include: {
          sessions: true,
          tags: true,
        },
        orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
      });

      if (events.length <= 1) continue;

      const master = events[0]; // лучший по рейтингу
      const duplicates = events.slice(1);

      // Переносим сессии из дублей в мастер
      for (const dupe of duplicates) {
        // Переносим сессии
        for (const session of dupe.sessions) {
          // Проверяем: нет ли уже сессии с таким tcSessionId у мастера
          const existingSession = await this.prisma.eventSession.findUnique({
            where: { tcSessionId: session.tcSessionId },
          });
          if (existingSession) {
            // Обновляем eventId на мастер
            await this.prisma.eventSession.update({
              where: { id: session.id },
              data: { eventId: master.id },
            });
          } else {
            await this.prisma.eventSession.update({
              where: { id: session.id },
              data: { eventId: master.id },
            });
          }
          sessionsMerged++;
        }

        // Переносим теги
        for (const et of dupe.tags) {
          await this.prisma.eventTag
            .upsert({
              where: {
                eventId_tagId: { eventId: master.id, tagId: et.tagId },
              },
              update: {},
              create: { eventId: master.id, tagId: et.tagId },
            })
            .catch(() => {});
        }

        // Удаляем связи дубля
        await this.prisma.eventTag.deleteMany({
          where: { eventId: dupe.id },
        });
        await this.prisma.articleEvent.deleteMany({
          where: { eventId: dupe.id },
        });

        // Удаляем дубль
        await this.prisma.event.delete({ where: { id: dupe.id } });
        duplicatesRemoved++;
      }

      // Обновляем мастер: пересчитываем priceFrom
      const allSessions = await this.prisma.eventSession.findMany({
        where: { eventId: master.id },
      });
      const allPrices = allSessions
        .flatMap((s: any) =>
          (s.prices as any[] || []).map((p: any) => p.price).filter((p: number) => p > 0),
        );
      const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : master.priceFrom;

      await this.prisma.event.update({
        where: { id: master.id },
        data: {
          priceFrom: minPrice,
          // Убедимся что slug чистый (без суффикса)
          slug: await this.getCleanSlug(master.title, master.id),
        },
      });

      groupsProcessed++;
    }

    this.logger.log(
      `Дедупликация: ${groupsProcessed} групп, удалено ${duplicatesRemoved} дублей, перенесено ${sessionsMerged} сессий`,
    );

    return { groupsProcessed, duplicatesRemoved, sessionsMerged };
  }

  // ============================
  // Sync с дедупликацией
  // ============================

  /**
   * Синхронизация группы TC-events как одного нашего Event + N сессий.
   * Возвращает количество созданных/обновлённых сессий.
   */
  private async syncEventGroup(tcEvents: any[]): Promise<number> {
    if (tcEvents.length === 0) return 0;

    // Сортируем: больше всего билетов, публичные первые
    tcEvents.sort((a, b) => {
      const aVacant = a.tickets_amount_vacant || 0;
      const bVacant = b.tickets_amount_vacant || 0;
      if (a.status === 'public' && b.status !== 'public') return -1;
      if (a.status !== 'public' && b.status === 'public') return 1;
      return bVacant - aVacant;
    });

    const best = tcEvents[0]; // лучший TC event для данных мастер-записи
    const tcId = String(best.id);
    const title = best.title?.text?.trim() || '';
    const description = best.title?.desc || null;
    const category = this.mapCategory(best);
    const minAge =
      typeof best.age_rating === 'number' ? best.age_rating : 0;

    const cityGeoId = best?.venue?.city?.id;
    const cityId = this.cityCache.get(cityGeoId);
    if (!cityId) return 0;

    // Медиа — берём первую не-null обложку
    const imageUrl =
      this.findBestImage(tcEvents) ||
      best.media?.cover_original?.url ||
      best.media?.cover?.url ||
      null;

    const address = best.venue?.address || null;
    const coords = best.venue?.point?.coordinates;
    const lng = coords?.[0] || null;
    const lat = coords?.[1] || null;

    // Минимальная цена из ВСЕХ TC events в группе
    const allPrices: number[] = [];
    for (const tc of tcEvents) {
      const p = this.extractMinPrice(tc.sets);
      if (p) allPrices.push(p);
    }
    const priceFrom = allPrices.length > 0 ? Math.min(...allPrices) : null;

    const durationMinutes = this.extractDuration(best);
    const isActive = tcEvents.some((tc) => tc.status === 'public');

    // Ищем существующее событие: по title + cityId (дедупликация)
    let event = await this.prisma.event.findFirst({
      where: {
        cityId,
        title: { equals: title, mode: 'insensitive' },
      },
    });

    if (event) {
      // Обновляем мастер
      await this.prisma.event.update({
        where: { id: event.id },
        data: {
          tcEventId: tcId, // обновляем на лучший TC ID
          description: description || event.description,
          category,
          minAge,
          durationMinutes:
            durationMinutes && durationMinutes > 0 && durationMinutes < 2880
              ? durationMinutes
              : event.durationMinutes,
          lat: lat || event.lat,
          lng: lng || event.lng,
          address: address || event.address,
          imageUrl: imageUrl || event.imageUrl,
          priceFrom,
          isActive,
          tcData: best,
          lastSyncAt: new Date(),
        },
      });
    } else {
      // Создаём новое событие
      const slug = await this.generateUniqueSlug(title, tcId);
      event = await this.prisma.event.create({
        data: {
          tcEventId: tcId,
          cityId,
          title,
          slug,
          description,
          category,
          minAge,
          durationMinutes:
            durationMinutes && durationMinutes > 0 && durationMinutes < 2880
              ? durationMinutes
              : null,
          lat,
          lng,
          address,
          imageUrl,
          priceFrom,
          isActive,
          tcData: best,
          lastSyncAt: new Date(),
        },
      });
    }

    // Синхронизируем сессии — одна на каждый TC event
    let sessionCount = 0;
    for (const tc of tcEvents) {
      const ok = await this.syncSession(event.id, tc);
      if (ok) sessionCount++;
    }

    // Синхронизируем теги из всех TC events
    const allTags = new Set<string>();
    for (const tc of tcEvents) {
      for (const tag of tc.tags || []) {
        allTags.add(tag);
      }
    }
    await this.syncTags(event.id, [...allTags], title, description);

    return sessionCount;
  }

  /**
   * Создать/обновить сессию для события.
   * Каждый TC event ID → одна сессия.
   */
  private async syncSession(eventId: string, tc: any): Promise<boolean> {
    const tcId = String(tc.id);
    const dates = this.parseVevent(tc.lifetime);
    if (!dates.start) return false;

    const tcSessionId = `${tcId}-main`;
    const availableTickets = tc.tickets_amount_vacant || 0;
    const prices = this.extractPrices(tc.sets);
    const isActive = tc.status === 'public' && availableTickets > 0;

    await this.prisma.eventSession.upsert({
      where: { tcSessionId },
      update: {
        eventId, // важно: может быть перенесена от дубля
        startsAt: dates.start,
        endsAt: dates.finish,
        availableTickets,
        prices,
        isActive,
      },
      create: {
        eventId,
        tcSessionId,
        startsAt: dates.start,
        endsAt: dates.finish,
        availableTickets,
        prices,
        isActive,
      },
    });

    return true;
  }

  /**
   * Маппинг TC-тегов на наши слаги.
   * TC присылает: Детям, Кино, Концерты, Музеи, Театры, Шоу, Экскурсии.
   * Наши теги: belye-nochi, gastro, diskoteka, s-detmi, и т.д.
   */
  private static readonly TC_TAG_MAP: Record<string, string[]> = {
    'детям': ['s-detmi'],
    'шоу': ['shou-programma'],
    'концерты': ['zhivaya-muzyka'],
    'экскурсии': [],
    'музеи': ['iskusstvo', 'istoriya'],
    'театры': ['iskusstvo'],
    'кино': [],
  };

  /**
   * Ключевые слова в названии/описании → наши теги (slug).
   */
  private static readonly KEYWORD_TAG_MAP: Record<string, string[]> = {
    'теплоход': ['panoramnyi'],
    'прогулка по неве': ['panoramnyi'],
    'речн': ['panoramnyi'],
    'белые ночи': ['belye-nochi'],
    'разводн': ['belye-nochi', 'nochnye'],
    'ночн': ['nochnye'],
    'бар': ['kafe-bar'],
    'ресторан': ['restoran', 'gastro'],
    'кафе': ['kafe-bar'],
    'ужин': ['s-pitaniem', 'gastro'],
    'обед': ['s-pitaniem', 'gastro'],
    'фуршет': ['gastro', 's-pitaniem'],
    'гастро': ['gastro'],
    'дегустац': ['gastro'],
    'квест': ['kvesty'],
    'дет': ['s-detmi'],
    'ребён': ['s-detmi'],
    'семей': ['s-detmi'],
    'романтик': ['romantika'],
    'свидан': ['romantika'],
    'для двоих': ['romantika'],
    'компани': ['dlya-kompanii'],
    'корпоратив': ['dlya-kompanii'],
    'группо': ['dlya-kompanii'],
    'дискотек': ['diskoteka'],
    'танц': ['diskoteka'],
    'dj': ['diskoteka'],
    'живая музыка': ['zhivaya-muzyka'],
    'живой музык': ['zhivaya-muzyka'],
    'джаз': ['zhivaya-muzyka'],
    'выставк': ['iskusstvo'],
    'галере': ['iskusstvo'],
    'музей': ['iskusstvo', 'istoriya'],
    'истори': ['istoriya'],
    'дворц': ['istoriya'],
    'собор': ['istoriya'],
    'храм': ['istoriya'],
    'крепост': ['istoriya'],
    'природ': ['priroda'],
    'парк': ['priroda'],
    'сад': ['priroda'],
    'фото': ['fotogenichnye'],
    'инстаграм': ['fotogenichnye'],
    'хит': ['hit-prodazh'],
    'популярн': ['hit-prodazh'],
    'бестселлер': ['hit-prodazh'],
    'новинк': ['novinka'],
    'премьер': ['novinka'],
    // Лендинги
    'развод мостов': ['nochnye-mosty', 'nochnye'],
    'разводные мосты': ['nochnye-mosty', 'nochnye'],
    'развод': ['nochnye-mosty'],
    'мост': ['nochnye-mosty'],
    'салют': ['salyut-s-vody'],
    'фейерверк': ['salyut-s-vody'],
    'день победы': ['salyut-s-vody'],
    '9 мая': ['salyut-s-vody'],
    'метеор': ['meteor-petergof'],
    'петергоф': ['meteor-petergof'],
    'петродворец': ['meteor-petergof'],
    'свияжск': ['sviyazhsk'],
    'остров-град': ['sviyazhsk'],
    'куршск': ['kurshskaya-kosa'],
    'коса': ['kurshskaya-kosa'],
    'танцующий лес': ['kurshskaya-kosa'],
    // Нижний Новгород
    'стрелка': ['progulki-volga-nn'],
    'волга': ['progulki-volga-nn'],
    'ока': ['progulki-volga-nn'],
    'нижегородский кремль': ['kreml-nn'],
    'нижегородск': ['kreml-nn'],
    'канатн': ['kanatka-nn'],
    'бор': ['kanatka-nn'],
  };

  /**
   * Связать теги с событием.
   * 1. Прямой маппинг TC-тегов → наши теги
   * 2. Поиск ключевых слов в названии/описании → наши теги
   */
  private async syncTags(eventId: string, tagNames: string[], title?: string, description?: string): Promise<void> {
    const slugsToLink = new Set<string>();

    // 1. Маппинг TC-тегов
    for (const tcTag of tagNames || []) {
      const mapped = TcSyncService.TC_TAG_MAP[tcTag.toLowerCase()];
      if (mapped) {
        for (const s of mapped) slugsToLink.add(s);
      }
    }

    // 2. Ключевые слова в названии и описании
    const text = `${title || ''} ${description || ''}`.toLowerCase();
    for (const [keyword, slugs] of Object.entries(TcSyncService.KEYWORD_TAG_MAP)) {
      if (text.includes(keyword)) {
        for (const s of slugs) slugsToLink.add(s);
      }
    }

    if (slugsToLink.size === 0) return;

    // Находим теги по slug и привязываем
    for (const slug of slugsToLink) {
      const tag = await this.prisma.tag.findFirst({
        where: { slug, isActive: true },
      });

      if (tag) {
        await this.prisma.eventTag
          .upsert({
            where: { eventId_tagId: { eventId, tagId: tag.id } },
            update: {},
            create: { eventId, tagId: tag.id },
          })
          .catch(() => {});
      }
    }
  }

  /**
   * Пересвязать теги для всех существующих событий
   * на основе маппинга TC-тегов и ключевых слов.
   */
  async retagAll(): Promise<{ eventsProcessed: number; tagsLinked: number }> {
    this.logger.log('=== RETAG: пересвязываю теги для всех событий ===');

    const events = await this.prisma.event.findMany({
      where: { isActive: true },
      select: { id: true, title: true, description: true, tcData: true },
    });

    let tagsLinked = 0;
    for (const ev of events) {
      const tc = (ev.tcData as any) || {};
      const tcTags = (tc.tags || []) as string[];
      const before = await this.prisma.eventTag.count({ where: { eventId: ev.id } });
      await this.syncTags(ev.id, tcTags, ev.title, ev.description || '');
      const after = await this.prisma.eventTag.count({ where: { eventId: ev.id } });
      tagsLinked += (after - before);
    }

    this.logger.log(`Обработано ${events.length} событий, привязано ${tagsLinked} новых тегов`);
    return { eventsProcessed: events.length, tagsLinked };
  }

  // ============================
  // Города
  // ============================

  private async ensureCity(
    geoId: number,
    sampleEvent: any,
  ): Promise<string | null> {
    if (this.cityCache.has(geoId)) return null;

    let slug = this.CITY_MAP[geoId] || null;
    const tcCity = sampleEvent?.venue?.city;
    const cityName = this.getCityName(tcCity);

    if (!slug) {
      slug = this.transliterate(cityName).slice(0, 60) || `city-${geoId}`;
    }

    let city = await this.prisma.city.findUnique({ where: { slug } });
    if (!city) {
      city = await this.prisma.city.findFirst({
        where: { name: { equals: cityName, mode: 'insensitive' } },
      });
    }

    if (city) {
      this.cityCache.set(geoId, city.id);
      return null;
    }

    const coords = sampleEvent?.venue?.point?.coordinates;
    const timezone = tcCity?.timezone || 'Europe/Moscow';

    try {
      city = await this.prisma.city.create({
        data: {
          slug,
          name: cityName,
          timezone,
          lat: coords?.[1] || null,
          lng: coords?.[0] || null,
          isActive: true,
        },
      });
      this.cityCache.set(geoId, city.id);
      this.logger.log(`+ Город: ${cityName} (${slug})`);
      return slug;
    } catch {
      const fallbackSlug = `${slug}-${geoId}`;
      city = await this.prisma.city.create({
        data: {
          slug: fallbackSlug,
          name: cityName,
          timezone,
          lat: coords?.[1] || null,
          lng: coords?.[0] || null,
          isActive: true,
        },
      });
      this.cityCache.set(geoId, city.id);
      return fallbackSlug;
    }
  }

  // ============================
  // Парсеры и хелперы
  // ============================

  /** Нормализация названия для группировки */
  private normalizeTitle(title: string): string {
    return title
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // убрать эмодзи
      .replace(/[🔞🌐🎭🎪🎉🎊🎶🎵🎤🎬🎨🎭🏛️🚶]/g, '')
      .trim()
      .toLowerCase();
  }

  /** Найти лучшее изображение из группы TC events */
  private findBestImage(tcEvents: any[]): string | null {
    for (const tc of tcEvents) {
      const url =
        tc.media?.cover_original?.url ||
        tc.media?.cover?.url ||
        tc.media?.cover_small?.url;
      if (url) return url;
    }
    return null;
  }

  /** Извлечь длительность из VEVENT */
  private extractDuration(tc: any): number | null {
    const dates = this.parseVevent(tc.lifetime);
    if (dates.start && dates.finish) {
      const min = Math.round(
        (dates.finish.getTime() - dates.start.getTime()) / 60000,
      );
      return min > 0 && min < 2880 ? min : null;
    }
    return null;
  }

  /** Получить «чистый» slug без суффикса TC ID */
  private async getCleanSlug(
    title: string,
    currentEventId: string,
  ): Promise<string> {
    const base = this.transliterate(title).slice(0, 80) || 'event';
    const existing = await this.prisma.event.findUnique({
      where: { slug: base },
    });
    if (!existing || existing.id === currentEventId) return base;
    // Slug занят другим событием — оставляем как есть
    const current = await this.prisma.event.findUnique({
      where: { id: currentEventId },
    });
    return current?.slug || base;
  }

  private parseVevent(
    vevent: string | null,
  ): { start: Date | null; finish: Date | null } {
    if (!vevent) return { start: null, finish: null };
    let start: Date | null = null;
    let finish: Date | null = null;
    const startMatch = vevent.match(
      /DTSTART[^:]*:(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?/,
    );
    if (startMatch) {
      start = new Date(
        `${startMatch[1]}-${startMatch[2]}-${startMatch[3]}T${startMatch[4]}:${startMatch[5]}:${startMatch[6]}Z`,
      );
    }
    const endMatch = vevent.match(
      /DTEND[^:]*:(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?/,
    );
    if (endMatch) {
      finish = new Date(
        `${endMatch[1]}-${endMatch[2]}-${endMatch[3]}T${endMatch[4]}:${endMatch[5]}:${endMatch[6]}Z`,
      );
    }
    return { start, finish };
  }

  private mapCategory(tc: any): EventCategory {
    const tags = (tc.tags || []).map((t: string) => t.toLowerCase());
    const title = String(tc.title?.text || '').toLowerCase();
    const desc = String(tc.title?.desc || '').toLowerCase();
    const text = `${title} ${desc} ${tags.join(' ')}`;

    const museumWords = [
      'музей', 'музеи', 'выставк', 'галерея', 'gallery', 'exhibition', 'museum',
    ];
    if (museumWords.some((w) => text.includes(w))) return EventCategory.MUSEUM;

    const excursionWords = [
      'экскурси', 'excursion', 'тур', 'tour', 'прогулк', 'walk', 'квест', 'quest',
    ];
    if (excursionWords.some((w) => text.includes(w)))
      return EventCategory.EXCURSION;

    return EventCategory.EVENT;
  }

  private extractMinPrice(sets: any[]): number | null {
    if (!sets || !Array.isArray(sets)) return null;
    const prices: number[] = [];
    for (const set of sets) {
      if (set.price) {
        const p = Math.round(parseFloat(set.price) * 100);
        if (p > 0) prices.push(p);
      }
      if (set.rules) {
        for (const rule of set.rules) {
          if (rule.current && rule.price) {
            const p = Math.round(parseFloat(rule.price) * 100);
            if (p > 0) prices.push(p);
          }
        }
      }
    }
    return prices.length > 0 ? Math.min(...prices) : null;
  }

  private extractPrices(sets: any[]): any[] {
    if (!sets || !Array.isArray(sets)) return [];
    return sets
      .map((set: any) => {
        let priceCopecks = 0;
        let priceOrg = 0;
        let priceExtra = 0;
        const currentRule = set.rules?.find((r: any) => r.current);
        if (currentRule) {
          priceCopecks = Math.round(
            parseFloat(currentRule.price || '0') * 100,
          );
          priceOrg = Math.round(
            parseFloat(currentRule.price_org || '0') * 100,
          );
          priceExtra = Math.round(
            parseFloat(currentRule.price_extra || '0') * 100,
          );
        } else if (set.price) {
          priceCopecks = Math.round(parseFloat(set.price) * 100);
        }
        return {
          setId: set.id,
          name: set.name || 'standard',
          price: priceCopecks,
          priceOrg,
          priceExtra,
          amount: set.amount || 0,
          amountVacant: set.amount_vacant || 0,
          withSeats: set.with_seats || false,
        };
      })
      .filter((p: any) => p.price > 0);
  }

  private getCityName(tcCity: any): string {
    if (!tcCity?.name) return 'unknown';
    if (typeof tcCity.name === 'string') return tcCity.name;
    return tcCity.name.ru || tcCity.name.default || tcCity.name.en || 'unknown';
  }

  private async generateUniqueSlug(
    title: string,
    fallbackId: string,
  ): Promise<string> {
    const base =
      this.transliterate(title).slice(0, 80) || `event-${fallbackId.slice(-8)}`;
    const existing = await this.prisma.event.findUnique({
      where: { slug: base },
    });
    if (!existing) return base;
    const slug8 = `${base.slice(0, 70)}-${fallbackId.slice(-8)}`;
    const existing2 = await this.prisma.event.findUnique({
      where: { slug: slug8 },
    });
    if (!existing2) return slug8;
    return `${base.slice(0, 56)}-${fallbackId}`;
  }

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
      .map((ch) => map[ch] ?? ch)
      .join('')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
