import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

/**
 * Коды landing-specific SEO / контент-аудита (read-model, без отдельной таблицы).
 * Домены: metadata, canonical/indexability, source (filters), content blocks, intent collision.
 */
export type LandingSeoIssueCode =
  | 'NO_H1'
  | 'NO_SEO_TITLE'
  | 'NO_SEO_DESCRIPTION'
  | 'TITLE_TOO_LONG'
  | 'DESCRIPTION_TOO_LONG'
  | 'NO_HERO'
  | 'NO_VISIBLE_BLOCKS'
  | 'NO_FAQ'
  | 'NO_SEO_TEXT'
  | 'LOW_EVENT_COUNT'
  | 'NO_MATCHED_EVENTS'
  | 'CANONICAL_MISSING'
  | 'CANONICAL_CONFLICT'
  | 'CITY_MULTI_CITY_INTENT_COLLISION'
  | 'INDEXABLE_WITH_THIN_CONTENT'
  | 'BROKEN_RELATED_LINK'
  | 'MISSING_OG_IMAGE';

const TITLE_MAX = 70;
const DESC_MAX = 320;

export type LandingSeoAuditResult = {
  issues: LandingSeoIssueCode[];
  warnings: LandingSeoIssueCode[];
  score: number;
};

@Injectable()
export class LandingSeoAuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @param matchedEventsCount — из filters-first resolver (`resolveAdminResolvedEvents`), без collection selection.
   */
  async auditLandingPage(landingId: string, matchedEventsCount?: number): Promise<LandingSeoAuditResult> {
    const landing = await this.prisma.landingPage.findUnique({
      where: { id: landingId },
      include: {
        city: { select: { slug: true, name: true } },
        contentBlocks: {
          where: { isEnabled: true },
          select: { id: true, type: true },
        },
        canonicalLanding: { select: { id: true, slug: true, title: true, landingType: true, cityId: true } },
      },
    });

    if (!landing) {
      return { issues: ['NO_H1'], warnings: [], score: 0 };
    }

    const issues: LandingSeoIssueCode[] = [];
    const warnings: LandingSeoIssueCode[] = [];

    const seoTitle = (landing.seoTitle ?? landing.metaTitle ?? '').trim();
    const seoDesc = (landing.seoDescription ?? landing.metaDescription ?? '').trim();
    const h1 = (landing.seoH1 ?? landing.title ?? '').trim();

    if (!h1) issues.push('NO_H1');
    if (!seoTitle) issues.push('NO_SEO_TITLE');
    if (!seoDesc) issues.push('NO_SEO_DESCRIPTION');
    if (seoTitle.length > TITLE_MAX) warnings.push('TITLE_TOO_LONG');
    if (seoDesc.length > DESC_MAX) warnings.push('DESCRIPTION_TOO_LONG');

    const hasHero =
      Boolean(landing.heroTitle?.trim()) ||
      Boolean(landing.heroText?.trim()) ||
      Boolean(landing.heroImageUrl?.trim()) ||
      Boolean(landing.subtitle?.trim());
    if (!hasHero) warnings.push('NO_HERO');

    const hasInfoBlocks =
      landing.infoBlocks != null && typeof landing.infoBlocks === 'object' && Array.isArray(landing.infoBlocks)
        ? landing.infoBlocks.length > 0
        : false;

    if (landing.contentBlocks.length === 0 && !hasInfoBlocks && !landing.faq) {
      warnings.push('NO_VISIBLE_BLOCKS');
    }

    const hasFaqBlock = landing.contentBlocks.some((b) => b.type === 'FAQ');
    const hasLegacyFaq =
      landing.faq != null && typeof landing.faq === 'object' && Array.isArray(landing.faq) && landing.faq.length > 0;
    if (!hasFaqBlock && !hasLegacyFaq) warnings.push('NO_FAQ');

    const hasSeoTextBlock = landing.contentBlocks.some((b) => b.type === 'SEO_TEXT');
    if (!hasSeoTextBlock && !landing.legalText?.trim()) {
      warnings.push('NO_SEO_TEXT');
    }

    if (!landing.ogImageUrl?.trim()) warnings.push('MISSING_OG_IMAGE');

    if (landing.isIndexable) {
      const thin = !hasHero && landing.contentBlocks.length === 0 && !seoDesc;
      if (thin) issues.push('INDEXABLE_WITH_THIN_CONTENT');
    }

    if (!landing.canonicalUrl?.trim()) {
      warnings.push('CANONICAL_MISSING');
    }

    if (landing.canonicalLandingId && !landing.canonicalLanding) {
      issues.push('CANONICAL_CONFLICT');
    }

    // Intent collision: другой лендинг с тем же slug в другом типе (CITY vs MULTI_CITY)
    if (landing.cityId) {
      const multi = await this.prisma.landingPage.findFirst({
        where: {
          slug: landing.slug,
          cityId: null,
          landingType: 'MULTI_CITY',
          isDeleted: false,
          id: { not: landing.id },
        },
        select: { id: true },
      });
      if (multi) warnings.push('CITY_MULTI_CITY_INTENT_COLLISION');
    } else if (landing.landingType === 'MULTI_CITY') {
      const cityDup = await this.prisma.landingPage.findFirst({
        where: {
          slug: landing.slug,
          cityId: { not: null },
          landingType: 'CITY',
          isDeleted: false,
          id: { not: landing.id },
        },
        select: { id: true },
      });
      if (cityDup) warnings.push('CITY_MULTI_CITY_INTENT_COLLISION');
    }

    if (matchedEventsCount !== undefined) {
      if (matchedEventsCount === 0) issues.push('NO_MATCHED_EVENTS');
      else if (matchedEventsCount < 3) warnings.push('LOW_EVENT_COUNT');
    }

    const score = Math.max(0, 100 - issues.length * 15 - warnings.length * 5);

    return { issues, warnings, score };
  }
}
