import { EventSubcategory, SubcategoryLayer } from '@/prisma-client';

export type SubcategoryRefDto = { code: string; nameRu: string };

type LinkRow = { subcategory: { code: string; nameRu: string; layer: SubcategoryLayer } };

const ENUM_VALUES = new Set<string>(Object.values(EventSubcategory));

/**
 * Публичное представление подкатегорий: приоритет M:N links, иначе legacy enum[].
 * TODO: удалить fallback на legacy Event.subcategories после полной миграции данных.
 */
export function resolveEventSubcategoryPresentation(
  links: LinkRow[] | undefined,
  legacyEnums: EventSubcategory[] | undefined,
): {
  primarySubcategory: SubcategoryRefDto | null;
  secondarySubcategories: SubcategoryRefDto[];
  subcategories: EventSubcategory[];
} {
  if (links?.length) {
    const primary = links.find((l) => l.subcategory.layer === SubcategoryLayer.PRIMARY)?.subcategory;
    const secondaries = links
      .filter((l) => l.subcategory.layer === SubcategoryLayer.SECONDARY)
      .map((l) => ({ code: l.subcategory.code, nameRu: l.subcategory.nameRu }));
    const codes = [primary?.code, ...secondaries.map((s) => s.code)].filter(Boolean) as string[];
    const subcategories = codes.filter((c) => ENUM_VALUES.has(c)) as EventSubcategory[];
    return {
      primarySubcategory: primary ? { code: primary.code, nameRu: primary.nameRu } : null,
      secondarySubcategories: secondaries,
      subcategories,
    };
  }
  return {
    primarySubcategory: null,
    secondarySubcategories: [],
    subcategories: legacyEnums ?? [],
  };
}

export function resolveVenueSubcategoryPresentation(
  links: LinkRow[] | undefined,
): {
  primarySubcategory: SubcategoryRefDto | null;
  secondarySubcategories: SubcategoryRefDto[];
} {
  if (!links?.length) {
    return { primarySubcategory: null, secondarySubcategories: [] };
  }
  const primary = links.find((l) => l.subcategory.layer === SubcategoryLayer.PRIMARY)?.subcategory;
  const secondaries = links
    .filter((l) => l.subcategory.layer === SubcategoryLayer.SECONDARY)
    .map((l) => ({ code: l.subcategory.code, nameRu: l.subcategory.nameRu }));
  return {
    primarySubcategory: primary ? { code: primary.code, nameRu: primary.nameRu } : null,
    secondarySubcategories: secondaries,
  };
}
