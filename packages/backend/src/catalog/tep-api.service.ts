import { Injectable, Logger } from '@nestjs/common';

/**
 * Клиент API teplohod.info v1.
 *
 * Публичные endpoints (compact) доступны без авторизации.
 * Для полных данных (расписание, наличие) нужен белый IP.
 */
@Injectable()
export class TepApiService {
  private readonly logger = new Logger(TepApiService.name);
  private readonly baseUrl = process.env.TEP_API_URL || 'https://api.teplohod.info/v1';

  private async request<T = any>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    this.logger.debug(`TEP API → GET ${url}`);

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: '*/*',
        'User-Agent': 'Daibilet/1.0',
      },
    });

    if (!res.ok) {
      const text = await res.text().catch((e) => { this.logger.warn('TEP API call failed: ' + (e as Error).message); return ''; });
      this.logger.error(`TEP API ${res.status}: ${text.slice(0, 500)}`);
      throw new Error(`TEP API returned ${res.status}: ${text.slice(0, 200)}`);
    }

    return res.json() as Promise<T>;
  }

  /**
   * Список городов teplohod.info.
   * [{id: 1, name: "Москва"}, {id: 2, name: "Санкт-Петербург"}, ...]
   */
  async getCities(): Promise<TepCity[]> {
    return this.request<TepCity[]>('/cities');
  }

  /**
   * События с полными данными (включая расписание eventTimes).
   * Требует белый IP. Fallback на compact если полные данные недоступны.
   */
  async getEvents(cityId?: number): Promise<TepEvent[]> {
    const fullPath = cityId
      ? `/events?city_id=${cityId}`
      : '/events';
    try {
      const events = await this.request<TepEvent[]>(fullPath);
      // Проверяем, что получили полные данные (есть eventTimes)
      if (events.length > 0 && events[0].eventTimes !== undefined) {
        this.logger.log(`TEP full API: ${events.length} events with schedules`);
        return events;
      }
      // Если eventTimes отсутствует — IP не в белом списке
      this.logger.warn('TEP: eventTimes not found, IP may not be whitelisted. Fallback to compact.');
    } catch (err: unknown) {
      this.logger.warn(`TEP full API failed: ${err instanceof Error ? err.message : String(err)}. Fallback to compact.`);
    }
    // Fallback: compact
    const compactPath = cityId
      ? `/events?compact&city_id=${cityId}`
      : '/events?compact';
    return this.request<TepEvent[]>(compactPath);
  }

  /**
   * Полные данные одного события (с расписанием).
   * Требует белый IP.
   */
  async getEventFull(eventId: number): Promise<TepEventFull | null> {
    try {
      return await this.request<TepEventFull>(`/events/${eventId}`);
    } catch (err: unknown) {
      this.logger.warn(`TEP full event ${eventId}: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  /**
   * Проверить доступность API и формат данных.
   */
  async discover(): Promise<{
    apiReachable: boolean;
    citiesCount: number;
    sampleCities: string[];
    eventsEndpoint: string;
    error?: string;
  }> {
    try {
      const cities = await this.getCities();
      return {
        apiReachable: true,
        citiesCount: cities.length,
        sampleCities: cities.slice(0, 5).map((c) => c.name),
        eventsEndpoint: '/v1/events?compact',
      };
    } catch (err: unknown) {
      return {
        apiReachable: false,
        citiesCount: 0,
        sampleCities: [],
        eventsEndpoint: '/v1/events?compact',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

// ========================
// Типы teplohod.info API
// ========================

export interface TepCity {
  id: number;
  name: string;
}

export interface TepTicket {
  id: number;
  title: string;
  strike_price: string | null;
  price: string; // "4590.00"
  is_attached: boolean;
}

export interface TepPlace {
  id: number;
  name: string;
  city_id: number;
  lat: string;
  lng: string;
  description: string;
  address: string;
}

export interface TepFeature {
  id: number;
  title: string;
  description: string;
}

export interface TepEvent {
  id: number;
  duration: number; // минуты
  openDate: boolean;
  title: string;
  category: string; // "Речные прогулки", "Смотровые площадки", ...
  place: string; // название теплохода/площадки
  description: string;
  schedule_description: string;
  images: string[];
  eventTimes?: TepTimeSlot[]; // расписание (доступно без compact и с белым IP)
  eventFeatures: TepFeature[];
  eventPlaces: TepPlace[];
  eventTickets: TepTicket[];
  hasSeats: boolean;
}

export interface TepTimeSlot {
  id: number;
  datetime: string; // "2026-05-18T16:30:00+0300"
  available_tickets: number;
}

export interface TepScheduleItem {
  id: number;
  date: string; // "2026-05-09"
  time: string; // "20:38"
  event_place_id: number;
}

export interface TepEventFull extends TepEvent {
  eventTimes?: TepTimeSlot[];
  schedules?: TepScheduleItem[];
}
