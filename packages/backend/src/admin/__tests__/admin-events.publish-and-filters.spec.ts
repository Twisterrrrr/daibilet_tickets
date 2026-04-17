import { describe, expect, it, vi } from 'vitest';

import { AdminEventsController } from '../admin-events.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheInvalidationService } from '../../cache/cache-invalidation.service';
import { FuzzyDedupService } from '../../catalog/fuzzy-dedup.service';
import { ReviewService } from '../../catalog/review.service';
import { ProviderRegistryService } from '../../integrations/routing/provider-registry.service';
import { ProviderRoutingService } from '../../integrations/routing/provider-routing.service';
import { EventOverrideService } from '../event-override.service';
import { EventAdminSummaryService } from '../event-admin-summary.service';
import { EventQualityService } from '../../catalog/event-quality.service';
import { PublishGateService } from '../../catalog/publish-gate.service';
import { AuditService } from '../audit.service';
import { EventTagRulesService } from '../event-tag-rules.service';
import { SubcategoryPolicyService } from '../../subcategories/subcategory-policy.service';
import { SubcategoryAssignmentService } from '../../subcategories/subcategory-assignment.service';
import { CatalogClassificationNormalizerService } from '../../catalog/catalog-classification-normalizer.service';

function createController(prisma: PrismaService, audit?: AuditService) {
  return new AdminEventsController(
    prisma,
    {} as EventOverrideService,
    {} as EventTagRulesService,
    {} as ReviewService,
    {} as FuzzyDedupService,
    {} as CacheInvalidationService,
    {} as EventQualityService,
    {} as PublishGateService,
    {} as EventAdminSummaryService,
    (audit ?? ({} as AuditService)),
    {} as SubcategoryPolicyService,
    {} as SubcategoryAssignmentService,
    {} as CatalogClassificationNormalizerService,
    {} as ProviderRegistryService,
    {} as ProviderRoutingService,
  );
}

describe('AdminEventsController.list (filters)', () => {
  it('missingImage=true: adds effective-image missing predicate', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(0);
    const prisma = { event: { findMany, count } } as unknown as PrismaService;
    const c = createController(prisma);

    await c.list(
      undefined, // city
      undefined, // category
      undefined, // source
      undefined, // active
      undefined, // hidden
      undefined, // search
      undefined, // isPast
      undefined, // isArchived
      undefined, // isIndexable
      undefined, // pastDays
      undefined, // section
      undefined, // subcategory
      undefined, // hasNoSubcategory
      undefined, // hasMultipleSubcategories
      undefined, // sortBy
      undefined, // sortDir
      undefined, // cursor
      '1', // page
      '20', // limit
      undefined, // operator
      undefined, // hasFutureSessions
      undefined, // hasCategoryPrices
      'true', // missingImage
      undefined, // hasOverride
      undefined, // issuesPreset
    );

    expect(findMany).toHaveBeenCalledTimes(1);
    const arg = findMany.mock.calls[0]![0] as { where: { AND?: unknown[] } };
    expect(Array.isArray(arg.where.AND)).toBe(true);
    expect(arg.where.AND).toEqual(
      expect.arrayContaining([
        { isDeleted: false },
        { OR: [{ source: 'MANUAL' }, { isActive: true }] },
        expect.objectContaining({
          OR: expect.arrayContaining([
            { source: 'MANUAL' },
            expect.objectContaining({ sessions: expect.any(Object) }),
          ]),
        }),
        {
          imageUrl: null,
          OR: [{ override: null }, { override: { imageUrl: null } }],
        },
      ]),
    );
  });

  it('hasOverride=true: adds NOT override=null', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(0);
    const prisma = { event: { findMany, count } } as unknown as PrismaService;
    const c = createController(prisma);

    await c.list(
      undefined, // city
      undefined, // category
      undefined, // source
      undefined, // active
      undefined, // hidden
      undefined, // search
      undefined, // isPast
      undefined, // isArchived
      undefined, // isIndexable
      undefined, // pastDays
      undefined, // section
      undefined, // subcategory
      undefined, // hasNoSubcategory
      undefined, // hasMultipleSubcategories
      undefined, // sortBy
      undefined, // sortDir
      undefined, // cursor
      '1', // page
      '20', // limit
      undefined, // operator
      undefined, // hasFutureSessions
      undefined, // hasCategoryPrices
      undefined, // missingImage
      'true', // hasOverride
      undefined, // issuesPreset
    );

    const arg = findMany.mock.calls[0]![0] as { where: { AND?: unknown[] } };
    expect(arg.where.AND).toEqual(expect.arrayContaining([{ NOT: { override: null } }]));
  });

  it('issuesPreset=api: adds OR block with gate-like blockers', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(0);
    const prisma = { event: { findMany, count } } as unknown as PrismaService;
    const c = createController(prisma);

    await c.list(
      undefined, // city
      undefined, // category
      undefined, // source
      undefined, // active
      undefined, // hidden
      undefined, // search
      undefined, // isPast
      undefined, // isArchived
      undefined, // isIndexable
      undefined, // pastDays
      undefined, // section
      undefined, // subcategory
      undefined, // hasNoSubcategory
      undefined, // hasMultipleSubcategories
      undefined, // sortBy
      undefined, // sortDir
      undefined, // cursor
      '1', // page
      '20', // limit
      undefined, // operator
      undefined, // hasFutureSessions
      undefined, // hasCategoryPrices
      undefined, // missingImage
      undefined, // hasOverride
      'api', // issuesPreset
    );

    const arg = findMany.mock.calls[0]![0] as { where: { AND?: unknown[] } };
    expect(arg.where.AND).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          OR: expect.arrayContaining([{ venueId: null }, { subcategoryLinks: { none: {} } }]),
        }),
      ]),
    );
  });
});

describe('AdminEventsController.unpublishEvent', () => {
  it('upserts override editorStatus=NEEDS_REVIEW + needsReviewAt', async () => {
    const findUnique = vi.fn().mockResolvedValue({ id: 'e1' });
    const upsert = vi.fn().mockResolvedValue({ eventId: 'e1' });
    const auditLog = vi.fn().mockResolvedValue(undefined);
    const prisma = {
      event: { findUnique },
      eventOverride: { upsert },
    } as unknown as PrismaService;
    const audit = { log: auditLog } as unknown as AuditService;
    const c = createController(prisma, audit);

    const res = await c.unpublishEvent('e1', { user: { id: 'admin1' } } as any);

    expect(res).toEqual({ ok: true });
    expect(upsert).toHaveBeenCalledTimes(1);
    const arg = upsert.mock.calls[0]![0] as any;
    expect(arg.where).toEqual({ eventId: 'e1' });
    expect(arg.create.editorStatus).toBe('NEEDS_REVIEW');
    expect(arg.update.editorStatus).toBe('NEEDS_REVIEW');
    expect(arg.update.needsReviewAt).toBeInstanceOf(Date);
    expect(auditLog).toHaveBeenCalledTimes(1);
  });
});

