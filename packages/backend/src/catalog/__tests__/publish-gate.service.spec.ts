import { SubcategoryLayer, SubcategoryType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../prisma/prisma.service';
import { EventQualityService } from '../event-quality.service';
import { PublishGateService } from '../publish-gate.service';

describe('PublishGateService', () => {
  let quality: { validateForPublish: ReturnType<typeof vi.fn> };
  let prisma: { venue: { findUnique: ReturnType<typeof vi.fn> } };
  let gate: PublishGateService;

  beforeEach(() => {
    quality = { validateForPublish: vi.fn() };
    prisma = { venue: { findUnique: vi.fn() } };
    gate = new PublishGateService(
      quality as unknown as EventQualityService,
      prisma as unknown as PrismaService,
    );
  });

  it('marks SUBCATEGORY_PRIMARY_VALID as BLOCKING when MISSING_PRIMARY_SUBCATEGORY present', async () => {
    quality.validateForPublish.mockResolvedValue({
      isReady: false,
      issues: [{ code: 'MISSING_PRIMARY_SUBCATEGORY', message: 'm', field: 'subcategories' }],
    });
    const r = await gate.validateEventForPublish('e1');
    expect(r.result).toBe('BLOCKING');
    const sub = r.checks.find((c) => c.code === 'SUBCATEGORY_PRIMARY_VALID');
    expect(sub?.status).toBe('BLOCKING');
  });

  it('marks SUBCATEGORY_PRIMARY_VALID as OK when no blocking subcategory issues', async () => {
    quality.validateForPublish.mockResolvedValue({
      isReady: true,
      issues: [],
    });
    const r = await gate.validateEventForPublish('e1');
    expect(r.result).toBe('OK');
    const sub = r.checks.find((c) => c.code === 'SUBCATEGORY_PRIMARY_VALID');
    expect(sub?.status).toBe('OK');
  });

  it('marks SUBCATEGORY_SECONDARY_RECOMMENDED as WARNING when MISSING_SECONDARY_SUBCATEGORY', async () => {
    quality.validateForPublish.mockResolvedValue({
      isReady: false,
      issues: [{ code: 'MISSING_SECONDARY_SUBCATEGORY', message: 'm', field: 'subcategories' }],
    });
    const r = await gate.validateEventForPublish('e1');
    expect(r.result).toBe('WARNING');
    const w = r.checks.find((c) => c.code === 'SUBCATEGORY_SECONDARY_RECOMMENDED');
    expect(w?.status).toBe('WARNING');
  });

  it('venue: BLOCKING without primary', async () => {
    prisma.venue.findUnique.mockResolvedValue({
      id: 'v1',
      subcategoryLinks: [
        {
          subcategory: { layer: SubcategoryLayer.SECONDARY, type: SubcategoryType.UNIVERSAL },
        },
      ],
    });
    const r = await gate.validateVenueForPublish('v1');
    expect(r.result).toBe('BLOCKING');
  });

  it('venue: WARNING without secondary', async () => {
    prisma.venue.findUnique.mockResolvedValue({
      id: 'v1',
      subcategoryLinks: [
        {
          subcategory: { layer: SubcategoryLayer.PRIMARY, type: SubcategoryType.VENUE_ONLY },
        },
      ],
    });
    const r = await gate.validateVenueForPublish('v1');
    expect(r.result).toBe('WARNING');
  });
});
