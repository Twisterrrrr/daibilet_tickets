import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventCategory, Prisma, SubcategoryLayer, SubcategoryType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import {
  EVENT_PRIMARY_CODES_BY_CATEGORY,
  MAX_SECONDARY_SUBCATEGORIES,
  VENUE_PRIMARY_CODES,
} from './subcategory-assignment.constants';

@Injectable()
export class SubcategoryAssignmentService {
  constructor(private readonly prisma: PrismaService) {}

  async assignEventSubcategories(
    eventId: string,
    primaryCode: string,
    secondaryCodes: string[],
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    const event = await client.event.findUnique({
      where: { id: eventId },
      select: { id: true, category: true, override: { select: { category: true } } },
    });
    if (!event) throw new NotFoundException('Событие не найдено');

    const category = (event.override?.category ?? event.category) as EventCategory | null;
    if (!category) {
      throw new BadRequestException('У события не задана category — сначала выберите категорию');
    }

    const allowedPrimary = EVENT_PRIMARY_CODES_BY_CATEGORY[category];
    if (!allowedPrimary.includes(primaryCode)) {
      throw new BadRequestException(
        `primaryCode недопустим для категории ${category}: ожидается один из [${allowedPrimary.join(', ')}]`,
      );
    }

    // Исторически в базе могли отсутствовать PRIMARY-слой (все коды лежали в SECONDARY).
    // Для MVP-процесса импорта/модерации важнее иметь связку по code, чем блокировать импорт.
    const primaryRow =
      (await client.subcategory.findFirst({
        where: {
          code: primaryCode,
          type: SubcategoryType.EVENT_ONLY,
          layer: SubcategoryLayer.PRIMARY,
          isActive: true,
        },
        select: { id: true },
      })) ??
      (await client.subcategory.findFirst({
        where: {
          code: primaryCode,
          type: SubcategoryType.EVENT_ONLY,
          layer: SubcategoryLayer.SECONDARY,
          isActive: true,
        },
        select: { id: true },
      }));
    if (!primaryRow) {
      throw new BadRequestException(`PRIMARY подкатегория не найдена или неактивна: ${primaryCode}`);
    }

    const secUnique = Array.from(new Set((secondaryCodes ?? []).filter(Boolean)));
    if (secUnique.length > MAX_SECONDARY_SUBCATEGORIES) {
      throw new BadRequestException(
        `Не более ${MAX_SECONDARY_SUBCATEGORIES} дополнительных подкатегорий (secondaryCodes)`,
      );
    }

    const secondaryRows =
      secUnique.length === 0
        ? []
        : await client.subcategory.findMany({
            where: {
              code: { in: secUnique },
              layer: SubcategoryLayer.SECONDARY,
              isActive: true,
              type: { in: [SubcategoryType.UNIVERSAL, SubcategoryType.EVENT_ONLY] },
            },
            select: { id: true, code: true },
          });

    if (secondaryRows.length !== secUnique.length) {
      throw new BadRequestException(
        'Некоторые secondaryCodes не найдены, неактивны или не являются SECONDARY (UNIVERSAL / EVENT_ONLY)',
      );
    }

    await client.eventSubcategoryLink.deleteMany({ where: { eventId } });
    await client.eventSubcategoryLink.createMany({
      data: [
        { eventId, subcategoryId: primaryRow.id },
        ...secondaryRows.map((r) => ({ eventId, subcategoryId: r.id })),
      ],
      skipDuplicates: true,
    });
  }

  async assignVenueSubcategories(
    venueId: string,
    primaryCode: string,
    secondaryCodes: string[],
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    const venue = await client.venue.findUnique({ where: { id: venueId }, select: { id: true } });
    if (!venue) throw new NotFoundException('Площадка не найдена');

    if (!VENUE_PRIMARY_CODES.includes(primaryCode)) {
      throw new BadRequestException(
        `primaryCode недопустим для площадки: ожидается один из [${VENUE_PRIMARY_CODES.join(', ')}]`,
      );
    }

    const primaryRow =
      (await client.subcategory.findFirst({
        where: {
          code: primaryCode,
          type: SubcategoryType.VENUE_ONLY,
          layer: SubcategoryLayer.PRIMARY,
          isActive: true,
        },
        select: { id: true },
      })) ??
      (await client.subcategory.findFirst({
        where: {
          code: primaryCode,
          type: SubcategoryType.VENUE_ONLY,
          layer: SubcategoryLayer.SECONDARY,
          isActive: true,
        },
        select: { id: true },
      }));
    if (!primaryRow) {
      throw new BadRequestException(`PRIMARY подкатегория площадки не найдена или неактивна: ${primaryCode}`);
    }

    const secUnique = Array.from(new Set((secondaryCodes ?? []).filter(Boolean)));
    if (secUnique.length > MAX_SECONDARY_SUBCATEGORIES) {
      throw new BadRequestException(
        `Не более ${MAX_SECONDARY_SUBCATEGORIES} дополнительных подкатегорий (secondaryCodes)`,
      );
    }

    const secondaryRows =
      secUnique.length === 0
        ? []
        : await client.subcategory.findMany({
            where: {
              code: { in: secUnique },
              layer: SubcategoryLayer.SECONDARY,
              isActive: true,
              type: { in: [SubcategoryType.UNIVERSAL, SubcategoryType.VENUE_ONLY] },
            },
            select: { id: true, code: true },
          });

    if (secondaryRows.length !== secUnique.length) {
      throw new BadRequestException(
        'Некоторые secondaryCodes не найдены, неактивны или не являются SECONDARY (UNIVERSAL / VENUE_ONLY)',
      );
    }

    await client.venueSubcategoryLink.deleteMany({ where: { venueId } });
    await client.venueSubcategoryLink.createMany({
      data: [
        { venueId, subcategoryId: primaryRow.id },
        ...secondaryRows.map((r) => ({ venueId, subcategoryId: r.id })),
      ],
      skipDuplicates: true,
    });
  }
}
