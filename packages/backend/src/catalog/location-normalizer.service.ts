import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

/** Рекомендации по нормализации локации события (cityId, coordinates). */
export interface LocationNormalizeSuggest {
  cityId?: string;
  lat?: number;
  lng?: number;
}

/**
 * Нормализатор локации: унификация cityId и координат из venue/address.
 * Возвращает предложения для обновления, не изменяет данные.
 */
@Injectable()
export class LocationNormalizerService {
  constructor(private readonly prisma: PrismaService) {}

  async suggest(eventId: string): Promise<LocationNormalizeSuggest | null> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { venue: { select: { cityId: true, lat: true, lng: true } } },
    });
    if (!event) return null;

    const suggest: LocationNormalizeSuggest = {};
    if (event.venue?.cityId && !event.cityId) {
      suggest.cityId = event.venue.cityId;
    }
    if (event.venue?.lat != null && event.lat == null) {
      suggest.lat = Number(event.venue.lat);
    }
    if (event.venue?.lng != null && event.lng == null) {
      suggest.lng = Number(event.venue.lng);
    }

    return Object.keys(suggest).length > 0 ? suggest : null;
  }
}
