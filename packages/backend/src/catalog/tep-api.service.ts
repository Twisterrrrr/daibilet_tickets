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
  private readonly baseUrl = 'https://api.teplohod.info/v1';

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
      const text = await res.text().catch(() => '');
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
   * События (compact — без расписания).
   * Доступно публично, без авторизации.
   */
  async getEvents(cityId?: number): Promise<TepEvent[]> {
    const path = cityId
      ? `/events?compact&city_id=${cityId}`
      : '/events?compact';
    return this.request<TepEvent[]>(path);
  }

  /**
   * Полные данные одного события (с расписанием).
   * Требует белый IP.
   */
  async getEventFull(eventId: number): Promise<TepEventFull | null> {
    try {
      return await this.request<TepEventFull>(`/events/${eventId}`);
    } catch (err: any) {
      this.logger.warn(`TEP full event ${eventId}: ${err.message}`);
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
    } catch (err: any) {
      return {
        apiReachable: false,
        citiesCount: 0,
        sampleCities: [],
        eventsEndpoint: '/v1/events?compact',
        error: err.message,
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
  eventFeatures: TepFeature[];
  eventPlaces: TepPlace[];
  eventTickets: TepTicket[];
  hasSeats: boolean;
}

export interface TepScheduleItem {
  id: number;
  date: string; // "2026-05-09"
  time: string; // "20:38"
  event_place_id: number;
}

export interface TepEventFull extends TepEvent {
  schedules?: TepScheduleItem[];
}
