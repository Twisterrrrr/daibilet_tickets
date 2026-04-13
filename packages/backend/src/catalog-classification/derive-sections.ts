import type { SectionSlug, SectionView } from './classification.types';
import { sectionNames } from './classification.types';
import { SUBCATEGORY_SECTION } from './section-map';

export function deriveSectionFromSubcategorySlug(slug: string | null | undefined): SectionSlug | null {
  if (!slug) return null;
  return SUBCATEGORY_SECTION[slug] ?? null;
}

export function deriveSectionsFromSubcategories(
  subcategories: Array<{ slug: string }> | null | undefined,
): SectionView[] {
  const slugs = (subcategories ?? []).map((s) => s.slug).filter(Boolean);
  const uniq = new Set<SectionSlug>();
  for (const slug of slugs) {
    const section = deriveSectionFromSubcategorySlug(slug);
    if (section) uniq.add(section);
  }
  return Array.from(uniq).map((slug) => ({ slug, name: sectionNames[slug] }));
}

export function getSubcategorySlugsForSection(section: SectionSlug): string[] {
  return Object.entries(SUBCATEGORY_SECTION)
    .filter(([, s]) => s === section)
    .map(([slug]) => slug);
}

