import { randomUUID } from 'crypto';

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { RoutePointTargetType } from '@/prisma-client';

import { CacheInvalidationService } from '../cache/cache-invalidation.service';
import { PrismaService } from '../prisma/prisma.service';

export type AdminRouteWarningCode =
  | 'CITY_MISMATCH'
  | 'TARGET_UNPUBLISHED'
  | 'TARGET_ARCHIVED'
  | 'TARGET_MISSING_PRIMARY_IMAGE';

export type AdminRouteWarning = { code: AdminRouteWarningCode; message?: string };

export type AdminEventRoutePointTargetDto = {
  id: string;
  type: 'VENUE' | 'EVENT';
  title: string;
  slug: string;
  cityId?: string | null;
  cityName?: string | null;
  coverImageUrl?: string | null;
  isPublished?: boolean | null;
  lifecycleStatus?: string | null;
};

export type AdminEventRoutePointDto = {
  id: string;
  order: number;
  targetType: RoutePointTargetType;
  venueId: string | null;
  eventId: string | null;
  titleOverride: string | null;
  description: string | null;
  durationMinutes: number | null;
  isOptional: boolean;
  target: AdminEventRoutePointTargetDto;
};

export type AdminEventRouteDto = {
  id: string;
  eventId: string;
  title: string | null;
  summary: string | null;
  isPublished: boolean;
  version: number;
  updatedAt: string;
  points: AdminEventRoutePointDto[];
  warnings: AdminRouteWarning[];
};

export type PutEventRoutePointInput = {
  id?: string;
  order: number;
  targetType: RoutePointTargetType;
  venueId?: string | null;
  eventId?: string | null;
  titleOverride?: string | null;
  description?: string | null;
  durationMinutes?: number | null;
  isOptional?: boolean;
};

export type PutEventRouteInput = {
  title?: string | null;
  summary?: string | null;
  isPublished?: boolean;
  version?: number;
  points: PutEventRoutePointInput[];
};

const pointInclude = {
  venue: {
    select: {
      id: true,
      title: true,
      slug: true,
      cityId: true,
      lifecycleStatus: true,
      imageUrl: true,
      city: { select: { id: true, name: true } },
    },
  },
  event: {
    select: {
      id: true,
      title: true,
      slug: true,
      cityId: true,
      isActive: true,
      isDeleted: true,
      imageUrl: true,
      city: { select: { id: true, name: true } },
    },
  },
} as const;

