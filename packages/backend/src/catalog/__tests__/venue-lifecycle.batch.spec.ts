/**
 * approveBatch / rejectBatch: per-item результаты без реальной БД.
 */
import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../prisma/prisma.service';
import { PublishGateService } from '../publish-gate.service';
import { VenueImportService } from '../venue-import.service';
import { VenueLifecycleService, VENUE_BATCH_ACTION_MAX } from '../venue-lifecycle.service';

function makeService(prisma: Partial<PrismaService>) {
  return new VenueLifecycleService(
    prisma as PrismaService,
    {} as PublishGateService,
    {} as VenueImportService,
  );
}

const draftRow = {
  id: 'd1',
  title: 'Площадка',
  rawName: null as string | null,
  address: 'Ул. 1',
  rawAddress: null as string | null,
  slug: 'slug-d1',
  lifecycleStatus: 'DRAFT' as const,
};

describe('VenueLifecycleService.approveBatch', () => {
  it('returns success when approveDraft succeeds', async () => {
    const findMany = vi.fn().mockResolvedValue([draftRow]);
    const s = makeService({ venue: { findMany } as PrismaService['venue'] });
    vi.spyOn(s, 'approveDraft').mockResolvedValue({});

    const r = await s.approveBatch(['d1']);
    expect(r.total).toBe(1);
    expect(r.successCount).toBe(1);
    expect(r.failureCount).toBe(0);
    expect(r.results[0]).toMatchObject({ id: 'd1', success: true });
    expect(s.approveDraft).toHaveBeenCalledWith(
      'd1',
      expect.objectContaining({ title: 'Площадка', isPublished: false }),
      expect.any(Object),
    );
  });

  it('dedupes duplicate ids', async () => {
    const findMany = vi.fn().mockResolvedValue([draftRow]);
    const s = makeService({ venue: { findMany } as PrismaService['venue'] });
    vi.spyOn(s, 'approveDraft').mockResolvedValue({});

    const r = await s.approveBatch(['d1', 'd1']);
    expect(r.total).toBe(1);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['d1'] } } }),
    );
  });

  it('marks missing id as VENUE_NOT_FOUND', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const s = makeService({ venue: { findMany } as PrismaService['venue'] });
    vi.spyOn(s, 'approveDraft').mockResolvedValue({});

    const r = await s.approveBatch(['ghost']);
    expect(r.failureCount).toBe(1);
    expect(r.results[0]).toMatchObject({ id: 'ghost', success: false, code: 'VENUE_NOT_FOUND' });
    expect(s.approveDraft).not.toHaveBeenCalled();
  });

  it('marks non-DRAFT as VENUE_APPROVE_NOT_DRAFT', async () => {
    const findMany = vi.fn().mockResolvedValue([{ ...draftRow, lifecycleStatus: 'ACTIVE' as const }]);
    const s = makeService({ venue: { findMany } as PrismaService['venue'] });
    vi.spyOn(s, 'approveDraft').mockResolvedValue({});

    const r = await s.approveBatch(['d1']);
    expect(r.results[0]?.code).toBe('VENUE_APPROVE_NOT_DRAFT');
    expect(s.approveDraft).not.toHaveBeenCalled();
  });

  it('throws VENUE_BATCH_LIMIT_EXCEEDED', async () => {
    const s = makeService({ venue: { findMany: vi.fn() } as PrismaService['venue'] });
    const ids = Array.from({ length: VENUE_BATCH_ACTION_MAX + 1 }, (_, i) => `id-${i}`);
    await expect(s.approveBatch(ids)).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'VENUE_BATCH_LIMIT_EXCEEDED' }),
    });
  });

  it('throws on empty ids', async () => {
    const s = makeService({ venue: { findMany: vi.fn() } as PrismaService['venue'] });
    await expect(s.approveBatch([])).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('VenueLifecycleService.rejectBatch', () => {
  it('calls rejectVenue for DRAFT', async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: 'd1', lifecycleStatus: 'DRAFT' as const }]);
    const s = makeService({ venue: { findMany } as PrismaService['venue'] });
    vi.spyOn(s, 'rejectVenue').mockResolvedValue({});

    const r = await s.rejectBatch(['d1']);
    expect(r.successCount).toBe(1);
    expect(s.rejectVenue).toHaveBeenCalledWith('d1', expect.any(Object));
  });

  it('marks REJECTED as VENUE_ALREADY_REJECTED', async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: 'd1', lifecycleStatus: 'REJECTED' as const }]);
    const s = makeService({ venue: { findMany } as PrismaService['venue'] });
    vi.spyOn(s, 'rejectVenue').mockResolvedValue({});

    const r = await s.rejectBatch(['d1']);
    expect(r.results[0]?.code).toBe('VENUE_ALREADY_REJECTED');
    expect(s.rejectVenue).not.toHaveBeenCalled();
  });

  it('accepts optional reason without breaking', async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: 'd1', lifecycleStatus: 'DRAFT' as const }]);
    const s = makeService({ venue: { findMany } as PrismaService['venue'] });
    vi.spyOn(s, 'rejectVenue').mockResolvedValue({});

    const r = await s.rejectBatch(['d1'], { reasonText: 'spam' });
    expect(r.successCount).toBe(1);
  });
});
