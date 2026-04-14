import { BadRequestException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  Prisma,
  VenueImportSource,
  VenueLifecycleStatus,
  VenueModerationAction,
  VenueModerationReasonCode,
  VenueSourceType,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { PublishGateService } from './publish-gate.service';
import {
  mergePreviewAddressSimilarity01,
  mergePreviewTitleSimilarity01,
  similarity01ToLabel,
} from './venue-merge-preview.util';
import { computeVenueSimilarity } from './venue-match.utils';
import { VenueImportService } from './venue-import.service';
import {
  buildApproveDraftInputForPreview,
  classifyApprovePreviewRow,
  type BatchVenueApprovePreviewItemStatus,
  type BatchVenueApproveSlugStatus,
} from './venue-batch-approve-preview.util';
import { computeVenueDecisionHint, type VenueDecisionHintValue } from './venue-decision-hint.util';
import { computeVenueHintSignalFlags } from './venue-moderation-hint-outcome.util';

export type ApproveDraftVenueInput = {
  title: string;
  address?: string | null;
  slug?: string | null;
  isPublished?: boolean;
};

export type SimilarDraftsOpts = {
  includeActive?: boolean;
  limit?: number;
};

/** Элемент списка похожих площадок (admin similar-drafts / batch). */
export type VenueSimilarDraftItem = {
  id: string;
  title: string;
  slug: string | null;
  lifecycleStatus: VenueLifecycleStatus;
  sourceType: VenueSourceType;
  importSource: VenueImportSource | null;
  externalVenueId: string | null;
  address: string | null;
  normalizedName: string | null;
  normalizedAddress: string | null;
  confidenceScore: number | null;
  similarityScore: number;
  similarityReasons: string[];
  activeEventsCount: number;
  hasPublicVenuePage: boolean;
};

/** Результат batch approve/reject для админки. */
export type BatchVenueActionItemResult = {
  id: string;
  success: boolean;
  code?: string;
  message?: string;
};

export type BatchVenueActionResultDto = {
  total: number;
  successCount: number;
  failureCount: number;
  results: BatchVenueActionItemResult[];
};

/** Максимум id в одном batch-запросе (approve/reject). */
export const VENUE_BATCH_ACTION_MAX = 50;

/** Ответ GET /admin/venues/:id/merge-preview — предпросмотр перед merge. */
export type VenueMergePreviewDto = {
  candidate: {
    id: string;
    displayTitle: string;
    displayAddress: string | null;
    city: { id: string; name: string; slug: string } | null;
    sourceType: VenueSourceType;
    importSource: VenueImportSource | null;
    confidenceScore: number | null;
    needsReview: boolean;
    lifecycleStatus: VenueLifecycleStatus;
    /** ISO — для optimistic lock при merge */
    updatedAt: string;
  };
  target: {
    id: string;
    displayTitle: string;
    displayAddress: string | null;
    city: { id: string; name: string; slug: string } | null;
    sourceType: VenueSourceType;
    importSource: VenueImportSource | null;
    isPublished: boolean;
    isActive: boolean;
    lifecycleStatus: VenueLifecycleStatus;
    stats: {
      eventsCount: number;
      activeEventsCount?: number;
    };
    /** ISO — для optimistic lock при merge */
    updatedAt: string;
  };
  comparison: {
    sameCity: boolean;
    titleSimilarityLabel: 'HIGH' | 'MEDIUM' | 'LOW';
    addressSimilarityLabel: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
    warnings: string[];
  };
  decisionHint: VenueDecisionHintValue;
  decisionHintReasons: string[];
};

export type BatchVenueApprovePreviewItemDto = {
  venueId: string;
  title: string;
  proposedTitle: string;
  proposedSlug: string;
  currentUpdatedAt: string;
  status: BatchVenueApprovePreviewItemStatus;
  slugStatus: BatchVenueApproveSlugStatus;
  warningCodes: string[];
  errorCode: string | null;
};

export type BatchVenueApprovePreviewResultDto = {
  items: BatchVenueApprovePreviewItemDto[];
  summary: { total: number; ok: number; warnings: number; errors: number };
};

function assertVenueNotStale(updatedAt: Date, expectedUpdatedAt?: string | null): void {
  if (expectedUpdatedAt == null || String(expectedUpdatedAt).trim() === '') return;
  const exp = new Date(String(expectedUpdatedAt));
  if (Number.isNaN(exp.getTime())) return;
  if (exp.getTime() !== updatedAt.getTime()) {
    throw new BadRequestException({
      code: 'VENUE_STALE_STATE',
      message: 'Данные площадки изменились. Обновите список и повторите действие.',
    });
  }
}

type SimilarityBaseFields = {
  normalizedName: string | null;
  normalizedAddress: string | null;
  rawName: string | null;
  rawAddress: string | null;
};

type VenueRowForSimilarity = {
  id: string;
  title: string;
  slug: string | null;
  lifecycleStatus: VenueLifecycleStatus;
  sourceType: VenueSourceType;
  importSource: VenueImportSource | null;
  externalVenueId: string | null;
  address: string | null;
  normalizedName: string | null;
  normalizedAddress: string | null;
  rawName: string | null;
  rawAddress: string | null;
  confidenceScore: unknown;
  isPublished: boolean;
  _count: { events: number };
};

/**
 * Модерация площадок: merge, approve, reject, публикация страницы, похожие кандидаты.
 */
@Injectable()
export class VenueLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publishGate: PublishGateService,
    private readonly venueImport: VenueImportService,
  ) {}

  private async recordModerationDecision(args: {
    venueId: string;
    action: VenueModerationAction;
    actorAdminId?: string | null;
    reasonCode?: VenueModerationReasonCode | null;
    reasonText?: string | null;
    metadata?: Prisma.InputJsonValue;
  }): Promise<void> {
    await this.prisma.venueModerationDecision.create({
      data: {
        venueId: args.venueId,
        action: args.action,
        reasonCode: args.reasonCode ?? undefined,
        reasonText: args.reasonText ?? undefined,
        actorAdminId: args.actorAdminId ?? undefined,
        metadata: args.metadata === undefined ? undefined : args.metadata,
      },
    });
  }

  private async recordModerationSignal(args: {
    venueId: string;
    action: VenueModerationAction;
    decisionHint?: VenueDecisionHintValue | null;
    confidenceScore?: number | null;
    needsReview?: boolean | null;
    duplicatesCount?: number | null;
    titleSimilarity?: number | null;
    addressSimilarity?: number | null;
    sameCity?: boolean | null;
    importSource?: VenueImportSource | null;
    targetVenueId?: string | null;
  }): Promise<void> {
    const flags = computeVenueHintSignalFlags(args.decisionHint ?? null, args.action);
    await this.prisma.venueModerationSignal.create({
      data: {
        venueId: args.venueId,
        action: args.action,
        decisionHint: args.decisionHint ?? undefined,
        wasHintAccepted: flags.wasHintAccepted,
        wasHintOverridden: flags.wasHintOverridden,
        confidenceScore: args.confidenceScore ?? undefined,
        needsReview: args.needsReview ?? undefined,
        duplicatesCount: args.duplicatesCount ?? undefined,
        titleSimilarity: args.titleSimilarity ?? undefined,
        addressSimilarity: args.addressSimilarity ?? undefined,
        sameCity: args.sameCity ?? undefined,
        importSource: args.importSource ?? undefined,
        targetVenueId: args.targetVenueId ?? undefined,
      },
    });
  }

  /**
   * Публичная страница / whitelist — только для ACTIVE (DRAFT/MERGED/REJECTED инварианты).
   */
  assertCanSetPublished(lifecycleStatus: VenueLifecycleStatus, nextPublished: boolean): void {
    if (!nextPublished) return;
    if (lifecycleStatus !== 'ACTIVE') {
      throw new BadRequestException({
        code: 'VENUE_PUBLISH_NOT_ALLOWED',
        message: 'Публикация страницы площадки возможна только при lifecycleStatus=ACTIVE',
      });
    }
  }

  assertCanSetVenuePageWhitelist(lifecycleStatus: VenueLifecycleStatus): void {
    if (lifecycleStatus === 'MERGED' || lifecycleStatus === 'REJECTED') {
      throw new BadRequestException({
        code: 'VENUE_WHITELIST_NOT_ALLOWED',
        message: 'Whitelist недоступен для MERGED/REJECTED',
      });
    }
    if (lifecycleStatus === 'DRAFT') {
      throw new BadRequestException({
        code: 'VENUE_WHITELIST_NOT_ALLOWED',
        message: 'Whitelist недоступен для DRAFT — сначала approve',
      });
    }
  }

  async mergeInto(
    sourceId: string,
    targetId: string,
    ctx?: {
      actorAdminId?: string | null;
      expectedSourceUpdatedAt?: string | null;
      expectedTargetUpdatedAt?: string | null;
      /** Доп. поля в JSON metadata решения (напр. Stage 5 авто-модерация). */
      moderationDecisionExtra?: Prisma.InputJsonValue;
    },
  ): Promise<{ success: true }> {
    if (sourceId === targetId) {
      throw new BadRequestException({ code: 'VENUE_MERGE_SELF', message: 'Источник и цель совпадают' });
    }

    const canonicalTargetId = await this.venueImport.resolveCanonicalVenueId(targetId);

    const [src, dstFinal] = await Promise.all([
      this.prisma.venue.findUnique({ where: { id: sourceId } }),
      this.prisma.venue.findUnique({ where: { id: canonicalTargetId } }),
    ]);

    if (!src || !dstFinal) throw new NotFoundException('Venue not found');
    if (src.lifecycleStatus === 'MERGED') {
      throw new BadRequestException({
        code: 'VENUE_MERGE_SOURCE_MERGED',
        message: 'Исходная площадка уже MERGED',
      });
    }
    if (src.lifecycleStatus === 'REJECTED') {
      throw new BadRequestException({
        code: 'VENUE_MERGE_SOURCE_REJECTED',
        message: 'Нельзя merge из REJECTED',
      });
    }
    if (canonicalTargetId === sourceId) {
      throw new BadRequestException({
        code: 'VENUE_MERGE_TARGET_INVALID',
        message: 'Некорректная цель merge (self-resolve)',
      });
    }
    if (dstFinal.lifecycleStatus !== 'ACTIVE') {
      throw new BadRequestException({
        code: 'VENUE_MERGE_TARGET_NOT_ACTIVE',
        message: 'Целевая площадка должна быть ACTIVE (сначала резолвится финальный канон)',
      });
    }

    // Защита от цикла: по цепочке mergeTarget от target не должны прийти к source
    let cursor = canonicalTargetId;
    for (let i = 0; i < 24; i += 1) {
      if (cursor === sourceId) {
        throw new BadRequestException({ code: 'VENUE_MERGE_CYCLE', message: 'Обнаружен цикл merge' });
      }
      const nextRow = await this.prisma.venue.findUnique({
        where: { id: cursor },
        select: { mergeTargetId: true, lifecycleStatus: true },
      });
      if (!nextRow || nextRow.lifecycleStatus !== 'MERGED' || !nextRow.mergeTargetId) break;
      cursor = nextRow.mergeTargetId;
    }

    assertVenueNotStale(src.updatedAt, ctx?.expectedSourceUpdatedAt);
    assertVenueNotStale(dstFinal.updatedAt, ctx?.expectedTargetUpdatedAt);

    const preview = src.lifecycleStatus === 'DRAFT' ? await this.getMergePreview(sourceId, targetId) : null;
    const titleSim01 = preview
      ? mergePreviewTitleSimilarity01(preview.candidate.displayTitle, preview.target.displayTitle)
      : mergePreviewTitleSimilarity01(src.title, dstFinal.title);
    const candAddr = preview
      ? preview.candidate.displayAddress
      : src.address?.trim() || src.rawAddress?.trim() || null;
    const tgtAddr = preview
      ? preview.target.displayAddress
      : dstFinal.address?.trim() || dstFinal.rawAddress?.trim() || null;
    const addrSim01 = mergePreviewAddressSimilarity01(candAddr, tgtAddr);

    await this.prisma.$transaction(async (tx) => {
      await tx.event.updateMany({ where: { venueId: sourceId }, data: { venueId: canonicalTargetId } });
      await tx.eventOffer.updateMany({ where: { venueId: sourceId }, data: { venueId: canonicalTargetId } });

      const srcLinks = await tx.venueSubcategoryLink.findMany({ where: { venueId: sourceId } });
      for (const l of srcLinks) {
        await tx.venueSubcategoryLink.upsert({
          where: {
            venueId_subcategoryId: { venueId: canonicalTargetId, subcategoryId: l.subcategoryId },
          },
          create: { venueId: canonicalTargetId, subcategoryId: l.subcategoryId },
          update: {},
        });
      }
      await tx.venueSubcategoryLink.deleteMany({ where: { venueId: sourceId } });

      const reviews = await tx.review.findMany({ where: { venueId: sourceId } });
      for (const r of reviews) {
        const dup = await tx.review.findFirst({
          where: {
            venueId: canonicalTargetId,
            authorEmail: r.authorEmail,
            eventId: r.eventId,
          },
        });
        if (dup) {
          await tx.review.delete({ where: { id: r.id } });
        } else {
          await tx.review.update({ where: { id: r.id }, data: { venueId: canonicalTargetId } });
        }
      }

      const promoLinks = await tx.promoBlockVenue.findMany({ where: { venueId: sourceId } });
      for (const pl of promoLinks) {
        const exists = await tx.promoBlockVenue.findFirst({
          where: { promoBlockId: pl.promoBlockId, venueId: canonicalTargetId },
        });
        if (exists) {
          await tx.promoBlockVenue.delete({ where: { id: pl.id } });
        } else {
          await tx.promoBlockVenue.update({ where: { id: pl.id }, data: { venueId: canonicalTargetId } });
        }
      }

      const pci = await tx.promoCollectionItem.findMany({ where: { venueId: sourceId } });
      for (const row of pci) {
        const dup = await tx.promoCollectionItem.findFirst({
          where: {
            collectionId: row.collectionId,
            venueId: canonicalTargetId,
            itemType: row.itemType,
          },
        });
        if (dup) {
          await tx.promoCollectionItem.delete({ where: { id: row.id } });
        } else {
          await tx.promoCollectionItem.update({ where: { id: row.id }, data: { venueId: canonicalTargetId } });
        }
      }

      await tx.venue.update({
        where: { id: sourceId },
        data: {
          lifecycleStatus: 'MERGED',
          mergeTargetId: canonicalTargetId,
          isPublished: false,
          isActive: false,
          isVenuePageWhitelisted: false,
          version: { increment: 1 },
        },
      });
    });

    const mergeMeta: Prisma.InputJsonValue = {
      candidateId: src.id,
      targetId: canonicalTargetId,
      candidateTitle: preview ? preview.candidate.displayTitle : src.title,
      targetTitle: preview ? preview.target.displayTitle : dstFinal.title,
      candidateUpdatedAt: src.updatedAt.toISOString(),
      targetUpdatedAt: dstFinal.updatedAt.toISOString(),
      candidateLifecycleStatusBefore: src.lifecycleStatus,
      candidateLifecycleStatusAfter: 'MERGED',
      confidenceScore: preview ? preview.candidate.confidenceScore : src.confidenceScore,
      titleSimilarity: titleSim01,
      addressSimilarity: addrSim01,
      sameCity: preview ? preview.comparison.sameCity : src.cityId === dstFinal.cityId,
      needsReview: preview ? preview.candidate.needsReview : src.needsReview,
      previewWarnings: preview ? preview.comparison.warnings : [],
      ...(ctx?.moderationDecisionExtra !== undefined && ctx.moderationDecisionExtra !== null
        ? (ctx.moderationDecisionExtra as Record<string, unknown>)
        : {}),
    };

    await this.recordModerationDecision({
      venueId: sourceId,
      action: 'MERGE',
      actorAdminId: ctx?.actorAdminId,
      metadata: mergeMeta,
    });

    await this.recordModerationSignal({
      venueId: sourceId,
      action: 'MERGE',
      decisionHint: preview?.decisionHint ?? undefined,
      confidenceScore: preview ? preview.candidate.confidenceScore : src.confidenceScore,
      needsReview: preview ? preview.candidate.needsReview : src.needsReview,
      duplicatesCount: preview && preview.comparison.sameCity ? 1 : 0,
      titleSimilarity: titleSim01,
      addressSimilarity: addrSim01 ?? undefined,
      sameCity: preview ? preview.comparison.sameCity : src.cityId === dstFinal.cityId,
      importSource: src.importSource,
      targetVenueId: canonicalTargetId,
    });

    return { success: true };
  }

  async approveDraft(
    venueId: string,
    input: ApproveDraftVenueInput,
    ctx?: {
      actorAdminId?: string | null;
      expectedUpdatedAt?: string | null;
      moderationDecisionExtra?: Prisma.InputJsonValue;
    },
  ): Promise<unknown> {
    const v = await this.prisma.venue.findUnique({ where: { id: venueId } });
    if (!v) throw new NotFoundException('Venue not found');
    if (v.lifecycleStatus !== 'DRAFT') {
      throw new BadRequestException({ code: 'VENUE_APPROVE_NOT_DRAFT', message: 'Только DRAFT можно approve' });
    }

    assertVenueNotStale(v.updatedAt, ctx?.expectedUpdatedAt);

    const similar = await this.findSimilarDrafts(venueId, { limit: 10 });
    const dupItems = similar.items;
    const dupCount = dupItems.length;
    const top = dupItems[0];
    const t01 = top ? mergePreviewTitleSimilarity01(v.title, top.title) : null;
    const dispAddr = (addr: string | null, raw: string | null) => addr?.trim() || raw?.trim() || null;
    const a01 = top
      ? mergePreviewAddressSimilarity01(dispAddr(v.address, v.rawAddress), top.address)
      : null;
    const confRaw = v.confidenceScore;
    const conf =
      confRaw === null || confRaw === undefined ? null : typeof confRaw === 'number' ? confRaw : Number(confRaw);
    const hint = computeVenueDecisionHint({
      lifecycleStatus: v.lifecycleStatus,
      isDeleted: v.isDeleted,
      displayTitle: v.title,
      confidenceScore: conf !== null && Number.isFinite(conf) ? conf : null,
      needsReview: v.needsReview,
      duplicatesCount: dupCount,
      sameCityWithBestDuplicate: dupCount > 0,
      bestDuplicateTitleSimilarity01: t01,
      bestDuplicateAddressSimilarity01: a01,
      hasCity: Boolean(v.cityId),
      hasAddress: Boolean(dispAddr(v.address, v.rawAddress)),
    });

    const title = input.title.trim();
    if (!title) throw new BadRequestException('title обязателен');

    const nn = VenueImportService.normalizeText(title);
    if (!nn) throw new BadRequestException('normalizedName не может быть пустым');

    const address = input.address?.trim() || null;
    const na = address ? VenueImportService.normalizeText(address) : null;

    const slug = (input.slug?.trim() || v.slug).trim();
    const slugTaken = await this.prisma.venue.findFirst({
      where: { slug, id: { not: venueId } },
      select: { id: true },
    });
    if (slugTaken) {
      throw new BadRequestException({
        code: 'VENUE_SLUG_TAKEN',
        message: `Slug "${slug}" занят`,
      });
    }

    const wantsPublish = input.isPublished === true;

    await this.prisma.venue.update({
      where: { id: venueId },
      data: {
        title,
        slug,
        address,
        normalizedName: nn,
        normalizedAddress: na,
        lifecycleStatus: 'ACTIVE',
        mergeTargetId: null,
        sourceType: v.sourceType,
        isPublished: wantsPublish,
        needsReview: false,
        version: { increment: 1 },
      },
    });

    if (wantsPublish) {
      await this.assertVenuePagePublishAllowed(venueId);
      const gate = await this.publishGate.validateVenueForPublish(venueId);
      if (gate.result === 'BLOCKING') {
        await this.prisma.venue.update({
          where: { id: venueId },
          data: { isPublished: false, version: { increment: 1 } },
        });
        const msg = gate.checks
          .filter((c) => c.status === 'BLOCKING')
          .map((c) => c.message)
          .join('; ');
        throw new BadRequestException(msg || 'Площадка не проходит проверки публикации');
      }
    }

    const decisionMeta: Prisma.InputJsonValue = {
      candidateLifecycleStatusBefore: 'DRAFT',
      candidateLifecycleStatusAfter: 'ACTIVE',
      candidateTitle: v.title,
      candidateCityId: v.cityId,
      candidateConfidenceScore: v.confidenceScore,
      candidateNeedsReview: v.needsReview,
      approvedTitle: title,
      approvedSlug: slug,
      ...(ctx?.moderationDecisionExtra !== undefined && ctx.moderationDecisionExtra !== null
        ? (ctx.moderationDecisionExtra as Record<string, unknown>)
        : {}),
    };

    await this.recordModerationDecision({
      venueId,
      action: 'APPROVE',
      actorAdminId: ctx?.actorAdminId,
      metadata: decisionMeta,
    });

    await this.recordModerationSignal({
      venueId,
      action: 'APPROVE',
      decisionHint: hint.decisionHint,
      confidenceScore: conf !== null && Number.isFinite(conf) ? conf : null,
      needsReview: v.needsReview,
      duplicatesCount: dupCount,
      titleSimilarity: t01,
      addressSimilarity: a01 ?? undefined,
      sameCity: dupCount > 0,
      importSource: v.importSource ?? undefined,
    });

    return this.prisma.venue.findUnique({ where: { id: venueId } });
  }

  async rejectVenue(
    venueId: string,
    ctx?: {
      actorAdminId?: string | null;
      expectedUpdatedAt?: string | null;
      reasonCode?: VenueModerationReasonCode | null;
      reasonText?: string | null;
    },
  ): Promise<unknown> {
    const v = await this.prisma.venue.findUnique({ where: { id: venueId } });
    if (!v) throw new NotFoundException('Venue not found');
    if (v.lifecycleStatus === 'MERGED') throw new BadRequestException('MERGED нельзя отклонить');

    if (v.lifecycleStatus === 'DRAFT') {
      assertVenueNotStale(v.updatedAt, ctx?.expectedUpdatedAt);
    }

    const similar = await this.findSimilarDrafts(venueId, { limit: 10 });
    const dupCount = similar.items.length;
    const top = similar.items[0];
    const t01 = top ? mergePreviewTitleSimilarity01(v.title, top.title) : null;
    const dispAddr = (addr: string | null, raw: string | null) => addr?.trim() || raw?.trim() || null;
    const a01 = top
      ? mergePreviewAddressSimilarity01(dispAddr(v.address, v.rawAddress), top.address)
      : null;
    const confRaw = v.confidenceScore;
    const conf =
      confRaw === null || confRaw === undefined ? null : typeof confRaw === 'number' ? confRaw : Number(confRaw);
    const hint = computeVenueDecisionHint({
      lifecycleStatus: v.lifecycleStatus,
      isDeleted: v.isDeleted,
      displayTitle: v.title,
      confidenceScore: conf !== null && Number.isFinite(conf) ? conf : null,
      needsReview: v.needsReview,
      duplicatesCount: dupCount,
      sameCityWithBestDuplicate: dupCount > 0,
      bestDuplicateTitleSimilarity01: t01,
      bestDuplicateAddressSimilarity01: a01,
      hasCity: Boolean(v.cityId),
      hasAddress: Boolean(dispAddr(v.address, v.rawAddress)),
    });

    const updated = await this.prisma.venue.update({
      where: { id: venueId },
      data: {
        lifecycleStatus: 'REJECTED',
        isPublished: false,
        isActive: false,
        isVenuePageWhitelisted: false,
        version: { increment: 1 },
      },
    });

    if (updated.lifecycleStatus === 'REJECTED') {
      const rejectMeta: Prisma.InputJsonValue = {
        candidateLifecycleStatusBefore: v.lifecycleStatus,
        candidateLifecycleStatusAfter: 'REJECTED',
        candidateTitle: v.title,
        candidateCityId: v.cityId,
        candidateConfidenceScore: v.confidenceScore,
        candidateNeedsReview: v.needsReview,
        rejectReasonSource: ctx?.reasonCode ? 'USER_SELECTED' : 'UNSPECIFIED',
      };

      await this.recordModerationDecision({
        venueId,
        action: 'REJECT',
        actorAdminId: ctx?.actorAdminId,
        reasonCode: ctx?.reasonCode ?? undefined,
        reasonText: ctx?.reasonText ?? undefined,
        metadata: rejectMeta,
      });

      await this.recordModerationSignal({
        venueId,
        action: 'REJECT',
        decisionHint: hint.decisionHint,
        confidenceScore: conf !== null && Number.isFinite(conf) ? conf : null,
        needsReview: v.needsReview,
        duplicatesCount: dupCount,
        titleSimilarity: t01,
        addressSimilarity: a01 ?? undefined,
        sameCity: dupCount > 0,
        importSource: v.importSource,
      });
    }

    return updated;
  }

  private normalizeBatchIds(ids: string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of ids) {
      if (raw === null || raw === undefined) continue;
      const id = String(raw).trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
    return out;
  }

  private batchItemError(e: unknown): { code?: string; message: string } {
    if (e instanceof HttpException) {
      const r = e.getResponse();
      if (typeof r === 'object' && r !== null) {
        const o = r as Record<string, unknown>;
        const msgRaw = o.message;
        const msg = Array.isArray(msgRaw) ? msgRaw.join('; ') : String(msgRaw ?? '');
        const code = typeof o.code === 'string' ? o.code : undefined;
        if (e instanceof NotFoundException) {
          return { code: code ?? 'VENUE_NOT_FOUND', message: msg || 'Не найдено' };
        }
        return { code, message: msg || 'Ошибка' };
      }
      return { message: String(r) };
    }
    if (e instanceof Error) {
      return { message: e.message };
    }
    return { message: String(e) };
  }

  /** Поля для batch approve из текущей строки импортного DRAFT (без диалога). */
  private buildApproveDraftInputForBatch(v: {
    title: string;
    rawName: string | null;
    address: string | null;
    rawAddress: string | null;
    slug: string | null;
  }): ApproveDraftVenueInput {
    const title = v.title?.trim() || v.rawName?.trim() || '';
    if (!title) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Нет названия для подтверждения черновика',
      });
    }
    const address = v.address?.trim() || v.rawAddress?.trim() || null;
    return {
      title,
      address,
      slug: v.slug?.trim() || undefined,
      isPublished: false,
    };
  }

  /**
   * Soft-check перед batch approve: slug collisions и сводка (без транзакционной гарантии).
   */
  async approveBatchPreview(rawIds: string[]): Promise<BatchVenueApprovePreviewResultDto> {
    const ids = this.normalizeBatchIds(rawIds);
    if (ids.length === 0) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Укажите непустой список ids' });
    }
    if (ids.length > VENUE_BATCH_ACTION_MAX) {
      throw new BadRequestException({
        code: 'VENUE_BATCH_APPROVE_PREVIEW_LIMIT_EXCEEDED',
        message: `Не более ${VENUE_BATCH_ACTION_MAX} записей за запрос`,
      });
    }

    const rows = await this.prisma.venue.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        title: true,
        rawName: true,
        address: true,
        rawAddress: true,
        slug: true,
        lifecycleStatus: true,
        updatedAt: true,
      },
    });
    const byId = new Map(rows.map((r) => [r.id, r]));

    const items: BatchVenueApprovePreviewItemDto[] = [];
    for (const id of ids) {
      const v = byId.get(id);
      if (!v) {
        items.push({
          venueId: id,
          title: '',
          proposedTitle: '',
          proposedSlug: '',
          currentUpdatedAt: new Date(0).toISOString(),
          status: 'ERROR',
          slugStatus: 'UNKNOWN',
          warningCodes: [],
          errorCode: 'VENUE_APPROVE_PREVIEW_NOT_FOUND',
        });
        continue;
      }

      let proposedTitle = '';
      let proposedSlug = '';
      try {
        const input = buildApproveDraftInputForPreview(v);
        proposedTitle = input.title;
        proposedSlug = (input.slug?.trim() || v.slug || '').trim();
      } catch {
        items.push({
          venueId: id,
          title: v.title,
          proposedTitle: '',
          proposedSlug: '',
          currentUpdatedAt: v.updatedAt.toISOString(),
          status: 'ERROR',
          slugStatus: 'UNKNOWN',
          warningCodes: [],
          errorCode: 'VALIDATION_ERROR',
        });
        continue;
      }

      const slugTaken = proposedSlug
        ? await this.prisma.venue.findFirst({
            where: { slug: proposedSlug, id: { not: id } },
            select: { id: true, lifecycleStatus: true },
          })
        : null;

      const { status, slugStatus, warningCodes, errorCode } = classifyApprovePreviewRow({
        exists: true,
        lifecycleStatus: v.lifecycleStatus,
        slugTaken,
        proposedSlug,
      });

      items.push({
        venueId: id,
        title: v.title,
        proposedTitle,
        proposedSlug,
        currentUpdatedAt: v.updatedAt.toISOString(),
        status,
        slugStatus,
        warningCodes,
        errorCode,
      });
    }

    const ok = items.filter((i) => i.status === 'OK').length;
    const warnings = items.filter((i) => i.status === 'WARNING').length;
    const errors = items.filter((i) => i.status === 'ERROR').length;

    return {
      items,
      summary: { total: items.length, ok, warnings, errors },
    };
  }

  /**
   * Пакетное подтверждение DRAFT: переиспользует approveDraft по одному id.
   * Частичный успех: 200 + per-item results.
   */
  async approveBatch(
    rawIds: string[],
    opts?: { items?: Array<{ id: string; expectedUpdatedAt?: string }>; actorAdminId?: string | null },
  ): Promise<BatchVenueActionResultDto> {
    const ids = this.normalizeBatchIds(rawIds);
    if (ids.length === 0) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Укажите непустой список ids' });
    }
    if (ids.length > VENUE_BATCH_ACTION_MAX) {
      throw new BadRequestException({
        code: 'VENUE_BATCH_LIMIT_EXCEEDED',
        message: `Не более ${VENUE_BATCH_ACTION_MAX} записей за запрос`,
      });
    }

    const rows = await this.prisma.venue.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        title: true,
        rawName: true,
        address: true,
        rawAddress: true,
        slug: true,
        lifecycleStatus: true,
      },
    });
    const byId = new Map(rows.map((r) => [r.id, r]));

    const results: BatchVenueActionItemResult[] = [];
    for (const id of ids) {
      const v = byId.get(id);
      if (!v) {
        results.push({
          id,
          success: false,
          code: 'VENUE_NOT_FOUND',
          message: 'Площадка не найдена',
        });
        continue;
      }
      if (v.lifecycleStatus === 'MERGED') {
        results.push({
          id,
          success: false,
          code: 'VENUE_ALREADY_MERGED',
          message: 'Площадка уже объединена',
        });
        continue;
      }
      if (v.lifecycleStatus !== 'DRAFT') {
        results.push({
          id,
          success: false,
          code: 'VENUE_APPROVE_NOT_DRAFT',
          message: 'Только DRAFT можно подтвердить',
        });
        continue;
      }
      try {
        const input = this.buildApproveDraftInputForBatch(v);
        const exp = opts?.items?.find((x) => x.id === id)?.expectedUpdatedAt;
        await this.approveDraft(id, input, {
          actorAdminId: opts?.actorAdminId,
          expectedUpdatedAt: exp,
        });
        results.push({ id, success: true });
      } catch (e) {
        const { code, message } = this.batchItemError(e);
        results.push({ id, success: false, code, message });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    return {
      total: results.length,
      successCount,
      failureCount: results.length - successCount,
      results,
    };
  }

  /**
   * Пакетный reject: переиспользует rejectVenue по одному id.
   */
  async rejectBatch(
    rawIds: string[],
    opts?: {
      reasonCode?: VenueModerationReasonCode | null;
      reasonText?: string | null;
      items?: Array<{ id: string; expectedUpdatedAt?: string }>;
      actorAdminId?: string | null;
    },
  ): Promise<BatchVenueActionResultDto> {
    const ids = this.normalizeBatchIds(rawIds);
    if (ids.length === 0) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Укажите непустой список ids' });
    }
    if (ids.length > VENUE_BATCH_ACTION_MAX) {
      throw new BadRequestException({
        code: 'VENUE_BATCH_LIMIT_EXCEEDED',
        message: `Не более ${VENUE_BATCH_ACTION_MAX} записей за запрос`,
      });
    }

    const rows = await this.prisma.venue.findMany({
      where: { id: { in: ids } },
      select: { id: true, lifecycleStatus: true },
    });
    const byId = new Map(rows.map((r) => [r.id, r]));

    const results: BatchVenueActionItemResult[] = [];
    for (const id of ids) {
      const v = byId.get(id);
      if (!v) {
        results.push({
          id,
          success: false,
          code: 'VENUE_NOT_FOUND',
          message: 'Площадка не найдена',
        });
        continue;
      }
      if (v.lifecycleStatus === 'MERGED') {
        results.push({
          id,
          success: false,
          code: 'VENUE_ALREADY_MERGED',
          message: 'Площадка уже объединена',
        });
        continue;
      }
      if (v.lifecycleStatus === 'REJECTED') {
        results.push({
          id,
          success: false,
          code: 'VENUE_ALREADY_REJECTED',
          message: 'Уже отклонена',
        });
        continue;
      }
      if (v.lifecycleStatus !== 'DRAFT') {
        results.push({
          id,
          success: false,
          code: 'VENUE_REJECT_NOT_DRAFT',
          message: 'Отклонить можно только DRAFT',
        });
        continue;
      }
      try {
        const exp = opts?.items?.find((x) => x.id === id)?.expectedUpdatedAt;
        await this.rejectVenue(id, {
          actorAdminId: opts?.actorAdminId,
          expectedUpdatedAt: exp,
          reasonCode: opts?.reasonCode ?? null,
          reasonText: opts?.reasonText ?? null,
        });
        results.push({ id, success: true });
      } catch (e) {
        const { code, message } = this.batchItemError(e);
        results.push({ id, success: false, code, message });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    return {
      total: results.length,
      successCount,
      failureCount: results.length - successCount,
      results,
    };
  }

  /**
   * Подсказки для строк списка импортных DRAFT (batch similar-drafts).
   */
  async decisionHintsForImportedDrafts(
    rows: Array<{
      id: string;
      title: string;
      cityId: string;
      isDeleted: boolean;
      lifecycleStatus: VenueLifecycleStatus;
      confidenceScore: unknown;
      needsReview: boolean;
      address: string | null;
      rawAddress: string | null;
    }>,
  ): Promise<Record<string, { decisionHint: VenueDecisionHintValue; decisionHintReasons: string[] }>> {
    const ids = rows.map((r) => r.id);
    if (ids.length === 0) return {};
    const similar = await this.findSimilarDraftsBatch(ids, { limit: 10 });
    const out: Record<string, { decisionHint: VenueDecisionHintValue; decisionHintReasons: string[] }> = {};

    for (const v of rows) {
      const dupItems = similar[v.id] ?? [];
      const dupCount = dupItems.length;
      const top = dupItems[0];
      const t01 = top ? mergePreviewTitleSimilarity01(v.title, top.title) : null;
      const dispAddr = (addr: string | null, raw: string | null) => addr?.trim() || raw?.trim() || null;
      const a01 = top
        ? mergePreviewAddressSimilarity01(dispAddr(v.address, v.rawAddress), top.address)
        : null;
      const confRaw = v.confidenceScore;
      const conf =
        confRaw === null || confRaw === undefined ? null : typeof confRaw === 'number' ? confRaw : Number(confRaw);
      const hint = computeVenueDecisionHint({
        lifecycleStatus: v.lifecycleStatus,
        isDeleted: v.isDeleted,
        displayTitle: v.title,
        confidenceScore: conf !== null && Number.isFinite(conf) ? conf : null,
        needsReview: v.needsReview,
        duplicatesCount: dupCount,
        sameCityWithBestDuplicate: dupCount > 0,
        bestDuplicateTitleSimilarity01: t01,
        bestDuplicateAddressSimilarity01: a01,
        hasCity: Boolean(v.cityId),
        hasAddress: Boolean(dispAddr(v.address, v.rawAddress)),
      });
      out[v.id] = { decisionHint: hint.decisionHint, decisionHintReasons: hint.decisionHintReasons };
    }

    return out;
  }

  async setVenuePagePublished(venueId: string, published: boolean): Promise<unknown> {
    const v = await this.prisma.venue.findUnique({ where: { id: venueId } });
    if (!v) throw new NotFoundException('Venue not found');
    if (v.lifecycleStatus !== 'ACTIVE') throw new BadRequestException('Страница доступна только для ACTIVE');

    if (published) {
      await this.assertVenuePagePublishAllowed(venueId);
      const gate = await this.publishGate.validateVenueForPublish(venueId);
      if (gate.result === 'BLOCKING') {
        const msg = gate.checks
          .filter((c) => c.status === 'BLOCKING')
          .map((c) => c.message)
          .join('; ');
        throw new BadRequestException(msg || 'Площадка не проходит проверки публикации');
      }
    }

    return this.prisma.venue.update({
      where: { id: venueId },
      data: { isPublished: published, version: { increment: 1 } },
    });
  }

  private rankSimilarItems(
    base: SimilarityBaseFields,
    candidates: VenueRowForSimilarity[],
    limit: number,
  ): VenueSimilarDraftItem[] {
    return candidates
      .map((c) => {
        const sim = computeVenueSimilarity(base, {
          normalizedName: c.normalizedName,
          normalizedAddress: c.normalizedAddress,
          rawName: c.rawName,
          rawAddress: c.rawAddress,
        });
        const conf = c.confidenceScore;
        const confNum =
          conf === null || conf === undefined ? null : typeof conf === 'number' ? conf : Number(conf);
        return {
          id: c.id,
          title: c.title,
          slug: c.slug,
          lifecycleStatus: c.lifecycleStatus,
          sourceType: c.sourceType,
          importSource: c.importSource,
          externalVenueId: c.externalVenueId,
          address: c.address,
          normalizedName: c.normalizedName,
          normalizedAddress: c.normalizedAddress,
          confidenceScore: confNum !== null && Number.isFinite(confNum) ? confNum : null,
          similarityScore: sim.score,
          similarityReasons: sim.reasons,
          activeEventsCount: c._count.events,
          hasPublicVenuePage: c.lifecycleStatus === 'ACTIVE' && c.isPublished,
        };
      })
      .filter((x) => x.similarityScore > 0)
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit);
  }

  async findSimilarDrafts(venueId: string, opts?: SimilarDraftsOpts) {
    const includeActive = opts?.includeActive !== false;
    const limit = Math.min(Math.max(opts?.limit ?? 10, 1), 25);

    const v = await this.prisma.venue.findUnique({
      where: { id: venueId },
      select: {
        id: true,
        title: true,
        lifecycleStatus: true,
        cityId: true,
        normalizedName: true,
        normalizedAddress: true,
        rawName: true,
        rawAddress: true,
      },
    });
    if (!v) throw new NotFoundException('Venue not found');

    const candidates = await this.prisma.venue.findMany({
      where: {
        id: { not: venueId },
        cityId: v.cityId,
        isDeleted: false,
        lifecycleStatus: includeActive ? { in: ['DRAFT', 'ACTIVE'] } : 'DRAFT',
      },
      select: {
        id: true,
        title: true,
        slug: true,
        lifecycleStatus: true,
        sourceType: true,
        importSource: true,
        externalVenueId: true,
        address: true,
        normalizedName: true,
        normalizedAddress: true,
        rawName: true,
        rawAddress: true,
        confidenceScore: true,
        isPublished: true,
        _count: {
          select: {
            events: { where: { isActive: true, isDeleted: false } },
          },
        },
      },
      take: 100,
      orderBy: { updatedAt: 'desc' },
    });

    const base: SimilarityBaseFields = {
      normalizedName: v.normalizedName,
      normalizedAddress: v.normalizedAddress,
      rawName: v.rawName,
      rawAddress: v.rawAddress,
    };

    const items = this.rankSimilarItems(base, candidates, limit);

    return {
      venue: {
        id: v.id,
        title: v.title,
        lifecycleStatus: v.lifecycleStatus,
        cityId: v.cityId,
        normalizedName: v.normalizedName,
        normalizedAddress: v.normalizedAddress,
      },
      items,
    };
  }

  /**
   * Пакетный поиск похожих площадок: один проход пула кандидатов на город (без N+1 HTTP).
   * Ключи ответа — id запрошенных площадок (в т.ч. пустой массив, если не найдено).
   */
  async findSimilarDraftsBatch(
    venueIds: string[],
    opts?: SimilarDraftsOpts,
  ): Promise<Record<string, VenueSimilarDraftItem[]>> {
    const includeActive = opts?.includeActive !== false;
    const limit = Math.min(Math.max(opts?.limit ?? 10, 1), 25);
    const unique = [...new Set(venueIds.filter(Boolean))].slice(0, 50);
    const result: Record<string, VenueSimilarDraftItem[]> = {};
    for (const id of unique) result[id] = [];
    if (unique.length === 0) return result;

    const bases = await this.prisma.venue.findMany({
      where: { id: { in: unique }, isDeleted: false },
      select: {
        id: true,
        cityId: true,
        normalizedName: true,
        normalizedAddress: true,
        rawName: true,
        rawAddress: true,
        title: true,
        lifecycleStatus: true,
      },
    });
    const foundIds = new Set(bases.map((b) => b.id));
    for (const id of unique) {
      if (!foundIds.has(id)) result[id] = [];
    }

    const byCity = new Map<string, typeof bases>();
    for (const b of bases) {
      const arr = byCity.get(b.cityId) ?? [];
      arr.push(b);
      byCity.set(b.cityId, arr);
    }

    const poolSelect = {
      id: true,
      title: true,
      slug: true,
      lifecycleStatus: true,
      sourceType: true,
      importSource: true,
      externalVenueId: true,
      address: true,
      normalizedName: true,
      normalizedAddress: true,
      rawName: true,
      rawAddress: true,
      confidenceScore: true,
      isPublished: true,
      _count: {
        select: {
          events: { where: { isActive: true, isDeleted: false } },
        },
      },
    } as const;

    for (const [cityId, group] of byCity) {
      const pool = await this.prisma.venue.findMany({
        where: {
          cityId,
          isDeleted: false,
          lifecycleStatus: includeActive ? { in: ['DRAFT', 'ACTIVE'] } : 'DRAFT',
        },
        select: poolSelect,
        take: 500,
        orderBy: { updatedAt: 'desc' },
      });

      for (const base of group) {
        const baseSig: SimilarityBaseFields = {
          normalizedName: base.normalizedName,
          normalizedAddress: base.normalizedAddress,
          rawName: base.rawName,
          rawAddress: base.rawAddress,
        };
        const others = pool.filter((c) => c.id !== base.id);
        result[base.id] = this.rankSimilarItems(baseSig, others as VenueRowForSimilarity[], limit);
      }
    }

    return result;
  }

  /**
   * Предпросмотр merge: кандидат (DRAFT) и каноническая цель (ACTIVE).
   * GET /admin/venues/:candidateId/merge-preview?targetId=
   */
  async getMergePreview(candidateId: string, targetId: string): Promise<VenueMergePreviewDto> {
    if (candidateId === targetId) {
      throw new BadRequestException({
        code: 'VENUE_MERGE_SELF_TARGET',
        message: 'Источник и цель совпадают',
      });
    }

    const src = await this.prisma.venue.findUnique({
      where: { id: candidateId },
      include: {
        city: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!src) {
      throw new NotFoundException({ code: 'VENUE_NOT_FOUND', message: 'Площадка-кандидат не найдена' });
    }
    if (src.isDeleted) {
      throw new BadRequestException({
        code: 'VENUE_MERGE_PREVIEW_INVALID_SOURCE',
        message: 'Кандидат недоступен для объединения',
      });
    }

    const canonicalTargetId = await this.venueImport.resolveCanonicalVenueId(targetId);

    if (candidateId === canonicalTargetId) {
      throw new BadRequestException({
        code: 'VENUE_MERGE_SELF_TARGET',
        message: 'Источник и цель совпадают',
      });
    }

    const dst = await this.prisma.venue.findUnique({
      where: { id: canonicalTargetId },
      include: {
        city: { select: { id: true, name: true, slug: true } },
        _count: {
          select: {
            events: { where: { isActive: true, isDeleted: false } },
          },
        },
      },
    });
    if (!dst) {
      throw new NotFoundException({ code: 'MERGE_TARGET_NOT_FOUND', message: 'Целевая площадка не найдена' });
    }
    if (dst.isDeleted) {
      throw new BadRequestException({
        code: 'VENUE_MERGE_PREVIEW_TARGET_INVALID',
        message: 'Целевая площадка недоступна',
      });
    }

    if (src.lifecycleStatus !== 'DRAFT') {
      throw new BadRequestException({
        code: 'VENUE_MERGE_PREVIEW_CANDIDATE_NOT_DRAFT',
        message: 'Предпросмотр доступен только для площадки в статусе DRAFT',
      });
    }
    if (dst.lifecycleStatus !== 'ACTIVE') {
      throw new BadRequestException({
        code: 'VENUE_MERGE_PREVIEW_TARGET_INVALID',
        message: 'Целевая площадка должна быть ACTIVE',
      });
    }

    let cursor = canonicalTargetId;
    for (let i = 0; i < 24; i += 1) {
      if (cursor === candidateId) {
        throw new BadRequestException({
          code: 'VENUE_MERGE_PREVIEW_TARGET_INVALID',
          message: 'Некорректная цель merge',
        });
      }
      const nextRow = await this.prisma.venue.findUnique({
        where: { id: cursor },
        select: { mergeTargetId: true, lifecycleStatus: true },
      });
      if (!nextRow || nextRow.lifecycleStatus !== 'MERGED' || !nextRow.mergeTargetId) break;
      cursor = nextRow.mergeTargetId;
    }

    const displayAddr = (v: {
      address: string | null;
      rawAddress: string | null;
      normalizedAddress: string | null;
    }): string | null => {
      const trim = (s: string | null | undefined) => {
        if (s == null) return null;
        const x = s.trim();
        return x.length > 0 ? x : null;
      };
      return trim(v.address) ?? trim(v.rawAddress) ?? trim(v.normalizedAddress);
    };

    const candAddrStr = displayAddr(src);
    const tgtAddrStr = displayAddr(dst);

    const titleSim = mergePreviewTitleSimilarity01(src.title, dst.title);
    const titleLabel = similarity01ToLabel(titleSim);

    const addrScore = mergePreviewAddressSimilarity01(candAddrStr, tgtAddrStr);
    const addressLabel: VenueMergePreviewDto['comparison']['addressSimilarityLabel'] =
      addrScore === null ? 'NONE' : similarity01ToLabel(addrScore);

    const sameCity = Boolean(src.cityId && dst.cityId && src.cityId === dst.cityId);

    const warnings: string[] = [];
    if (!sameCity) {
      warnings.push('Города не совпадают');
    }
    if (addrScore !== null && similarity01ToLabel(addrScore) === 'LOW') {
      warnings.push('Адреса заметно отличаются');
    }
    if (src.confidenceScore === null || src.confidenceScore === undefined) {
      warnings.push('У кандидата нет оценки уверенности (confidenceScore)');
    }
    if (dst.isPublished && dst._count.events > 0) {
      warnings.push('Целевая площадка опубликована и имеет связанные активные события');
    }
    if (titleLabel === 'LOW') {
      warnings.push('Названия заметно отличаются');
    }

    const rawConf = src.confidenceScore;
    const confNum =
      rawConf === null || rawConf === undefined
        ? null
        : typeof rawConf === 'number'
          ? rawConf
          : Number(rawConf);
    const confidenceScore = confNum !== null && Number.isFinite(confNum) ? confNum : null;

    const hint = computeVenueDecisionHint({
      lifecycleStatus: src.lifecycleStatus,
      isDeleted: src.isDeleted,
      displayTitle: src.title,
      confidenceScore,
      needsReview: src.needsReview,
      duplicatesCount: sameCity ? 1 : 0,
      sameCityWithBestDuplicate: sameCity,
      bestDuplicateTitleSimilarity01: titleSim,
      bestDuplicateAddressSimilarity01: addrScore,
      hasCity: Boolean(src.cityId),
      hasAddress: Boolean(candAddrStr),
    });

    return {
      candidate: {
        id: src.id,
        displayTitle: src.title,
        displayAddress: candAddrStr,
        city: src.city ? { id: src.city.id, name: src.city.name, slug: src.city.slug } : null,
        sourceType: src.sourceType,
        importSource: src.importSource,
        confidenceScore,
        needsReview: src.needsReview,
        lifecycleStatus: src.lifecycleStatus,
        updatedAt: src.updatedAt.toISOString(),
      },
      target: {
        id: dst.id,
        displayTitle: dst.title,
        displayAddress: tgtAddrStr,
        city: dst.city ? { id: dst.city.id, name: dst.city.name, slug: dst.city.slug } : null,
        sourceType: dst.sourceType,
        importSource: dst.importSource,
        isPublished: dst.isPublished,
        isActive: dst.isActive,
        lifecycleStatus: dst.lifecycleStatus,
        stats: {
          eventsCount: dst._count.events,
          activeEventsCount: dst._count.events,
        },
        updatedAt: dst.updatedAt.toISOString(),
      },
      comparison: {
        sameCity,
        titleSimilarityLabel: titleLabel,
        addressSimilarityLabel: addressLabel,
        warnings,
      },
      decisionHint: hint.decisionHint,
      decisionHintReasons: hint.decisionHintReasons,
    };
  }

  private async assertVenuePagePublishAllowed(venueId: string): Promise<void> {
    const venueRow = await this.prisma.venue.findUnique({
      where: { id: venueId },
      select: {
        title: true,
        address: true,
        isVenuePageWhitelisted: true,
        _count: {
          select: {
            events: {
              where: { isActive: true, isDeleted: false },
            },
          },
        },
      },
    });
    if (!venueRow) throw new NotFoundException('Venue not found');

    const activeEvents = venueRow._count.events;
    if (!venueRow.isVenuePageWhitelisted && activeEvents < 5) {
      throw new BadRequestException(
        `Публикация страницы: нужно ≥5 активных событий (сейчас ${activeEvents}) или флаг whitelist`,
      );
    }
    if (!venueRow.title?.trim() || !venueRow.address?.trim()) {
      throw new BadRequestException('Для страницы площадки нужны название и адрес');
    }
  }
}