@Injectable()
export class AdminEventRouteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheInvalidation: CacheInvalidationService,
  ) {}

  private assertPointTarget(t: RoutePointTargetType, venueId: string | null, eventId: string | null): void {
    if (t === RoutePointTargetType.VENUE) {
      if (!venueId || eventId) throw new BadRequestException('Для VENUE нужен venueId и пустой eventId');
      return;
    }
    if (t === RoutePointTargetType.EVENT) {
      if (!eventId || venueId) throw new BadRequestException('Для EVENT нужен eventId и пустой venueId');
      return;
    }
    throw new BadRequestException('Некорректный targetType');
  }

  private normalizeOrders(points: PutEventRoutePointInput[]): PutEventRoutePointInput[] {
    const sorted = [...points].sort((a, b) => a.order - b.order);
    return sorted.map((p, idx) => ({ ...p, order: idx }));
  }

  private buildWarnings(
    ownerCityId: string | null,
    points: Array<{
      targetType: RoutePointTargetType;
      venue: {
        cityId: string;
        lifecycleStatus: string;
        imageUrl: string | null;
      } | null;
      event: {
        cityId: string;
        isActive: boolean;
        isDeleted: boolean;
        imageUrl: string | null;
      } | null;
    }>,
  ): AdminRouteWarning[] {
    const w: AdminRouteWarning[] = [];
    for (const p of points) {
      if (p.targetType === RoutePointTargetType.VENUE && p.venue) {
        if (ownerCityId && p.venue.cityId !== ownerCityId) {
          w.push({ code: 'CITY_MISMATCH', message: 'Площадка в другом городе' });
        }
        if (p.venue.lifecycleStatus && p.venue.lifecycleStatus !== 'ACTIVE') {
          w.push({ code: 'TARGET_UNPUBLISHED', message: 'Площадка не в статусе ACTIVE' });
        }
        if (!p.venue.imageUrl) {
          w.push({ code: 'TARGET_MISSING_PRIMARY_IMAGE', message: 'Нет обложки у площадки' });
        }
      }
      if (p.targetType === RoutePointTargetType.EVENT && p.event) {
        if (ownerCityId && p.event.cityId !== ownerCityId) {
          w.push({ code: 'CITY_MISMATCH', message: 'Событие в другом городе' });
        }
        if (!p.event.isActive) {
          w.push({ code: 'TARGET_ARCHIVED', message: 'Событие неактивно' });
        }
        if (!p.event.isActive || p.event.isDeleted) {
          w.push({ code: 'TARGET_UNPUBLISHED', message: 'Событие неактивно или удалено' });
        }
        if (!p.event.imageUrl) {
          w.push({ code: 'TARGET_MISSING_PRIMARY_IMAGE', message: 'Нет обложки у события' });
        }
      }
    }
    const seen = new Set<string>();
    return w.filter((x) => {
      const k = `${x.code}:${x.message ?? ''}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  private toAdminPointDto(p: {
    id: string;
    order: number;
    targetType: RoutePointTargetType;
    venueId: string | null;
    eventId: string | null;
    titleOverride: string | null;
    description: string | null;
    durationMinutes: number | null;
    isOptional: boolean;
    venue: {
      id: string;
      title: string;
      slug: string;
      cityId: string;
      lifecycleStatus: string;
      imageUrl: string | null;
      city: { id: string; name: string } | null;
    } | null;
    event: {
      id: string;
      title: string;
      slug: string;
      cityId: string;
      isActive: boolean;
      isDeleted: boolean;
      imageUrl: string | null;
      city: { id: string; name: string } | null;
    } | null;
  }): AdminEventRoutePointDto {
    const target: AdminEventRoutePointTargetDto =
      p.targetType === RoutePointTargetType.VENUE && p.venue
        ? {
            id: p.venue.id,
            type: 'VENUE',
            title: p.venue.title,
            slug: p.venue.slug,
            cityId: p.venue.cityId,
            cityName: p.venue.city?.name ?? null,
            coverImageUrl: p.venue.imageUrl,
            isPublished: p.venue.lifecycleStatus === 'ACTIVE',
            lifecycleStatus: p.venue.lifecycleStatus,
          }
        : p.targetType === RoutePointTargetType.EVENT && p.event
          ? {
              id: p.event.id,
              type: 'EVENT',
              title: p.event.title,
              slug: p.event.slug,
              cityId: p.event.cityId,
              cityName: p.event.city?.name ?? null,
              coverImageUrl: p.event.imageUrl,
              isPublished: p.event.isActive && !p.event.isDeleted,
              lifecycleStatus: !p.event.isActive ? 'INACTIVE' : p.event.isDeleted ? 'DELETED' : 'ACTIVE',
            }
          : {
              id: p.venueId ?? p.eventId ?? 'unknown',
              type: p.targetType === RoutePointTargetType.VENUE ? 'VENUE' : 'EVENT',
              title: '(не найдено)',
              slug: '-',
            };

    return {
      id: p.id,
      order: p.order,
      targetType: p.targetType,
      venueId: p.venueId,
      eventId: p.eventId,
      titleOverride: p.titleOverride,
      description: p.description,
      durationMinutes: p.durationMinutes,
      isOptional: p.isOptional,
      target,
    };
  }

  async getForAdmin(eventId: string): Promise<AdminEventRouteDto | null> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, cityId: true, routeId: true },
    });
    if (!event) throw new NotFoundException('Событие не найдено');

    const owned = await this.prisma.route.findUnique({
      where: { eventId },
      include: { points: { orderBy: [{ order: 'asc' }, { id: 'asc' }], include: pointInclude } },
    });
    const legacy =
      !owned && event.routeId
        ? await this.prisma.route.findUnique({
            where: { id: event.routeId },
            include: { points: { orderBy: [{ order: 'asc' }, { id: 'asc' }], include: pointInclude } },
          })
        : null;

    const route = owned ?? legacy;
    if (!route) return null;

    const warnings = this.buildWarnings(event.cityId, route.points);

    return {
      id: route.id,
      eventId,
      title: route.title ?? null,
      summary: route.summary ?? null,
      isPublished: route.isPublished,
      version: route.version,
      updatedAt: route.updatedAt.toISOString(),
      points: route.points.map((pt) => this.toAdminPointDto(pt as Parameters<AdminEventRouteService['toAdminPointDto']>[0])),
      warnings,
    };
  }

  async putForEvent(eventId: string, body: PutEventRouteInput): Promise<AdminEventRouteDto> {
    const normalized = this.normalizeOrders(body.points ?? []);

    const result = await this.prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({
        where: { id: eventId },
        select: { id: true, title: true, slug: true, cityId: true, routeId: true },
      });
      if (!event) throw new NotFoundException('Событие не найдено');

      let route =
        (await tx.route.findUnique({ where: { eventId } })) ??
        (event.routeId
          ? await tx.route.findUnique({
              where: { id: event.routeId },
            })
          : null);

      if (route?.eventId && route.eventId !== eventId) {
        route = null;
      }

      if (route && !route.eventId) {
        const usage = await tx.event.count({ where: { routeId: route.id } });
        if (usage > 1) {
          route = null;
        } else {
          route = await tx.route.update({
            where: { id: route.id },
            data: { eventId },
          });
        }
      }

      if (body.version !== undefined && route && body.version !== route.version) {
        throw new ConflictException('Версия маршрута изменилась. Обновите страницу и повторите сохранение.');
      }

      const venueIds = normalized.filter((p) => p.targetType === RoutePointTargetType.VENUE).map((p) => p.venueId!);
      const eventIds = normalized.filter((p) => p.targetType === RoutePointTargetType.EVENT).map((p) => p.eventId!);

      const [venues, events] = await Promise.all([
        venueIds.length
          ? tx.venue.findMany({
              where: { id: { in: venueIds } },
              select: { id: true, cityId: true },
            })
          : [],
        eventIds.length
          ? tx.event.findMany({
              where: { id: { in: eventIds } },
              select: { id: true, cityId: true },
            })
          : [],
      ]);
      const venueSet = new Map(venues.map((v) => [v.id, v]));
      const eventSet = new Map(events.map((e) => [e.id, e]));

      for (const p of normalized) {
        this.assertPointTarget(
          p.targetType,
          p.venueId ?? null,
          p.eventId ?? null,
        );
        if (p.targetType === RoutePointTargetType.VENUE) {
          if (!venueSet.has(p.venueId!)) throw new BadRequestException(`Площадка не найдена: ${p.venueId}`);
        } else {
          if (!eventSet.has(p.eventId!)) throw new BadRequestException(`Событие не найдено: ${p.eventId}`);
        }
      }

      const slug = `route-${event.slug}-${randomUUID().slice(0, 10)}`;
      const nextVersion = (route?.version ?? 0) + 1;

      if (!route) {
        route = await tx.route.create({
          data: {
            name: body.title?.trim() || event.title || 'Маршрут',
            slug,
            description: null,
            pointsOfInterest: [],
            estimatedMinutes: null,
            isActive: true,
            eventId,
            title: body.title?.trim() ?? null,
            summary: body.summary?.trim() ?? null,
            isPublished: body.isPublished ?? false,
            version: 1,
          },
        });
        await tx.event.update({
          where: { id: eventId },
          data: { routeId: route.id },
        });
      } else {
        route = await tx.route.update({
          where: { id: route.id },
          data: {
            title: body.title !== undefined ? (body.title?.trim() ?? null) : undefined,
            summary: body.summary !== undefined ? (body.summary?.trim() ?? null) : undefined,
            isPublished: body.isPublished ?? undefined,
            version: nextVersion,
            ...(body.title !== undefined && !body.title?.trim()
              ? {}
              : body.title?.trim()
                ? { name: body.title.trim() }
                : {}),
          },
        });
      }

      await tx.routePoint.deleteMany({ where: { routeId: route.id } });

      for (const p of normalized) {
        await tx.routePoint.create({
          data: {
            routeId: route.id,
            order: p.order,
            targetType: p.targetType,
            venueId: p.targetType === RoutePointTargetType.VENUE ? p.venueId! : null,
            eventId: p.targetType === RoutePointTargetType.EVENT ? p.eventId! : null,
            titleOverride: p.titleOverride?.trim() ? p.titleOverride.trim() : null,
            description: p.description?.trim() ? p.description.trim() : null,
            durationMinutes: p.durationMinutes != null ? Number(p.durationMinutes) : null,
            isOptional: p.isOptional ?? false,
          },
        });
      }

      await tx.event.update({
        where: { id: eventId },
        data: { routeId: route.id },
      });

      return tx.route.findUniqueOrThrow({
        where: { id: route.id },
        include: { points: { orderBy: [{ order: 'asc' }, { id: 'asc' }], include: pointInclude } },
      });
    });

    await this.cacheInvalidation.invalidateEventById(eventId);

    const warnings = this.buildWarnings(
      (await this.prisma.event.findUnique({ where: { id: eventId }, select: { cityId: true } }))?.cityId ?? null,
      result.points,
    );

    return {
      id: result.id,
      eventId,
      title: result.title ?? null,
      summary: result.summary ?? null,
      isPublished: result.isPublished,
      version: result.version,
      updatedAt: result.updatedAt.toISOString(),
      points: result.points.map((pt) => this.toAdminPointDto(pt as Parameters<AdminEventRouteService['toAdminPointDto']>[0])),
      warnings,
    };
  }

  async deleteForEvent(eventId: string): Promise<{ ok: true }> {
    await this.prisma.$transaction(async (tx) => {
      const owned = await tx.route.findUnique({ where: { eventId }, select: { id: true } });
      if (owned) {
        await tx.route.delete({ where: { id: owned.id } });
        await tx.event.update({ where: { id: eventId }, data: { routeId: null } });
        return;
      }
      const ev = await tx.event.findUnique({ where: { id: eventId }, select: { routeId: true } });
      if (ev?.routeId) {
        await tx.route.delete({ where: { id: ev.routeId } });
        await tx.event.update({ where: { id: eventId }, data: { routeId: null } });
      }
    });
    await this.cacheInvalidation.invalidateEventById(eventId);
    return { ok: true };
  }
}
