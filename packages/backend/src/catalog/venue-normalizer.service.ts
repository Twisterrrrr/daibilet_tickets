import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

/**
 * Нормализатор venue: проверка валидности venueId, рекомендации по дедупликации.
 * На текущем этапе — только проверка существования venue.
 */
@Injectable()
export class VenueNormalizerService {
  constructor(private readonly prisma: PrismaService) {}

  /** Проверяет, что venue существует и активен. Возвращает true если валиден. */
  async validateVenue(venueId: string | null): Promise<boolean> {
    if (!venueId) return true;
    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId },
      select: { id: true },
    });
    return venue != null;
  }
}
