import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import { TcApiService } from './tc-api.service';
import { TcSyncService } from './tc-sync.service';
import { TepApiService } from './tep-api.service';
import { TepSyncService } from './tep-sync.service';
import { EventsQueryDto } from './dto/events-query.dto';

@ApiTags('catalog')
@Controller()
export class CatalogController {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly tcApi: TcApiService,
    private readonly tcSync: TcSyncService,
    private readonly tepApi: TepApiService,
    private readonly tepSync: TepSyncService,
  ) {}

  // --- Города ---

  @Get('cities')
  @ApiOperation({ summary: 'Список городов' })
  @ApiQuery({ name: 'featured', required: false, description: 'Только featured-города' })
  getCities(@Query('featured') featured?: string) {
    const isFeatured = featured === 'true' ? true : featured === 'false' ? false : undefined;
    return this.catalogService.getCities(isFeatured);
  }

  @Get('cities/:slug')
  @ApiOperation({ summary: 'Город с топ-событиями' })
  getCityBySlug(@Param('slug') slug: string) {
    return this.catalogService.getCityBySlug(slug);
  }

  // --- События ---

  @Get('events')
  @ApiOperation({ summary: 'Каталог событий с фильтрами' })
  getEvents(@Query() query: EventsQueryDto) {
    return this.catalogService.getEvents(query);
  }

  @Get('events/:slug')
  @ApiOperation({ summary: 'Карточка события' })
  getEventBySlug(@Param('slug') slug: string) {
    return this.catalogService.getEventBySlug(slug);
  }

  // --- Теги ---

  @Get('tags')
  @ApiOperation({ summary: 'Список тегов' })
  @ApiQuery({ name: 'category', required: false })
  getTags(@Query('category') category?: string) {
    return this.catalogService.getTags(category);
  }

  @Get('tags/:slug')
  @ApiOperation({ summary: 'Лендинг тега с событиями' })
  getTagBySlug(
    @Param('slug') slug: string,
    @Query('city') city?: string,
    @Query('page') page?: number,
  ) {
    return this.catalogService.getTagBySlug(slug, city, page);
  }

  // --- Поиск ---

  @Get('search')
  @ApiOperation({ summary: 'Полнотекстовый поиск' })
  @ApiQuery({ name: 'q', required: true })
  search(@Query('q') q: string, @Query('city') city?: string) {
    return this.catalogService.search(q, city);
  }

  // --- TC Sync ---

  @Get('tc/discover')
  @ApiOperation({ summary: 'Проверить доступность TC API и формат данных' })
  discover() {
    return this.tcApi.discover();
  }

  @Post('tc/sync')
  @ApiOperation({ summary: 'Запустить синхронизацию событий из Ticketscloud' })
  sync() {
    return this.tcSync.syncAll();
  }

  @Post('tc/reset-and-sync')
  @ApiOperation({ summary: 'Полный сброс TC + пересинхронизация' })
  async resetAndSync() {
    const reset = await this.tcSync.resetAll();
    const sync = await this.tcSync.syncAll();
    return { reset, sync };
  }

  // --- Teplohod.info Sync ---

  @Get('tep/discover')
  @ApiOperation({ summary: 'Проверить доступность API teplohod.info' })
  tepDiscover() {
    return this.tepApi.discover();
  }

  @Post('tep/sync')
  @ApiOperation({ summary: 'Синхронизация событий из teplohod.info' })
  runTepSync() {
    return this.tepSync.syncAll();
  }

  // --- Дедупликация ---

  @Post('deduplicate')
  @ApiOperation({ summary: 'Дедупликация: объединить дубли (title+city) в одно событие' })
  deduplicate() {
    return this.tcSync.deduplicateExisting();
  }

  @Post('retag')
  @ApiOperation({ summary: 'Пересвязать теги для всех событий (маппинг + ключевые слова)' })
  retag() {
    return this.tcSync.retagAll();
  }

  // --- Синхронизация всех источников ---

  @Post('sync/all')
  @ApiOperation({ summary: 'Синхронизация из всех источников (TC + Teplohod) + retag' })
  async syncAllSources() {
    // Параллельная синхронизация из обоих источников
    const [tc, tep] = await Promise.all([
      this.tcSync.syncAll(),   // retag встроен в конец tcSync.syncAll()
      this.tepSync.syncAll(),
    ]);
    // Дополнительный retag для событий teplohod (если tep sync завершился после TC retag)
    const retag = await this.tcSync.retagAll();
    return { ticketscloud: tc, teplohod: tep, retag };
  }
}
