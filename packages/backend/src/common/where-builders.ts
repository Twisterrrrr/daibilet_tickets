/**
 * Типизированные where-билдеры для Prisma.
 * Заменяет where: any на Prisma.*WhereInput.
 */

import type { Prisma } from '@prisma/client';

export type EventWhereInput = Prisma.EventWhereInput;
export type ArticleWhereInput = Prisma.ArticleWhereInput;
export type UpsellItemWhereInput = Prisma.UpsellItemWhereInput;

export function buildEventWhere(filters: {
  city?: string;
  category?: string;
  source?: string;
  isActive?: boolean;
  search?: string;
}): Prisma.EventWhereInput {
  const where: Prisma.EventWhereInput = {};
  if (filters.city) where.city = { slug: filters.city };
  if (filters.category) where.category = filters.category as Prisma.EnumEventCategoryFilter;
  if (filters.source) where.source = filters.source as Prisma.EnumEventSourceFilter;
  if (filters.isActive !== undefined) where.isActive = filters.isActive;
  if (filters.search?.trim()) {
    const trimmed = filters.search.trim();
    where.OR = [
      { title: { contains: trimmed, mode: 'insensitive' } },
      { slug: { contains: trimmed, mode: 'insensitive' } },
      { tcEventId: trimmed },
      { offers: { some: { externalEventId: trimmed } } },
    ];
  }
  return where;
}

export function buildArticleWhere(filters: {
  city?: string;
  isPublished?: boolean;
  search?: string;
}): Prisma.ArticleWhereInput {
  const where: Prisma.ArticleWhereInput = { isDeleted: false };
  if (filters.city) where.city = { slug: filters.city };
  if (filters.isPublished !== undefined) where.isPublished = filters.isPublished;
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { slug: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  return where;
}

export function buildUpsellWhere(filters: { citySlug?: string | null }): Prisma.UpsellItemWhereInput {
  const where: Prisma.UpsellItemWhereInput = { isActive: true };
  if (filters.citySlug) {
    where.OR = [{ citySlug: null }, { citySlug: filters.citySlug }];
  } else {
    where.citySlug = null;
  }
  return where;
}
