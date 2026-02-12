import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';

// ============================================================
// TypeScript-интерфейсы для gRPC-ответов tc-simple
// (соответствуют proto/tc-simple/*.proto)
// ============================================================

export interface TcGrpcEvent {
  id: string;
  meta: string; // MetaEvent ID (пусто для одиночных)
  name: string;
  description: string;
  status: number; // 0=STAND_BY, 1=PUBLIC
  org: string;
  venue: string; // venue ID
  map: string;
  lifetime?: { start?: { seconds: string | number }; finish?: { seconds: string | number } };
  category: string; // TC category ID
  tags: string[]; // TC tag IDs
  artists: string[];
  age_rating: string;
  media?: { cover?: string; cover_small?: string; cover_original?: string };
  open_date: boolean;
  sets: TcGrpcTicketSet[];
  tickets_amount: number;
  tickets_amount_vacant: number;
}

export interface TcGrpcTicketSet {
  id: string;
  name: string;
  description: string;
  pos: number;
  sector: string;
  with_seats: boolean;
  amount: number;
  amount_vacant: number;
  rules: TcGrpcTicketSetRule[];
}

export interface TcGrpcTicketSetRule {
  id: string;
  type: number;
  lifetime?: { start?: { seconds: string | number }; finish?: { seconds: string | number } };
  simple?: { price: string | number };
}

export interface TcGrpcMetaEvent {
  id: string;
  name: string;
  description: string;
  org: string;
  age_rating: string;
  media?: { cover?: string; cover_small?: string; cover_original?: string };
  first_start?: { seconds: string | number };
  last_finish?: { seconds: string | number };
}

export interface TcGrpcVenue {
  id: string;
  name: string;
  description: string;
  city: number; // geonames city ID
  address: string;
  coordinates?: { longitude: number; latitude: number };
}

export interface TcGrpcCity {
  id: number;
  name: string;
  country: string;
  timezone: string;
  coordinates?: { longitude: number; latitude: number };
  population: number;
}

export interface TcGrpcTag {
  id: string;
  category: string; // TC category ID
  name: string;
  generic: boolean;
}

export interface TcGrpcCategory {
  id: string;
  name: string;
}

/**
 * gRPC-клиент к сервису tc-simple (Ticketscloud).
 *
 * Эндпоинты:
 *   prod:  simple.ticketscloud.com:443
 *   stage: simple.stage.freetc.net:443
 *
 * Авторизация: metadata `authorization: {api_key}`
 *
 * Документация: https://github.com/ticketscloud/docs
 */
