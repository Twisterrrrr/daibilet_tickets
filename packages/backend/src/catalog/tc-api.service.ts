import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { combineAbortSignals, getHttpTimeoutMs } from '../common/http-signal.util';

/**
 * Сервис для работы с Ticketscloud API.
 *
 * Документация: https://ticketscloud.readthedocs.io/ru/latest/
 *
 * Каталог событий: GET /v1/services/simple/events (REST, deprecated but works)
 * Заказы:          POST /v2/resources/orders (REST v2)
 * Авторизация:     Authorization: key {api_key}
 * Base URL:        https://ticketscloud.com
 */
@Injectable()
export class TcApiService {
  private readonly logger = new Logger(TcApiService.name);
  private readonly baseUrl: string;
  private readonly apiToken: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get('TC_API_URL', 'https://ticketscloud.com');
    this.apiToken = this.config.get('TC_API_TOKEN', '');

    if (!this.apiToken) {
      this.logger.warn('TC_API_TOKEN не установлен! Синхронизация невозможна.');
    }
  }

  private getTimeoutMs(): number {
    return getHttpTimeoutMs('TC_HTTP_TIMEOUT_MS', 60_000);
  }

  /**
   * Базовый GET-запрос к TC API.
   * @param signal — опционально, для отмены при job timeout
   */
  private async request<T = any>(
    path: string,
    params?: Record<string, string>,
    signal?: AbortSignal,
  ): Promise<T> {
    const url = new URL(path, this.baseUrl);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '') url.searchParams.set(k, v);
      });
    }

    this.logger.debug(`TC API → GET ${url.toString()}`);

    const timeoutSignal = AbortSignal.timeout(this.getTimeoutMs());
    const finalSignal = combineAbortSignals(timeoutSignal, signal);

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `key ${this.apiToken}`,
        Accept: 'application/json',
      },
      signal: finalSignal,
    });

    if (!res.ok) {
      const text = await res.text().catch((e) => { this.logger.warn('TC API call failed: ' + (e as Error).message); return ''; });
      this.logger.error(`TC API ${res.status} ${res.statusText}: ${text.slice(0, 500)}`);
      throw new Error(`TC API returned ${res.status}: ${text.slice(0, 200)}`);
    }

    return res.json() as Promise<T>;
  }

  /**
   * Получить список всех событий из каталога.
   *
   * Endpoint: GET /v1/services/simple/events
   * Ответ: массив событий в формате TC.
   *
   * Фильтры (query params):
   * - city: int (geonames ID)
   * - status: string[] ("public")
   * - lifetime: datetime range
   * - page, page_size: пагинация
   */
  async getEvents(opts?: {
    page?: number;
    pageSize?: number;
    city?: number;
    status?: string;
    signal?: AbortSignal;
  }): Promise<any[]> {
    const params: Record<string, string> = {};

    if (opts?.page) params.page = String(opts.page);
    if (opts?.pageSize) params.page_size = String(opts.pageSize);
    if (opts?.city) params.city = String(opts.city);
    if (opts?.status) params.status = opts.status;

    const result = await this.request<any[]>('/v1/services/simple/events', params, opts?.signal);

    // Ответ — массив событий
    if (Array.isArray(result)) {
      return result;
    }

    // Если обёрнут в data
    if (result && typeof result === 'object') {
      const obj = result as Record<string, unknown>;
      if (Array.isArray(obj.data)) return obj.data;
      if (Array.isArray(obj.events)) return obj.events;
    }

    this.logger.warn('Unexpected TC events response format');
    return [];
  }

  /**
   * Получить билеты с местами для конкретного события.
   * GET /v1/resources/events/:id/tickets
   */
  async getEventTickets(eventId: string, status = 'vacant', signal?: AbortSignal): Promise<any[]> {
    return this.request(`/v1/resources/events/${eventId}/tickets`, { status }, signal);
  }

  /**
   * Создать заказ.
   * POST /v2/resources/orders
   */
  async createOrder(payload: {
    event?: string;
    random?: Record<string, number>;
    tickets?: string[];
  }): Promise<any> {
    const url = new URL('/v2/resources/orders', this.baseUrl);

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: `key ${this.apiToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.getTimeoutMs()),
    });

    if (!res.ok) {
      const text = await res.text().catch((e) => { this.logger.warn('TC API call failed: ' + (e as Error).message); return ''; });
      throw new Error(`TC create order failed ${res.status}: ${text.slice(0, 200)}`);
    }

    return res.json();
  }

  /**
   * Обновить заказ (добавить билеты, сменить статус).
   * PATCH /v2/resources/orders/:id
   */
  async updateOrder(orderId: string, payload: any): Promise<any> {
    const url = new URL(`/v2/resources/orders/${orderId}`, this.baseUrl);

    const res = await fetch(url.toString(), {
      method: 'PATCH',
      headers: {
        Authorization: `key ${this.apiToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.getTimeoutMs()),
    });

    if (!res.ok) {
      const text = await res.text().catch((e) => { this.logger.warn('TC API call failed: ' + (e as Error).message); return ''; });
      throw new Error(`TC update order failed ${res.status}: ${text.slice(0, 200)}`);
    }

    return res.json();
  }

  /**
   * Завершить заказ (status: done).
   */
  async finishOrder(orderId: string): Promise<unknown> {
    return this.updateOrder(orderId, { status: 'done' });
  }

  /**
   * Подтвердить заказ (для fulfillment flow).
   */
  async confirmOrder(orderId: string): Promise<unknown> {
    return this.updateOrder(orderId, { status: 'done' });
  }

  /**
   * Отменить заказ.
   */
  async cancelOrder(orderId: string): Promise<unknown> {
    return this.updateOrder(orderId, { status: 'cancelled' });
  }

  /**
   * Получить заказ по ID.
   */
  async getOrder(orderId: string): Promise<unknown> {
    const url = new URL(`/v2/resources/orders/${orderId}`, this.baseUrl);
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `key ${this.apiToken}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(this.getTimeoutMs()),
    });
    if (!res.ok) {
      const text = await res.text().catch((e) => { this.logger.warn('TC API call failed: ' + (e as Error).message); return ''; });
      throw new Error(`TC get order failed ${res.status}: ${text.slice(0, 200)}`);
    }
    return res.json();
  }

  /**
   * Discovery — тест доступности API и формат данных.
   */
  async discover(): Promise<{
    apiReachable: boolean;
    eventsEndpoint: string;
    totalEvents: number;
    sampleEventFields: string[];
    sampleCityIds: number[];
    error?: string;
  }> {
    try {
      const events = await this.getEvents({ pageSize: 5 });

      const sampleFields = events.length > 0 ? Object.keys(events[0]) : [];
      const cityIds = events
        .map((e: any) => e?.venue?.city?.id)
        .filter(Boolean)
        .filter((v: number, i: number, a: number[]) => a.indexOf(v) === i);

      return {
        apiReachable: true,
        eventsEndpoint: '/v1/services/simple/events',
        totalEvents: events.length,
        sampleEventFields: sampleFields,
        sampleCityIds: cityIds,
      };
    } catch (err: unknown) {
      return {
        apiReachable: false,
        eventsEndpoint: '/v1/services/simple/events',
        totalEvents: 0,
        sampleEventFields: [],
        sampleCityIds: [],
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
