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
   * Fallback-эвристики для маппинга внешних категорий в EventCategory.
   *
   * Важно: это НЕ “контракт”, а best-effort, чтобы импорт по умолчанию
   * садил событие в разумную категорию и не требовал ручного маппинга.
   *
   * Если нужны точные правила для конкретной пары source+category — используем DB mappings.
   */
  private fallbackHeuristicCategory(
    source: string,
    externalCategoryNorm: string,
  ): EventCategory | null {
    if (!externalCategoryNorm) return null;

    // Сейчас ручной маппинг реально нужен в основном для teplohod.info
    if (source === 'TEPLOHOD') {
      const s = externalCategoryNorm;

      // Музейные/выставочные истории
      if (
        s.includes('музей') ||
        s.includes('выстав') ||
        s.includes('галере') ||
        s.includes('экспозиц') ||
        s.includes('арт') ||
        s.includes('искусств')
      ) {
        return EventCategory.MUSEUM;
      }

      // Экскурсионный класс (включая прогулки/круизы, но без попытки угадать подкатегории)
      if (
        s.includes('экскурс') ||
        s.includes('прогул') ||
        s.includes('тур') ||
        s.includes('круиз') ||
        s.includes('маршрут')
      ) {
        return EventCategory.EXCURSION;
      }

      // “Концерт/шоу/спектакль/фестиваль/вечеринка”
      if (
        s.includes('концерт') ||
        s.includes('шоу') ||
        s.includes('спектак') ||
        s.includes('театр') ||
        s.includes('фестив') ||
        s.includes('вечерин') ||
        s.includes('дискот') ||
        s.includes('stand') ||
        s.includes('стендап')
      ) {
        return EventCategory.EVENT;
      }
    }

    return null;
  }

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
      SELECT "internalCategory"
      FROM source_category_mappings
      WHERE source = ${source} AND "externalCategoryNorm" = ${externalCategoryNorm}
      LIMIT 1
    `);

    if (mappings.length > 0) return mappings[0]!.internalCategory;

    // Fallback: best-effort эвристика, чтобы не требовать ручного маппинга на каждую новую строку.
    return this.fallbackHeuristicCategory(source, externalCategoryNorm);
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
        INSERT INTO source_category_unknowns (id, source, "externalCategoryRaw", "externalCategoryNorm", "firstSeenAt", "lastSeenAt", hits)
        VALUES (gen_random_uuid(), ${source}, ${externalCategoryRaw}, ${externalCategoryNorm}, NOW(), NOW(), 1)
        ON CONFLICT (source, "externalCategoryNorm")
        DO UPDATE SET
          "lastSeenAt" = NOW(),
          hits = source_category_unknowns.hits + 1
      `,
    );

    this.logger.debug('Unknown external category registered', {
      source,
      externalCategoryNorm,
    });
  }
}

