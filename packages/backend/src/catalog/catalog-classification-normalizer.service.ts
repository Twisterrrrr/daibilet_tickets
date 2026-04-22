import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, SubcategoryType } from '@/prisma-client';

import { PrismaService } from '../prisma/prisma.service';
import { SubcategoryPolicyService } from '../subcategories/subcategory-policy.service';

export type ResolvedEventSubcategoryRow = { id: string; slug: string };

/**
 * Нормализация выбора подкатегорий для события: уникальность, порядок, лимит (см. SubcategoryPolicyService).
 * Используется при записи M:N связей; publish-gate читает фактическое состояние в БД.
 */
@Injectable()
export class CatalogClassificationNormalizerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subcategoryPolicy: SubcategoryPolicyService,
  ) {}

  /**
   * Разрешает id/slug в уникальный упорядоченный список активных подкатегорий для Event.
   * @throws BadRequestException при неизвестных/неактивных записях или превышении лимита.
   */
  async resolveActiveEventSubcategories(
    subcategoryIds: string[] | undefined,
    subcategorySlugs: string[] | undefined,
    tx?: Prisma.TransactionClient,
  ): Promise<ResolvedEventSubcategoryRow[]> {
    const idSet = new Set((subcategoryIds ?? []).filter(Boolean));
    const slugSet = new Set((subcategorySlugs ?? []).filter(Boolean));
    if (idSet.size === 0 && slugSet.size === 0) {
      throw new BadRequestException('Необходимо передать subcategoryIds и/или subcategorySlugs');
    }

    const client = tx ?? this.prisma;
    const orClause: Prisma.SubcategoryWhereInput[] = [];
    if (idSet.size) orClause.push({ id: { in: [...idSet] } });
    if (slugSet.size) orClause.push({ slug: { in: [...slugSet] } });

    const rows = await client.subcategory.findMany({
      where: {
        isActive: true,
        type: { in: [SubcategoryType.UNIVERSAL, SubcategoryType.EVENT_ONLY] },
        OR: orClause,
      },
      select: { id: true, slug: true },
    });

    const byId = new Map(rows.map((r) => [r.id, r]));
    const bySlug = new Map(rows.map((r) => [r.slug, r]));

    for (const id of idSet) {
      if (!byId.has(id)) {
        throw new BadRequestException('Некоторые подкатегории не найдены, неактивны или недоступны для Event');
      }
    }
    for (const slug of slugSet) {
      if (!bySlug.has(slug)) {
        throw new BadRequestException('Некоторые подкатегории не найдены, неактивны или недоступны для Event');
      }
    }

    const ordered: ResolvedEventSubcategoryRow[] = [];
    const seen = new Set<string>();
    for (const id of idSet) {
      const r = byId.get(id)!;
      if (!seen.has(r.id)) {
        ordered.push(r);
        seen.add(r.id);
      }
    }
    for (const slug of slugSet) {
      const r = bySlug.get(slug)!;
      if (!seen.has(r.id)) {
        ordered.push(r);
        seen.add(r.id);
      }
    }

    this.subcategoryPolicy.assertEventLimit(ordered.length);
    return ordered;
  }
}
