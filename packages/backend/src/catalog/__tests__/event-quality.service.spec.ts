import { DateMode, EventCategory, EventAudience, EventSubcategory } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../prisma/prisma.service';
import { EventQualityService } from '../event-quality.service';

function baseEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'e1',
    title: 'Test event',
    cityId: 'c1',
    category: EventCategory.EXCURSION,
    audience: EventAudience.ALL,
    minAge: 0,
    description: 'x'.repeat(200),
    imageUrl: 'https://example.com/img.jpg',
    venueId: 'v1',
    address: null,
    dateMode: DateMode.SCHEDULED,
    endDate: null,
    subcategories: [] as EventSubcategory[],
    offers: [
      { id: 'o1', isDeleted: false, status: 'ACTIVE', priceFrom: 1000, meetingPoint: null },
    ],
    sessions: [{ id: 's1', isActive: true, startsAt: new Date(Date.now() + 86400000) }],
    subcategoryLinks: [{ subcategoryId: 'sc1' }],
    override: null,
    venue: { id: 'v1', title: 'Venue' },
    city: { id: 'c1', slug: 'saint-petersburg', name: 'СПб' },
    ...overrides,
  };
}

describe('EventQualityService.validateForPublish', () => {
  let prisma: { event: { findUnique: ReturnType<typeof vi.fn> } };
  let service: EventQualityService;

  beforeEach(() => {
    prisma = { event: { findUnique: vi.fn() } };
    service = new EventQualityService(prisma as unknown as PrismaService);
  });

  it('passes without tags when category, one subcategory link, location, offers and sessions are valid', async () => {
    prisma.event.findUnique.mockResolvedValue(baseEvent());
    const r = await service.validateForPublish('e1');
    expect(r.isReady).toBe(true);
    expect(r.issues).toHaveLength(0);
  });

  it('adds MISSING_SUBCATEGORY when no links and empty legacy enum', async () => {
    prisma.event.findUnique.mockResolvedValue(baseEvent({ subcategoryLinks: [], subcategories: [] }));
    const r = await service.validateForPublish('e1');
    expect(r.isReady).toBe(false);
    expect(r.issues.some((i) => i.code === 'MISSING_SUBCATEGORY')).toBe(true);
  });

  it('uses legacy enum when subcategoryLinks empty', async () => {
    prisma.event.findUnique.mockResolvedValue(
      baseEvent({ subcategoryLinks: [], subcategories: [EventSubcategory.RIVER] }),
    );
    const r = await service.validateForPublish('e1');
    expect(r.isReady).toBe(true);
  });

  it('adds TOO_MANY_SUBCATEGORIES when more than 3 active links', async () => {
    prisma.event.findUnique.mockResolvedValue(
      baseEvent({
        subcategoryLinks: [
          { subcategoryId: 'a' },
          { subcategoryId: 'b' },
          { subcategoryId: 'c' },
          { subcategoryId: 'd' },
        ],
      }),
    );
    const r = await service.validateForPublish('e1');
    expect(r.isReady).toBe(false);
    expect(r.issues.some((i) => i.code === 'TOO_MANY_SUBCATEGORIES')).toBe(true);
  });

  it('adds TOO_MANY_SUBCATEGORIES when legacy enum has more than 3 values and no links', async () => {
    prisma.event.findUnique.mockResolvedValue(
      baseEvent({
        subcategoryLinks: [],
        subcategories: [
          EventSubcategory.RIVER,
          EventSubcategory.WALKING,
          EventSubcategory.BUS,
          EventSubcategory.MUSEUM_CLASSIC,
        ],
      }),
    );
    const r = await service.validateForPublish('e1');
    expect(r.isReady).toBe(false);
    expect(r.issues.some((i) => i.code === 'TOO_MANY_SUBCATEGORIES')).toBe(true);
  });
});
