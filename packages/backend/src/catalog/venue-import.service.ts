import { Injectable } from '@nestjs/common';
import { VenueImportSource, VenueSourceType, VenueType } from '@prisma/client';
import { createHash } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';

export type ResolveImportedVenueInput = {
  cityId: string;
  importSource: VenueImportSource;
  externalVenueId: string;
  rawName: string;
  rawAddress: string | null;
  lat: number | null;
  lng: number | null;
  /** Ticketscloud: меньше авто-матчинга; Teplohod: больше */
  aggressiveStrongMatch?: boolean;
};

/**
 * Импорт площадок: матчинг по external id / strong match, иначе DRAFT + без публичной страницы.
 */
@Injectable()
export class VenueImportService {
  constructor(private readonly prisma: PrismaService) {}

  static normalizeText(s: string): string {
    return s
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  /**
   * Разрешить MERGED → канонический id (цепочка).
   */
  async resolveCanonicalVenueId(venueId: string): Promise<string> {
    let current = venueId;
    for (let i = 0; i < 16; i += 1) {
      const row = await this.prisma.venue.findUnique({
        where: { id: current },
        select: { id: true, lifecycleStatus: true, mergeTargetId: true },
      });
      if (!row) return current;
      if (row.lifecycleStatus === 'MERGED' && row.mergeTargetId) {
        current = row.mergeTargetId;
        continue;
      }
      return row.id;
    }
    return current;
  }

  async resolveOrCreateImportedVenue(input: ResolveImportedVenueInput): Promise<string> {
    const nn = VenueImportService.normalizeText(input.rawName || 'Площадка');
    const na = input.rawAddress ? VenueImportService.normalizeText(input.rawAddress) : null;

    const ext = await this.prisma.venue.findFirst({
      where: {
        cityId: input.cityId,
        importSource: input.importSource,
        externalVenueId: input.externalVenueId,
        lifecycleStatus: { not: 'REJECTED' },
      },
    });
    if (ext) {
      return this.resolveCanonicalVenueId(ext.id);
    }

    if (na) {
      let strong =
        (await this.prisma.venue.findFirst({
          where: {
            cityId: input.cityId,
            normalizedName: nn,
            normalizedAddress: na,
            lifecycleStatus: 'ACTIVE',
            isDeleted: false,
          },
        })) ?? null;
      if (!strong && input.aggressiveStrongMatch) {
        strong = await this.prisma.venue.findFirst({
          where: {
            cityId: input.cityId,
            normalizedName: nn,
            normalizedAddress: na,
            lifecycleStatus: 'DRAFT',
            isDeleted: false,
          },
        });
      }
      if (strong) {
        return this.resolveCanonicalVenueId(strong.id);
      }
    }

    const slug = await this.allocateImportSlug(
      `${input.importSource}-${input.externalVenueId}`.replace(/[^a-zA-Z0-9_-]+/g, '-'),
    );

    const title = input.rawName.trim() || 'Площадка';
    const created = await this.prisma.venue.create({
      data: {
        cityId: input.cityId,
        slug,
        title,
        venueType: VenueType.EXHIBITION_HALL,
        address: input.rawAddress?.trim() || null,
        lat: input.lat,
        lng: input.lng,
        isActive: true,
        isFeatured: false,
        isDeleted: false,
        lifecycleStatus: 'DRAFT',
        isPublished: false,
        sourceType: VenueSourceType.IMPORTED,
        importSource: input.importSource,
        externalVenueId: input.externalVenueId,
        rawName: input.rawName,
        rawAddress: input.rawAddress,
        normalizedName: nn,
        normalizedAddress: na,
        needsReview: input.importSource === 'TICKETSCLOUD',
        confidenceScore: input.aggressiveStrongMatch ? 0.6 : 0.35,
        createdByType: 'IMPORT',
      },
    });

    return created.id;
  }

  private async allocateImportSlug(seed: string): Promise<string> {
    const hash = createHash('sha256').update(seed).digest('hex').slice(0, 14);
    const base = `imp-${hash}`.slice(0, 80);
    let attempt = base;
    let n = 0;
    while (
      await this.prisma.venue.findUnique({
        where: { slug: attempt },
        select: { id: true },
      })
    ) {
      n += 1;
      attempt = `${base}-${n}`.slice(0, 80);
    }
    return attempt;
  }
}
