import { Injectable, Logger } from '@nestjs/common';
import { EventCategory, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

export function normalizeExternalCategory(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Сервис маппинга внешних категорий источников (TC, TEPLOHOD) в EventCategory.
 * Оркестрация (mapping → unknown + classifier → EVENT) выполняется в импортёрах.
 */
@Injectable()
export class CategoryMappingService {
  private readonly logger = new Logger(CategoryMappingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ищет маппинг по source + externalCategoryRaw. Без побочных эффектов.
   * @returns EventCategory или null, если маппинга нет
   */
  async findMappedCategory(
    source: string,
    externalCategoryRaw: string,
  ): Promise<EventCategory | null> {
    const externalCategoryNorm = normalizeExternalCategory(externalCategoryRaw);
    if (!externalCategoryNorm) return null;

    const mappings = await this.prisma.$queryRaw<
      Array<{ internalCategory: EventCategory }>
    >(Prisma.sql`
      SELECT internal_category AS "internalCategory"
      FROM source_category_mappings
      WHERE source = ${source} AND external_category_norm = ${externalCategoryNorm}
      LIMIT 1
    `);

    return mappings.length > 0 ? mappings[0]!.internalCategory : null;
  }

  /**
   * Регистрирует неизвестную внешнюю категорию (upsert unknown, инкремент hits).
   * Вызывать, когда маппинг не найден и нужно копить unknowns для ручного разбора.
   */
  async registerUnknownCategory(
    source: string,
    externalCategoryRaw: string,
  ): Promise<void> {
    const externalCategoryNorm = normalizeExternalCategory(externalCategoryRaw);
    if (!externalCategoryNorm) return;

    await this.prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO source_category_unknowns (id, source, external_category_raw, external_category_norm, first_seen_at, last_seen_at, hits)
        VALUES (gen_random_uuid(), ${source}, ${externalCategoryRaw}, ${externalCategoryNorm}, NOW(), NOW(), 1)
        ON CONFLICT (source, external_category_norm)
        DO UPDATE SET
          last_seen_at = NOW(),
          hits = source_category_unknowns.hits + 1
      `,
    );

    this.logger.debug('Unknown external category registered', {
      source,
      externalCategoryNorm,
    });
  }
}

