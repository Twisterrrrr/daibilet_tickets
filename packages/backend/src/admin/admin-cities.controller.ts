import {
  Body,
  ConflictException,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@/prisma-client';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { buildPaginatedResult, paginationArgs, parsePagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { AuditInterceptor } from './audit.interceptor';
import { loadCityAdminListMetrics } from './city-admin-metrics.util';
import { cityReadinessListWhere, computeCityAdminReadiness } from './city-admin-readiness.util';
import { buildCityHubReadinessSnapshot, loadCityHubBatchAuxMetrics } from './hub-readiness/hub-readiness-snapshot.util';
import { UpdateCityDto } from './dto/admin.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/cities')
export class AdminCitiesController {
  private readonly publicSiteBase = process.env.PUBLIC_SITE_URL?.replace(/\/$/, '') ?? null;

  constructor(private readonly prisma: PrismaService) {}

  /** Опции регионов для фильтра списка городов (статический путь до `:id`). */
  @Get('region-options')
  async regionOptions() {
    const items = await this.prisma.region.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    });
    return { items };
  }

  @Get()
  async list(
    @Query('search') search?: string,
    @Query('hasEvents') hasEvents?: string,
    @Query('hasLandings') hasLandings?: string,
    @Query('hasCombos') hasCombos?: string,
    @Query('hasVenues') hasVenues?: string,
    @Query('hasSeo') hasSeo?: string,
    @Query('isActive') isActive?: string,
    @Query('readinessStatus') readinessStatus?: string,
    @Query('regionId') regionId?: string,
    @Query('updatedFrom') updatedFrom?: string,
    @Query('updatedTo') updatedTo?: string,
    @Query('cursor') cursor?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const andParts: Prisma.CityWhereInput[] = [];
    if (search) {
      andParts.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ],
      });
    }
    if (hasEvents === 'true') {
      andParts.push({ events: { some: { isDeleted: false } } });
    }
    if (hasLandings === 'true') {
      andParts.push({ landingPages: { some: { isDeleted: false } } });
    }
    if (hasCombos === 'true') {
      andParts.push({ comboPages: { some: {} } });
    }
    if (hasVenues === 'true') {
      andParts.push({ venues: { some: { isDeleted: false } } });
    }
    if (hasSeo === 'true') {
      andParts.push(
        { metaTitle: { not: null } },
        { NOT: { metaTitle: '' } },
        { metaDescription: { not: null } },
        { NOT: { metaDescription: '' } },
      );
    }
    if (isActive === 'true') {
      andParts.push({ isActive: true });
    } else if (isActive === 'false') {
      andParts.push({ isActive: false });
    }
    if (regionId) {
      andParts.push({ regionLinks: { some: { regionId } } });
    }
    if (updatedFrom || updatedTo) {
      const range: Prisma.DateTimeFilter = {};
      if (updatedFrom) {
        const d = new Date(updatedFrom);
        if (!Number.isNaN(d.getTime())) range.gte = d;
      }
      if (updatedTo) {
        const d = new Date(updatedTo);
        if (!Number.isNaN(d.getTime())) range.lte = d;
      }
      if (Object.keys(range).length) andParts.push({ updatedAt: range });
    }
    if (readinessStatus === 'READY' || readinessStatus === 'NEEDS_WORK' || readinessStatus === 'BLOCKED') {
      andParts.push(cityReadinessListWhere(readinessStatus));
    }

    const where: Prisma.CityWhereInput = andParts.length ? { AND: andParts } : {};

    const pg = parsePagination({ cursor, page, limit });
    const now = new Date();
    const [rawItems, total] = await Promise.all([
      this.prisma.city.findMany({
        where,
        include: {
          regionLinks: {
            take: 1,
            orderBy: { region: { name: 'asc' } },
            include: { region: { select: { id: true, name: true, slug: true } } },
          },
          _count: {
            select: {
              events: { where: { isDeleted: false } },
              venues: { where: { isDeleted: false } },
              landingPages: { where: { isDeleted: false } },
              comboPages: true,
              collections: true,
            },
          },
        },
        orderBy: [{ isFeatured: 'desc' }, { name: 'asc' }],
        ...paginationArgs(pg),
      }),
      this.prisma.city.count({ where }),
    ]);

    const cityIds = rawItems.map((c) => c.id);
    const [metrics, hubAux] = await Promise.all([
      loadCityAdminListMetrics(this.prisma, cityIds, now),
      loadCityHubBatchAuxMetrics(this.prisma, cityIds),
    ]);

    const items = rawItems.map((c) => {
      const region = c.regionLinks[0]?.region ?? null;
      const hasRegionLink = c.regionLinks.length > 0;
      const ec = c._count.events;
      const vc = c._count.venues;
      const lc = c._count.landingPages;
      const cc = c._count.collections;
      const combo = c._count.comboPages;
      const activeEv = metrics.activeEvents.get(c.id) ?? 0;
      const futureEv = metrics.futureEvents.get(c.id) ?? 0;
      const activeVen = metrics.activeVenues.get(c.id) ?? 0;
      const activeLan = metrics.activeLandings.get(c.id) ?? 0;

      const readiness = computeCityAdminReadiness({
        isActive: c.isActive,
        name: c.name,
        slug: c.slug,
        description: c.description,
        heroImage: c.heroImage,
        metaTitle: c.metaTitle,
        metaDescription: c.metaDescription,
        eventsCount: ec,
        activeEventsCount: activeEv,
        futureEventsCount: futureEv,
        venuesCount: vc,
        activeVenuesCount: activeVen,
        landingPagesCount: lc,
        activeLandingsCount: activeLan,
        comboPagesCount: combo,
        collectionsCount: cc,
        hasRegionLink,
      });

      const hasDescription = Boolean(c.description?.trim());
      const hasSeoF = Boolean(c.metaTitle?.trim() && c.metaDescription?.trim());
      const hasCover = Boolean(c.heroImage?.trim());

      const hubReadiness = buildCityHubReadinessSnapshot({
        cityId: c.id,
        slug: c.slug,
        name: c.name,
        isActive: c.isActive,
        isCatalogHub: c.isCatalogHub,
        catalogHubStatus: c.catalogHubStatus,
        description: c.description,
        heroImage: c.heroImage,
        metaTitle: c.metaTitle,
        metaDescription: c.metaDescription,
        storefrontActiveEvents: activeEv,
        collectionsCount: cc,
        landingsCount: lc,
        publishedArticlesCount: hubAux.articlesByCity.get(c.id) ?? 0,
        publishedPromoBlocksCount: hubAux.promoByCity.get(c.id) ?? 0,
        siteBaseUrl: this.publicSiteBase,
      });

      return {
        id: c.id,
        slug: c.slug,
        name: c.name,
        isActive: c.isActive,
        isFeatured: c.isFeatured,
        isPublished: c.isActive,
        isCatalogHub: c.isCatalogHub,
        catalogHubStatus: c.catalogHubStatus,
        region,
        stats: {
          eventsCount: ec,
          activeEventsCount: activeEv,
          futureEventsCount: futureEv,
          venuesCount: vc,
          activeVenuesCount: activeVen,
          landingsCount: lc,
          activeLandingsCount: activeLan,
          comboPagesCount: combo,
          collectionsCount: cc,
        },
        flags: {
          hasCover,
          hasDescription,
          hasSeo: hasSeoF,
        },
        readiness,
        readinessStatus: readiness.status,
        readinessScore: readiness.score,
        readinessKeySignals: readiness.keySignals,
        hubReadiness,
        updatedAt: c.updatedAt,
        createdAt: c.createdAt,
        /** Совместимость: прежний вид счётчиков */
        _count: c._count,
      };
    });

    return buildPaginatedResult(items, total, pg.limit);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const now = new Date();
    const c = await this.prisma.city.findUniqueOrThrow({
      where: { id },
      include: {
        regionLinks: {
          include: { region: { select: { id: true, name: true, slug: true } } },
          orderBy: { region: { name: 'asc' } },
        },
        hubForRegions: { select: { id: true, name: true, slug: true } },
        landingPages: {
          where: { isDeleted: false },
          orderBy: { updatedAt: 'desc' },
          take: 15,
          select: {
            id: true,
            slug: true,
            title: true,
            status: true,
            isActive: true,
            isIndexable: true,
            landingType: true,
            updatedAt: true,
          },
        },
        _count: {
          select: {
            events: { where: { isDeleted: false } },
            venues: { where: { isDeleted: false } },
            landingPages: { where: { isDeleted: false } },
            comboPages: true,
            collections: true,
            packages: true,
            articles: true,
          },
        },
      },
    });

    const metrics = await loadCityAdminListMetrics(this.prisma, [c.id], now);
    const ec = c._count.events;
    const vc = c._count.venues;
    const lc = c._count.landingPages;
    const cc = c._count.collections;
    const combo = c._count.comboPages;
    const activeEv = metrics.activeEvents.get(c.id) ?? 0;
    const futureEv = metrics.futureEvents.get(c.id) ?? 0;
    const activeVen = metrics.activeVenues.get(c.id) ?? 0;
    const activeLan = metrics.activeLandings.get(c.id) ?? 0;
    const hasRegionLink = c.regionLinks.length > 0;

    const readiness = computeCityAdminReadiness({
      isActive: c.isActive,
      name: c.name,
      slug: c.slug,
      description: c.description,
      heroImage: c.heroImage,
      metaTitle: c.metaTitle,
      metaDescription: c.metaDescription,
      eventsCount: ec,
      activeEventsCount: activeEv,
      futureEventsCount: futureEv,
      venuesCount: vc,
      activeVenuesCount: activeVen,
      landingPagesCount: lc,
      activeLandingsCount: activeLan,
      comboPagesCount: combo,
      collectionsCount: cc,
      hasRegionLink,
    });

    const hasDescription = Boolean(c.description?.trim());
    const hasSeoF = Boolean(c.metaTitle?.trim() && c.metaDescription?.trim());
    const hasCover = Boolean(c.heroImage?.trim());
    const publicPath = `/cities/${c.slug}`;

    const hubAux = await loadCityHubBatchAuxMetrics(this.prisma, [c.id]);
    const hubReadiness = buildCityHubReadinessSnapshot({
      cityId: c.id,
      slug: c.slug,
      name: c.name,
      isActive: c.isActive,
      isCatalogHub: c.isCatalogHub,
      catalogHubStatus: c.catalogHubStatus,
      description: c.description,
      heroImage: c.heroImage,
      metaTitle: c.metaTitle,
      metaDescription: c.metaDescription,
      storefrontActiveEvents: activeEv,
      collectionsCount: cc,
      landingsCount: lc,
      publishedArticlesCount: hubAux.articlesByCity.get(c.id) ?? 0,
      publishedPromoBlocksCount: hubAux.promoByCity.get(c.id) ?? 0,
      siteBaseUrl: this.publicSiteBase,
    });

    return {
      ...c,
      region: c.regionLinks[0]?.region ?? null,
      regions: c.regionLinks.map((l) => l.region),
      stats: {
        eventsCount: ec,
        activeEventsCount: activeEv,
        futureEventsCount: futureEv,
        venuesCount: vc,
        activeVenuesCount: activeVen,
        landingsCount: lc,
        activeLandingsCount: activeLan,
        comboPagesCount: combo,
        collectionsCount: cc,
      },
      flags: {
        hasCover,
        hasDescription,
        hasSeo: hasSeoF,
      },
      readiness,
      hubReadiness,
      seo: {
        metaTitle: c.metaTitle,
        metaDescription: c.metaDescription,
        h1Preview: c.name,
        publicPath,
        indexableHint: c.isActive,
      },
      relatedLandings: c.landingPages,
    };
  }

  @Patch(':id')
  @Roles('ADMIN', 'EDITOR')
  async update(@Param('id') id: string, @Body() data: UpdateCityDto) {
    const clean: Prisma.CityUpdateInput = {};
    if (data.name !== undefined) clean.name = data.name;
    if (data.description !== undefined) clean.description = data.description;
    if (data.heroImage !== undefined) clean.heroImage = data.heroImage;
    if (data.lat !== undefined) clean.lat = data.lat;
    if (data.lng !== undefined) clean.lng = data.lng;
    if (data.timezone !== undefined) clean.timezone = data.timezone;
    if (data.metaTitle !== undefined) clean.metaTitle = data.metaTitle;
    if (data.metaDescription !== undefined) clean.metaDescription = data.metaDescription;
    if (data.isFeatured !== undefined) clean.isFeatured = data.isFeatured;
    if (data.isActive !== undefined) clean.isActive = data.isActive;
    if (data.isCatalogHub !== undefined) clean.isCatalogHub = data.isCatalogHub;
    if (data.catalogHubStatus !== undefined) clean.catalogHubStatus = data.catalogHubStatus;

    // Optimistic lock
    if (data.version !== undefined) {
      const result = await this.prisma.city.updateMany({
        where: { id, version: data.version },
        data: { ...clean, version: { increment: 1 } },
      });
      if (result.count === 0) {
        throw new ConflictException('Данные были изменены другим пользователем. Перезагрузите и попробуйте снова.');
      }
      return this.prisma.city.findUniqueOrThrow({ where: { id } });
    }

    return this.prisma.city.update({ where: { id }, data: clean });
  }
}
