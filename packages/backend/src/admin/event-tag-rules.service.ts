import { BadRequestException, Injectable } from '@nestjs/common';
import { StructuralTagGroup, TagKind } from '@/prisma-client';

type StructuralTagRow = {
  id: string;
  tagKind: TagKind | null;
  structuralGroup: StructuralTagGroup | null;
};

type PopularTagRow = {
  id: string;
  tagKind: TagKind | null;
  structuralGroup: StructuralTagGroup | null;
};

@Injectable()
export class EventTagRulesService {
  // На этапе Этап 5 фиксируем "структурную нормализацию" для SEO/фасетов:
  // по одной структурной сущности на группу (THEME/AUDIENCE/FORMAT).
  private readonly MAX_STRUCTURAL_TAGS_BY_GROUP: Record<StructuralTagGroup, number> = {
    THEME: 1,
    AUDIENCE: 1,
    FORMAT: 1,
  };

  assertStructuralTagLimits(rows: StructuralTagRow[]) {
    const groups = rows
      .map((r) => r.structuralGroup)
      .filter((g): g is StructuralTagGroup => g != null);

    // Структурный тег обязан иметь structuralGroup.
    if (groups.length !== rows.length) {
      throw new BadRequestException('Structural tags: у каждого тега должен быть structuralGroup');
    }

    // По tagKind на всякий случай (на контроллере тоже отфильтровано).
    const badKind = rows.find((r) => r.tagKind !== TagKind.STRUCTURAL);
    if (badKind) throw new BadRequestException('Structural tags: обнаружен тег не STRUCTURAL');

    const counts: Record<string, number> = {};
    for (const g of groups) counts[g] = (counts[g] ?? 0) + 1;

    for (const [g, count] of Object.entries(counts)) {
      const group = g as StructuralTagGroup;
      const max = this.MAX_STRUCTURAL_TAGS_BY_GROUP[group];
      if (count > max) {
        throw new BadRequestException(`Structural tags: для группы ${group} допускается максимум ${max} тег(а)`);
      }
    }
  }

  assertPopularTagWhitelist(rows: PopularTagRow[]) {
    const badKind = rows.find((r) => r.tagKind !== TagKind.POPULAR);
    if (badKind) throw new BadRequestException('Popular tags: обнаружен тег не POPULAR');

    // Popular-теги в данной архитектуре не должны попадать в structural taxonomy.
    const badStructuralGroup = rows.find((r) => r.structuralGroup != null);
    if (badStructuralGroup) throw new BadRequestException('Popular tags: structuralGroup должен быть null');
  }
}

