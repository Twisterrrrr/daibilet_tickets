/**
 * getMergePreview: валидации и предупреждения без реальной БД.
 */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../prisma/prisma.service';
import { PublishGateService } from '../publish-gate.service';
import { VenueImportService } from '../venue-import.service';
import { VenueLifecycleService } from '../venue-lifecycle.service';

function svc(prisma: unknown, venueImport?: Partial<VenueImportService>) {
  return new VenueLifecycleService(
    prisma as PrismaService,
    {} as PublishGateService,
    { resolveCanonicalVenueId: async (id: string) => id, ...venueImport } as VenueImportService,
  );
}

const citySpb = { id: 'city-spb', name: 'СПб', slug: 'spb' };
const cityMsk = { id: 'city-msk', name: 'Мск', slug: 'msk' };

describe('VenueLifecycleService.getMergePreview', () => {
  it('throws VENUE_MERGE_SELF_TARGET when ids equal', async () => {
    const prisma = { venue: { findUnique: vi.fn() } };
    const s = svc(prisma);
    await expect(s.getMergePreview('a', 'a')).rejects.toMatchObject({ response: expect.objectContaining({ code: 'VENUE_MERGE_SELF_TARGET' }) });
  });

  it('throws VENUE_NOT_FOUND when candidate missing', async () => {
    const prisma = {
      venue: { findUnique: vi.fn().mockResolvedValue(null) },
    };
    const s = svc(prisma);
    await expect(s.getMergePreview('c', 't')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws MERGE_TARGET_NOT_FOUND when target missing', async () => {
    const candidate = {
      id: 'c',
      title: 'Cand',
      lifecycleStatus: 'DRAFT' as const,
      cityId: citySpb.id,
      isDeleted: false,
      sourceType: 'IMPORTED' as const,
      importSource: 'TEPLOHOD' as const,
      needsReview: false,
      confidenceScore: 0.9,
      address: 'А1',
      rawAddress: null,
      normalizedAddress: null,
      city: citySpb,
    };
    const prisma = {
      venue: {
        findUnique: vi.fn(async (args: { where: { id: string } }) => {
          if (args.where.id === 'c') return candidate;
          if (args.where.id === 'missing') return null;
          return null;
        }),
      },
    };
    const s = svc(prisma, { resolveCanonicalVenueId: async () => 'missing' });
    await expect(s.getMergePreview('c', 'x')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'MERGE_TARGET_NOT_FOUND' }),
    });
  });

  it('returns preview with warnings for different cities', async () => {
    const now = new Date('2026-04-14T00:00:00.000Z');
    const candidate = {
      id: 'c',
      title: 'Причал тест',
      lifecycleStatus: 'DRAFT' as const,
      cityId: citySpb.id,
      isDeleted: false,
      sourceType: 'IMPORTED' as const,
      importSource: 'TEPLOHOD' as const,
      needsReview: true,
      confidenceScore: null,
      address: 'Наб. 1',
      rawAddress: null,
      normalizedAddress: null,
      city: citySpb,
      updatedAt: now,
    };
    const target = {
      id: 't',
      title: 'Другой причал',
      lifecycleStatus: 'ACTIVE' as const,
      cityId: cityMsk.id,
      isDeleted: false,
      sourceType: 'MANUAL' as const,
      importSource: null,
      isPublished: true,
      isActive: true,
      address: 'Ул. 2',
      rawAddress: null,
      normalizedAddress: null,
      city: cityMsk,
      _count: { events: 3 },
      updatedAt: now,
    };
    const prisma = {
      venue: {
        findUnique: vi.fn(async (args: { where: { id: string }; include?: unknown }) => {
          if (args.where.id === 'c') return candidate;
          if (args.where.id === 't') return target;
          return { mergeTargetId: null, lifecycleStatus: 'ACTIVE' };
        }),
      },
    };
    const s = svc(prisma, { resolveCanonicalVenueId: async () => 't' });
    const p = await s.getMergePreview('c', 't');
    expect(p.comparison.sameCity).toBe(false);
    expect(p.comparison.warnings.some((w) => w.includes('Города'))).toBe(true);
    expect(p.comparison.warnings.some((w) => w.includes('confidenceScore'))).toBe(true);
    expect(p.candidate.confidenceScore).toBeNull();
    expect(p.comparison.addressSimilarityLabel).not.toBe('NONE');
  });

  it('addressSimilarityLabel NONE when one address empty', async () => {
    const now = new Date('2026-04-14T00:00:00.000Z');
    const candidate = {
      id: 'c',
      title: 'Same',
      lifecycleStatus: 'DRAFT' as const,
      cityId: citySpb.id,
      isDeleted: false,
      sourceType: 'IMPORTED' as const,
      importSource: 'TEPLOHOD' as const,
      needsReview: false,
      confidenceScore: 0.5,
      address: null,
      rawAddress: null,
      normalizedAddress: null,
      city: citySpb,
      updatedAt: now,
    };
    const target = {
      id: 't',
      title: 'Same',
      lifecycleStatus: 'ACTIVE' as const,
      cityId: citySpb.id,
      isDeleted: false,
      sourceType: 'MANUAL' as const,
      importSource: null,
      isPublished: false,
      isActive: true,
      address: 'Где-то 5',
      rawAddress: null,
      normalizedAddress: null,
      city: citySpb,
      _count: { events: 0 },
      updatedAt: now,
    };
    const prisma = {
      venue: {
        findUnique: vi.fn(async (args: { where: { id: string } }) => {
          if (args.where.id === 'c') return candidate;
          if (args.where.id === 't') return target;
          return { mergeTargetId: null, lifecycleStatus: 'ACTIVE' };
        }),
      },
    };
    const s = svc(prisma, { resolveCanonicalVenueId: async () => 't' });
    const p = await s.getMergePreview('c', 't');
    expect(p.comparison.addressSimilarityLabel).toBe('NONE');
  });

  it('throws VENUE_MERGE_PREVIEW_CANDIDATE_NOT_DRAFT', async () => {
    const row = {
      id: 'c',
      title: 'X',
      lifecycleStatus: 'ACTIVE' as const,
      cityId: citySpb.id,
      isDeleted: false,
      sourceType: 'MANUAL' as const,
      importSource: null,
      needsReview: false,
      confidenceScore: 1,
      address: 'a',
      rawAddress: null,
      normalizedAddress: null,
      city: citySpb,
    };
    const prisma = { venue: { findUnique: vi.fn().mockResolvedValue(row) } };
    const s = svc(prisma);
    await expect(s.getMergePreview('c', 't')).rejects.toBeInstanceOf(BadRequestException);
  });
});
