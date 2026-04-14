import { Injectable } from '@nestjs/common';
import { EventTagAssignmentSource } from '@/prisma-client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EventTagLifecycleService {
  constructor(private readonly prisma: PrismaService) {}

  async getSuppressedTagSlugs(eventId: string): Promise<Set<string>> {
    const override = await this.prisma.eventOverride.findUnique({
      where: { eventId },
      select: { tagsRemove: true },
    });
    return new Set((override?.tagsRemove ?? []).map((s) => s.trim()).filter(Boolean));
  }

  async filterSuppressedSlugs(eventId: string, slugs: Iterable<string>): Promise<string[]> {
    const suppressed = await this.getSuppressedTagSlugs(eventId);
    return [...new Set([...slugs].map((s) => s.trim()).filter(Boolean))].filter((slug) => !suppressed.has(slug));
  }

  async removeSuppressedAutoAssignments(eventId: string): Promise<void> {
    const suppressed = await this.getSuppressedTagSlugs(eventId);
    if (!suppressed.size) return;

    await this.prisma.eventTag.deleteMany({
      where: {
        eventId,
        assignmentSource: { in: [EventTagAssignmentSource.AUTO_RULE, EventTagAssignmentSource.IMPORT_MAPPED] },
        tag: { slug: { in: [...suppressed] } },
      },
    });
  }

  async upsertWithSource(params: {
    eventId: string;
    tagId: string;
    source: EventTagAssignmentSource;
    assignedBy?: string | null;
  }): Promise<boolean> {
    const { eventId, tagId, source, assignedBy = null } = params;
    const existing = await this.prisma.eventTag.findUnique({
      where: { eventId_tagId: { eventId, tagId } },
      select: { assignmentSource: true },
    });

    // Инвариант import lifecycle: ручная разметка не перетирается sync/auto.
    if (existing?.assignmentSource === EventTagAssignmentSource.MANUAL_ADMIN && source !== EventTagAssignmentSource.MANUAL_ADMIN) {
      return false;
    }

    if (existing) {
      await this.prisma.eventTag.update({
        where: { eventId_tagId: { eventId, tagId } },
        data: {
          assignmentSource: source,
          assignedBy: source === EventTagAssignmentSource.MANUAL_ADMIN ? assignedBy : null,
        },
      });
      return true;
    }

    await this.prisma.eventTag.create({
      data: {
        eventId,
        tagId,
        assignmentSource: source,
        assignedBy: source === EventTagAssignmentSource.MANUAL_ADMIN ? assignedBy : null,
      },
    });
    return true;
  }
}
