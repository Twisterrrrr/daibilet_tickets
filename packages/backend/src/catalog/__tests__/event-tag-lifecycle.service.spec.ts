import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EventTagLifecycleService } from '../event-tag-lifecycle.service';

const prismaMock = {
  eventOverride: {
    findUnique: vi.fn(),
  },
  eventTag: {
    deleteMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
};

describe('EventTagLifecycleService', () => {
  let service: EventTagLifecycleService;

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.eventOverride.findUnique.mockResolvedValue(null);
    prismaMock.eventTag.findUnique.mockResolvedValue(null);
    service = new EventTagLifecycleService(prismaMock as never);
  });

  it('не должен перетирать MANUAL_ADMIN в sync потоке', async () => {
    prismaMock.eventTag.findUnique.mockResolvedValueOnce({ assignmentSource: 'MANUAL_ADMIN' });

    const applied = await service.upsertWithSource({
      eventId: 'e1',
      tagId: 't1',
      source: 'IMPORT_MAPPED',
    });

    expect(applied).toBe(false);
    expect(prismaMock.eventTag.update).not.toHaveBeenCalled();
    expect(prismaMock.eventTag.create).not.toHaveBeenCalled();
  });

  it('должен записывать MANUAL_ADMIN c assignedBy', async () => {
    await service.upsertWithSource({
      eventId: 'e1',
      tagId: 't1',
      source: 'MANUAL_ADMIN',
      assignedBy: 'admin-1',
    });

    expect(prismaMock.eventTag.create).toHaveBeenCalledWith({
      data: {
        eventId: 'e1',
        tagId: 't1',
        assignmentSource: 'MANUAL_ADMIN',
        assignedBy: 'admin-1',
      },
    });
  });

  it('должен убирать suppressed auto/import теги', async () => {
    prismaMock.eventOverride.findUnique.mockResolvedValueOnce({
      tagsRemove: ['water', 'best-value'],
    });

    await service.removeSuppressedAutoAssignments('event-1');

    expect(prismaMock.eventTag.deleteMany).toHaveBeenCalledWith({
      where: {
        eventId: 'event-1',
        assignmentSource: { in: ['AUTO_RULE', 'IMPORT_MAPPED'] },
        tag: { slug: { in: ['water', 'best-value'] } },
      },
    });
  });
});
