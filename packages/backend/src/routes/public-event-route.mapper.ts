import { RoutePointTargetType } from '@/prisma-client';

import { PrismaService } from '../prisma/prisma.service';

export type PublicEventRoutePoint = {
  order: number;
  title: string;
  description: string | null;
  durationMinutes: number | null;
  isOptional: boolean;
  targetType: RoutePointTargetType;
  target: {
    title: string;
    slug: string;
    href: string;
    imageUrl?: string | null;
  };
};

export type PublicEventRouteBlock = {
  title: string | null;
  summary: string | null;
  points: PublicEventRoutePoint[];
};

/** Публичный блок маршрута: только опубликованный маршрут; точки с невалидными целями отбрасываются. */
export async function loadPublicEventRouteBlock(
  prisma: PrismaService,
  eventId: string,
): Promise<PublicEventRouteBlock | null> {
  const includePoints = {
    points: {
      orderBy: [{ order: 'asc' as const }, { id: 'asc' as const }],
      include: {
        venue: {
          select: {
            id: true,
            title: true,
            slug: true,
            lifecycleStatus: true,
            imageUrl: true,
            city: { select: { slug: true } },
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            isActive: true,
            isDeleted: true,
            imageUrl: true,
            city: { select: { slug: true } },
          },
        },
      },
    },
  };

  const owned = await prisma.route.findUnique({
    where: { eventId },
    include: includePoints,
  });

  const ev = await prisma.event.findUnique({
    where: { id: eventId },
    select: { routeId: true },
  });

  const legacy =
    !owned && ev?.routeId
      ? await prisma.route.findUnique({
          where: { id: ev.routeId },
          include: includePoints,
        })
      : null;

  const route = owned ?? legacy;

  if (!route || !route.isPublished) return null;

  const pointsOut: PublicEventRoutePoint[] = [];

  for (const p of route.points) {
    if (p.targetType === RoutePointTargetType.VENUE && p.venue) {
      const v = p.venue;
      if (v.lifecycleStatus !== 'ACTIVE') continue;
      pointsOut.push({
        order: p.order,
        title: (p.titleOverride?.trim() || v.title).trim(),
        description: p.description ?? null,
        durationMinutes: p.durationMinutes,
        isOptional: p.isOptional,
        targetType: p.targetType,
        target: {
          title: v.title,
          slug: v.slug,
          href: `/venues/${v.slug}`,
          imageUrl: v.imageUrl,
        },
      });
      continue;
    }
    if (p.targetType === RoutePointTargetType.EVENT && p.event) {
      const e = p.event;
      if (e.isDeleted || !e.isActive) continue;
      pointsOut.push({
        order: p.order,
        title: (p.titleOverride?.trim() || e.title).trim(),
        description: p.description ?? null,
        durationMinutes: p.durationMinutes,
        isOptional: p.isOptional,
        targetType: p.targetType,
        target: {
          title: e.title,
          slug: e.slug,
          href: `/events/${e.slug}`,
          imageUrl: e.imageUrl,
        },
      });
      continue;
    }
  }

  if (pointsOut.length === 0) return null;

  return {
    title: route.title ?? null,
    summary: route.summary ?? null,
    points: pointsOut,
  };
}