@Injectable()
export class TcGrpcService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TcGrpcService.name);
  private client: any;
  private readonly endpoint: string;
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.endpoint = this.config.get<string>(
      'TC_GRPC_ENDPOINT',
      'simple.ticketscloud.com:443',
    );
    this.apiKey = this.config.get<string>('TC_API_TOKEN', '');
  }

  async onModuleInit(): Promise<void> {
    if (!this.apiKey) {
      this.logger.warn('TC_API_TOKEN не установлен — gRPC-клиент не будет инициализирован');
      return;
    }

    try {
      await this.initClient();
      this.logger.log(`gRPC-клиент подключён к ${this.endpoint}`);
    } catch (err: any) {
      this.logger.error(`Ошибка инициализации gRPC: ${err.message}`);
    }
  }

  onModuleDestroy(): void {
    if (this.client) {
      grpc.closeClient(this.client);
      this.client = null;
      this.logger.log('gRPC-клиент закрыт');
    }
  }

  /**
   * Инициализация gRPC-клиента из proto-файлов.
   */
  private async initClient(): Promise<void> {
    const protoDir = path.resolve(__dirname, '..', '..', 'proto', 'tc-simple');

    const packageDefinition = await protoLoader.load(
      path.join(protoDir, 'service.proto'),
      {
        keepCase: true,
        longs: String,
        enums: Number,
        defaults: true,
        oneofs: true,
        includeDirs: [protoDir],
      },
    );

    const proto = grpc.loadPackageDefinition(packageDefinition) as any;
    const SimpleService = proto.v2.Simple;

    if (!SimpleService) {
      throw new Error('Не удалось загрузить proto v2.Simple');
    }

    // SSL-подключение
    const channelCredentials = grpc.credentials.createSsl();

    this.client = new SimpleService(this.endpoint, channelCredentials);
  }

  /**
   * Создаёт gRPC Metadata с авторизацией.
   */
  private getMetadata(preferredLanguage = 'ru'): grpc.Metadata {
    const metadata = new grpc.Metadata();
    metadata.set('authorization', this.apiKey);
    metadata.set('preferred-language', preferredLanguage);
    return metadata;
  }

  /**
   * Обёртка: собирает все элементы из server-side streaming RPC в массив.
   */
  private collectStream<T>(
    rpcMethod: string,
    request: any,
    timeoutMs = 30000,
  ): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        return reject(new Error('gRPC-клиент не инициализирован'));
      }

      const method = this.client[rpcMethod];
      if (!method) {
        return reject(new Error(`gRPC-метод ${rpcMethod} не найден`));
      }

      const items: T[] = [];
      const deadline = new Date(Date.now() + timeoutMs);

      const stream = method.call(
        this.client,
        request,
        this.getMetadata(),
        { deadline },
      );

      stream.on('data', (item: T) => {
        items.push(item);
      });

      stream.on('end', () => {
        resolve(items);
      });

      stream.on('error', (err: any) => {
        // CANCELLED после end — нормально
        if (err.code === grpc.status.CANCELLED && items.length > 0) {
          resolve(items);
          return;
        }
        reject(new Error(`gRPC ${rpcMethod} error: ${err.message} (code=${err.code})`));
      });
    });
  }

  /**
   * Обёртка: unary RPC.
   */
  private unaryCall<TReq, TRes>(
    rpcMethod: string,
    request: TReq,
    timeoutMs = 10000,
  ): Promise<TRes> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        return reject(new Error('gRPC-клиент не инициализирован'));
      }

      const method = this.client[rpcMethod];
      if (!method) {
        return reject(new Error(`gRPC-метод ${rpcMethod} не найден`));
      }

      const deadline = new Date(Date.now() + timeoutMs);

      method.call(
        this.client,
        request,
        this.getMetadata(),
        { deadline },
        (err: any, response: TRes) => {
          if (err) return reject(new Error(`gRPC ${rpcMethod}: ${err.message}`));
          resolve(response);
        },
      );
    });
  }

  // ============================================================
  // Публичные методы
  // ============================================================

  /**
   * Проверка доступности gRPC-сервиса.
   */
  async healthCheck(): Promise<{ status: string }> {
    return this.unaryCall('Healtz', {});
  }

  /**
   * Проверка: клиент инициализирован и готов к работе.
   */
  isReady(): boolean {
    return !!this.client;
  }

  /**
   * Получить все мероприятия из TC.
   *
   * @param filter.status 0=ANY, 1=STAND_BY, 2=PUBLIC
   * @param filter.ids фильтр по ID
   * @param filter.meta фильтр по MetaEvent ID
   * @param filter.org фильтр по организатору
   */
  async fetchEvents(filter?: {
    status?: number;
    ids?: string[];
    meta?: string;
    without_meta?: boolean;
    org?: string;
  }): Promise<TcGrpcEvent[]> {
    const request: any = {};

    if (filter?.status !== undefined) request.status = filter.status;
    if (filter?.ids?.length) request.ids = filter.ids;
    if (filter?.meta) request.meta = filter.meta;
    if (filter?.without_meta) request.without_meta = filter.without_meta;
    if (filter?.org) request.org = filter.org;

    this.logger.debug(`gRPC Events request: ${JSON.stringify(request)}`);

    const events = await this.collectStream<TcGrpcEvent>(
      'Events',
      request,
      60000, // 60s — может быть много данных
    );

    this.logger.log(`gRPC Events: получено ${events.length} мероприятий`);
    return events;
  }

  /**
   * Получить группы повторяющихся мероприятий (MetaEvents).
   */
  async fetchMetaEvents(ids?: string[]): Promise<TcGrpcMetaEvent[]> {
    const request: any = {};
    if (ids?.length) request.ids = ids;

    const metas = await this.collectStream<TcGrpcMetaEvent>(
      'MetaEvents',
      request,
      30000,
    );

    this.logger.log(`gRPC MetaEvents: получено ${metas.length} групп`);
    return metas;
  }

  /**
   * Получить площадки.
   */
  async fetchVenues(ids?: string[]): Promise<TcGrpcVenue[]> {
    const request: any = {};
    if (ids?.length) request.ids = ids;

    const venues = await this.collectStream<TcGrpcVenue>(
      'Venues',
      request,
      30000,
    );

    this.logger.log(`gRPC Venues: получено ${venues.length} площадок`);
    return venues;
  }

  /**
   * Получить города из справочника TC.
   */
  async fetchCities(ids?: number[]): Promise<TcGrpcCity[]> {
    const request: any = {};
    if (ids?.length) request.ids = ids;

    const cities = await this.collectStream<TcGrpcCity>(
      'Cities',
      request,
      15000,
    );

    this.logger.log(`gRPC Cities: получено ${cities.length} городов`);
    return cities;
  }

  /**
   * Получить теги (жанры).
   */
  async fetchTags(ids?: string[]): Promise<TcGrpcTag[]> {
    const request: any = {};
    if (ids?.length) request.ids = ids;

    const tags = await this.collectStream<TcGrpcTag>('Tags', request, 15000);
    this.logger.log(`gRPC Tags: получено ${tags.length} тегов`);
    return tags;
  }

  /**
   * Получить категории мероприятий.
   */
  async fetchCategories(ids?: string[]): Promise<TcGrpcCategory[]> {
    const request: any = {};
    if (ids?.length) request.ids = ids;

    const cats = await this.collectStream<TcGrpcCategory>(
      'Categories',
      request,
      15000,
    );

    this.logger.log(`gRPC Categories: получено ${cats.length} категорий`);
    return cats;
  }
}
